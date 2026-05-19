import type { PrismaClient } from "@shipyard/db";
import {
  renderPaymentFailedEmail,
  renderSubscriptionCancelScheduledEmail,
  renderSubscriptionDowngradedEmail,
  renderSubscriptionReactivatedEmail,
  renderSubscriptionUpgradeEmail,
  sendEmail,
} from "@shipyard/email";
import { logger } from "@shipyard/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionObject {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string>;
  items?: {
    data: Array<{
      price: { id: string };
      current_period_start?: number;
      current_period_end?: number;
    }>;
  };
  cancel_at_period_end?: boolean;
}

// Stripe API 2025-01-27.acacia — subscription details live under `parent`
interface InvoiceObject {
  customer?: string | null;
  parent?: {
    subscription_details?: {
      subscription?: string | null;
      metadata?: Record<string, string> | null;
    } | null;
  } | null;
}

// ─── Main processor ───────────────────────────────────────────────────────────

/**
 * Process a single Stripe event by type.
 * Idempotent — can be safely called multiple times for the same event.
 *
 * @param eventType  Stripe event type string (e.g. "customer.subscription.updated")
 * @param eventData  The raw event.data object stored from Stripe
 * @param db         Prisma client
 */
export async function processStripeEvent(
  eventType: string,
  eventData: unknown,
  db: PrismaClient
): Promise<void> {
  const raw = eventData as {
    object?: unknown;
    previous_attributes?: Record<string, unknown>;
  };
  const data = raw.object ?? eventData;
  const prev = raw.previous_attributes ?? {};

  switch (eventType) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(
        data as SubscriptionObject,
        db,
        eventType,
        prev
      );
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(data as SubscriptionObject, db);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(data as InvoiceObject, db);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(data as InvoiceObject, db);
      break;

    default:
      // Unknown event — acknowledge without processing
      logger.info("Unhandled Stripe event type", { eventType });
      break;
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleSubscriptionUpsert(
  sub: SubscriptionObject,
  db: PrismaClient,
  eventType: string,
  prev: Record<string, unknown>
) {
  const orgId = sub.metadata?.orgId;
  if (!orgId) {
    throw new Error(
      `Missing orgId in subscription metadata for subscription ${sub.id}`
    );
  }

  const prevCancelAtPeriodEnd =
    "cancel_at_period_end" in prev
      ? Boolean(prev.cancel_at_period_end)
      : (sub.cancel_at_period_end ?? false);

  const status = mapStripeStatus(sub.status);
  // Only active/trialing subscriptions unlock PRO features
  const tier = status === "ACTIVE" || status === "TRIALING" ? "PRO" : "FREE";

  await db.organization.update({
    where: { id: orgId },
    data: {
      stripeCustomerId: sub.customer,
      subscriptionTier: tier,
    },
  });

  const item = sub.items?.data[0];
  const rawStart = item?.current_period_start;
  const rawEnd = item?.current_period_end;

  const periodStart = rawStart != null ? new Date(rawStart * 1000) : undefined;
  const periodEnd = rawEnd != null ? new Date(rawEnd * 1000) : undefined;

  await db.subscription.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      stripeSubscriptionId: sub.id,
      stripePriceId: sub.items?.data[0]?.price.id ?? "",
      status,
      currentPeriodStart: periodStart ?? new Date(),
      currentPeriodEnd: periodEnd ?? new Date(),
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    },
    update: {
      stripeSubscriptionId: sub.id,
      stripePriceId: sub.items?.data[0]?.price.id ?? "",
      status,
      // Only overwrite period dates when Stripe actually sends them —
      // prevents resetting currentPeriodEnd to now() when fields are absent.
      ...(periodStart && { currentPeriodStart: periodStart }),
      ...(periodEnd && { currentPeriodEnd: periodEnd }),
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    },
  });

  logger.info("Subscription upserted", { orgId, status, tier });

  // Send email — fire-and-forget, never block the webhook response on failure.
  void sendSubscriptionEmail({
    db,
    orgId,
    eventType,
    status,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    prevCancelAtPeriodEnd,
    periodEnd,
  }).catch((err) =>
    logger.warn("Failed to send subscription email", {
      orgId,
      error: String(err),
    })
  );
}

async function handleSubscriptionDeleted(
  sub: SubscriptionObject,
  db: PrismaClient
) {
  const orgId = sub.metadata?.orgId;
  if (!orgId) return;

  await db.organization.update({
    where: { id: orgId },
    data: { subscriptionTier: "FREE" },
  });

  await db.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: "CANCELED" },
  });

  logger.info("Subscription deleted — org downgraded to FREE", { orgId });

  void sendDowngradedEmail(db, orgId).catch((err) =>
    logger.warn("Failed to send downgrade email", {
      orgId,
      error: String(err),
    })
  );
}

async function handlePaymentFailed(inv: InvoiceObject, db: PrismaClient) {
  const subscriptionId = inv.parent?.subscription_details?.subscription ?? null;

  if (!subscriptionId) {
    logger.warn("invoice.payment_failed missing subscription ID", {
      invoiceId: (inv as Record<string, unknown>).id,
    });
    return;
  }

  // orgId is stamped into the subscription metadata — use it directly so we
  // can send the email even before `customer.subscription.created` has been
  // processed and written the subscription row to our DB.
  const orgId = inv.parent?.subscription_details?.metadata?.orgId ?? null;

  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "PAST_DUE" },
  });

  // Resolve orgId from DB when metadata is absent (older API replays).
  const resolvedOrgId =
    orgId ??
    (
      await db.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        select: { organizationId: true },
      })
    )?.organizationId;

  if (!resolvedOrgId) {
    logger.warn("Payment failed — could not resolve org", { subscriptionId });
    return;
  }

  await db.organization.update({
    where: { id: resolvedOrgId },
    data: { subscriptionTier: "FREE" },
  });
  logger.info("Payment failed — org downgraded to FREE", {
    orgId: resolvedOrgId,
  });

  void sendPaymentFailedEmail(db, resolvedOrgId).catch((err) =>
    logger.warn("Failed to send payment failed email", {
      orgId: resolvedOrgId,
      error: String(err),
    })
  );
}

async function handlePaymentSucceeded(inv: InvoiceObject, db: PrismaClient) {
  const subscriptionId = inv.parent?.subscription_details?.subscription ?? null;
  if (!subscriptionId) return;

  const record = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { organizationId: true },
  });
  if (record) {
    await db.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "ACTIVE" },
    });
    await db.organization.update({
      where: { id: record.organizationId },
      data: { subscriptionTier: "PRO" },
    });
    logger.info("Payment succeeded — org upgraded to PRO", {
      orgId: record.organizationId,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
type StripeStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "TRIALING"
  | "INCOMPLETE";

const STRIPE_STATUS_MAP: Record<string, StripeStatus> = {
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  trialing: "TRIALING",
  incomplete: "INCOMPLETE",
  incomplete_expired: "CANCELED",
  paused: "CANCELED",
};

function mapStripeStatus(status: string): StripeStatus {
  return STRIPE_STATUS_MAP[status] ?? "INCOMPLETE";
}

async function getOrgOwner(db: PrismaClient, orgId: string) {
  return db.member.findFirst({
    where: { organizationId: orgId, role: "OWNER" },
    select: {
      user: { select: { email: true, name: true } },
      organization: { select: { name: true, slug: true } },
    },
  });
}

function formatDate(date: Date | undefined): string {
  if (!date) return "your next billing date";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function sendSubscriptionEmail({
  db,
  orgId,
  eventType,
  status,
  cancelAtPeriodEnd,
  prevCancelAtPeriodEnd,
  periodEnd,
}: {
  db: PrismaClient;
  orgId: string;
  eventType: string;
  status: StripeStatus;
  cancelAtPeriodEnd: boolean;
  prevCancelAtPeriodEnd: boolean;
  periodEnd: Date | undefined;
}) {
  const owner = await getOrgOwner(db, orgId);
  if (!owner?.user.email) return;

  const { email, name } = owner.user;
  const ownerName = name ?? email;
  const { name: orgName, slug: orgSlug } = owner.organization;
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const billingUrl = `${baseUrl}/${orgSlug}/org-settings/billing`;
  const periodEndStr = formatDate(periodEnd);

  let html: string;
  let subject: string;
  let templateName: string;

  if (eventType === "customer.subscription.created") {
    if (status !== "ACTIVE" && status !== "TRIALING") return;
    templateName = "subscription-upgrade";
    subject = `You're now on Pro — ${orgName}`;
    html = await renderSubscriptionUpgradeEmail({
      ownerName,
      orgName,
      billingUrl,
      periodEnd: periodEndStr,
    });
  } else if (cancelAtPeriodEnd && !prevCancelAtPeriodEnd) {
    // cancel_at_period_end flipped true -> cancellation scheduled
    templateName = "subscription-cancel";
    subject = `Your ${orgName} Pro plan will end on ${periodEndStr}`;
    html = await renderSubscriptionCancelScheduledEmail({
      ownerName,
      orgName,
      cancelDate: periodEndStr,
      billingUrl,
    });
  } else if (!cancelAtPeriodEnd && prevCancelAtPeriodEnd) {
    // cancel_at_period_end flipped false -> reactivated
    templateName = "subscription-reactivated";
    subject = `Your ${orgName} Pro plan has been reactivated`;
    html = await renderSubscriptionReactivatedEmail({
      ownerName,
      orgName,
      periodEnd: periodEndStr,
      billingUrl,
    });
  } else {
    // No email needed for other updated events (e.g. renewal)
    return;
  }

  await sendEmail({
    to: email,
    subject,
    html,
    templateName,
    templateData: { orgId, orgName, eventType },
    db,
  });
}

async function sendDowngradedEmail(db: PrismaClient, orgId: string) {
  const owner = await getOrgOwner(db, orgId);
  if (!owner?.user.email) return;

  const { email, name } = owner.user;
  const ownerName = name ?? email;
  const { name: orgName, slug: orgSlug } = owner.organization;
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const billingUrl = `${baseUrl}/${orgSlug}/org-settings/billing`;

  const html = await renderSubscriptionDowngradedEmail({
    ownerName,
    orgName,
    billingUrl,
  });
  await sendEmail({
    to: email,
    subject: `Your ${orgName} workspace has moved to the Free plan`,
    html,
    templateName: "subscription-downgraded",
    templateData: {
      orgId,
      orgName,
      eventType: "customer.subscription.deleted",
    },
    db,
  });
}

async function sendPaymentFailedEmail(db: PrismaClient, orgId: string) {
  const owner = await getOrgOwner(db, orgId);
  if (!owner?.user.email) return;

  const { email, name } = owner.user;
  const ownerName = name ?? email;
  const { name: orgName, slug: orgSlug } = owner.organization;
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const billingUrl = `${baseUrl}/${orgSlug}/org-settings/billing`;

  const html = await renderPaymentFailedEmail({
    ownerName,
    orgName,
    billingUrl,
  });
  await sendEmail({
    to: email,
    subject: `Action required: payment failed for ${orgName}`,
    html,
    templateName: "payment-failed",
    templateData: { orgId, orgName },
    db,
  });
}
