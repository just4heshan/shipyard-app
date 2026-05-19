import { logger } from "@shipyard/logger";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { requireMembership, requireOwner } from "../../lib/membership";
import { getProPriceId, getStripe } from "../../lib/stripe";
import { protectedProcedure, router } from "../trpc";

export const subscriptionRouter = router({
  /**
   * Current subscription + tier for an org.
   * Any member can read — used by the billing page and upgrade dialog.
   */
  get: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.db, ctx.session.user.id, input.orgId);

      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        select: {
          subscriptionTier: true,
          stripeCustomerId: true,
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
              stripePriceId: true,
            },
          },
        },
      });

      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      // Fetch live price details from Stripe when we have a price ID,
      // so the UI always reflects the actual billing amount / interval.
      let priceDetails: {
        amount: number;
        currency: string;
        interval: string;
      } | null = null;

      if (org.subscription?.stripePriceId) {
        try {
          const stripe = getStripe();
          const price = await stripe.prices.retrieve(
            org.subscription.stripePriceId
          );

          priceDetails = {
            amount: price.unit_amount ?? 0,
            currency: price.currency,
            interval: String(price.recurring?.interval ?? "month"),
          };
        } catch (err) {
          logger.warn("Failed to fetch price details from Stripe", {
            orgId: input.orgId,
            priceId: org.subscription.stripePriceId,
            error: String(err),
          });
        }
      }

      return { ...org, priceDetails };
    }),

  /**
   * Returns the configured Pro plan price details from Stripe.
   * Used by the upgrade dialog to show real pricing before checkout.
   * Any member can call this.
   */
  getProPlanDetails: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.db, ctx.session.user.id, input.orgId);

      try {
        const stripe = getStripe();
        const price = await stripe.prices.retrieve(getProPriceId());
        return {
          amount: price.unit_amount ?? 0,
          currency: price.currency,
          interval: String(price.recurring?.interval ?? "month"),
        };
      } catch (err) {
        logger.warn("Failed to fetch Pro plan price details from Stripe", {
          orgId: input.orgId,
          error: String(err),
        });
        return null;
      }
    }),

  /**
   * Creates a Stripe Customer Portal session for managing payment methods for
   * an existing subscription.
   * OWNER only.
   */
  createPortalSession: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        returnUrl: z.url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );
      requireOwner(caller.role);

      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        select: { stripeCustomerId: true },
      });

      if (!org?.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Stripe billing account found for this organization.",
        });
      }

      const stripe = getStripe();
      const session = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: input.returnUrl,
      });

      logger.info("Stripe billing portal session created", {
        orgId: input.orgId,
        customerId: org.stripeCustomerId,
        userId: ctx.session.user.id,
      });

      return { url: session.url };
    }),

  /**
   * Step 1: Creates a Stripe SetupIntent so the frontend can collect card
   * details via Elements. The SetupIntent client_secret is returned synchronously.
   * OWNER only.
   */
  createSetupIntent: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );
      requireOwner(caller.role);

      if (ctx.db) {
        const existing = await ctx.db.subscription.findUnique({
          where: { organizationId: input.orgId },
          select: { status: true },
        });
        if (existing?.status === "ACTIVE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This organization already has an active Pro subscription.",
          });
        }
      }

      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        select: { stripeCustomerId: true },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      const stripe = getStripe();

      let customerId = org.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email ?? undefined,
          metadata: { orgId: input.orgId },
        });
        customerId = customer.id;
        await ctx.db.organization.update({
          where: { id: input.orgId },
          data: { stripeCustomerId: customerId },
        });
        logger.info("Stripe customer created", {
          orgId: input.orgId,
          customerId,
          userId: ctx.session.user.id,
        });
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: { orgId: input.orgId },
      });

      if (!setupIntent.client_secret) {
        logger.error("Stripe SetupIntent returned no client secret", {
          orgId: input.orgId,
          setupIntentId: setupIntent.id,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe did not return a setup intent client secret.",
        });
      }

      logger.info("Stripe SetupIntent created", {
        orgId: input.orgId,
        setupIntentId: setupIntent.id,
        userId: ctx.session.user.id,
      });

      return { clientSecret: String(setupIntent.client_secret) };
    }),

  /**
   * Step 2: After the client confirms the SetupIntent, retrieve the saved
   * payment method and create the actual subscription.
   * OWNER only.
   */
  activateSubscription: protectedProcedure
    .input(z.object({ orgId: z.string(), setupIntentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );
      requireOwner(caller.role);

      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        select: { stripeCustomerId: true },
      });
      if (!org?.stripeCustomerId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const stripe = getStripe();

      // Retrieve the SetupIntent to get the confirmed payment method.
      const setupIntent = await (
        stripe.setupIntents.retrieve as unknown as (
          id: string
        ) => Promise<{ payment_method: string | null; status: string }>
      )(input.setupIntentId);

      if (setupIntent.status !== "succeeded" || !setupIntent.payment_method) {
        logger.warn("SetupIntent not complete on activateSubscription", {
          orgId: input.orgId,
          setupIntentId: input.setupIntentId,
          status: setupIntent.status,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment method setup is not complete.",
        });
      }

      // Set as the customer's default payment method.
      await stripe.customers.update(org.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: setupIntent.payment_method,
        },
      });

      // Cancel any stale incomplete subscription before creating a new one.
      const existing = await ctx.db.subscription.findUnique({
        where: { organizationId: input.orgId },
        select: { stripeSubscriptionId: true, status: true },
      });
      if (existing?.status === "INCOMPLETE" && existing.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
          logger.info("Stale incomplete subscription cancelled", {
            orgId: input.orgId,
            stripeSubscriptionId: existing.stripeSubscriptionId,
          });
        } catch {
          // Already cancelled on Stripe side — ignore
        }
      }

      // Create the subscription
      const newSub = await stripe.subscriptions.create({
        customer: org.stripeCustomerId,
        items: [{ price: getProPriceId() }],
        default_payment_method: setupIntent.payment_method,
        metadata: { orgId: input.orgId },
      });

      // Write to DB immediately using data from the Stripe response so the
      // billing page reflects ACTIVE + correct tier before the webhook arrives.
      // Period dates may be absent on the create response in newer API versions
      // (the webhook will always have them) — only write them when present.
      const newSubItem = newSub.items.data[0];
      const periodStart = newSubItem
        ? new Date(newSubItem.current_period_start * 1000)
        : undefined;
      const periodEnd = newSubItem
        ? new Date(newSubItem.current_period_end * 1000)
        : undefined;

      await ctx.db.subscription.upsert({
        where: { organizationId: input.orgId },
        create: {
          organizationId: input.orgId,
          stripeSubscriptionId: newSub.id,
          stripePriceId: newSub.items.data[0]?.price.id ?? "",
          status: "ACTIVE",
          currentPeriodStart: periodStart ?? new Date(),
          currentPeriodEnd: periodEnd ?? new Date(),
          cancelAtPeriodEnd: newSub.cancel_at_period_end,
        },
        update: {
          stripeSubscriptionId: newSub.id,
          stripePriceId: newSub.items.data[0]?.price.id ?? "",
          status: "ACTIVE",
          ...(periodStart && { currentPeriodStart: periodStart }),
          ...(periodEnd && { currentPeriodEnd: periodEnd }),
          cancelAtPeriodEnd: newSub.cancel_at_period_end,
        },
      });

      await ctx.db.organization.update({
        where: { id: input.orgId },
        data: { subscriptionTier: "PRO" },
      });

      logger.info("Subscription activated", {
        orgId: input.orgId,
        stripeSubscriptionId: newSub.id,
        priceId: newSub.items.data[0]?.price.id,
        userId: ctx.session.user.id,
        periodStart: periodStart?.toISOString(),
        periodEnd: periodEnd?.toISOString(),
      });

      return { success: true };
    }),

  /**
   * Cancel subscription at period end (no immediate refund).
   * OWNER only.
   */
  cancel: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );
      requireOwner(caller.role);

      const subscription = await ctx.db.subscription.findUnique({
        where: { organizationId: input.orgId },
        select: { stripeSubscriptionId: true, status: true },
      });

      if (!subscription?.stripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription found.",
        });
      }

      const stripe = getStripe();
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await ctx.db.subscription.update({
        where: { organizationId: input.orgId },
        data: { cancelAtPeriodEnd: true },
      });

      logger.info("Subscription scheduled for cancellation", {
        orgId: input.orgId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        userId: ctx.session.user.id,
      });

      return { success: true };
    }),

  /**
   * Reactivate a subscription that was set to cancel at period end.
   * OWNER only.
   */
  reactivate: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );
      requireOwner(caller.role);

      const subscription = await ctx.db.subscription.findUnique({
        where: { organizationId: input.orgId },
        select: { stripeSubscriptionId: true, cancelAtPeriodEnd: true },
      });

      if (!subscription?.stripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription found.",
        });
      }

      const stripe = getStripe();
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      await ctx.db.subscription.update({
        where: { organizationId: input.orgId },
        data: { cancelAtPeriodEnd: false },
      });

      logger.info("Subscription reactivated", {
        orgId: input.orgId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        userId: ctx.session.user.id,
      });

      return { success: true };
    }),

  /**
   * Paginated list of Stripe webhook events for this server.
   * OWNER only — this is operational/diagnostic data.
   */
  listWebhookEvents: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const caller = await requireMembership(
        ctx.db,
        ctx.session.user.id,
        input.orgId
      );
      requireOwner(caller.role);

      const org = await ctx.db.organization.findUnique({
        where: { id: input.orgId },
        select: { stripeCustomerId: true },
      });

      if (!org?.stripeCustomerId) {
        logger.info("listWebhookEvents: org has no Stripe customer", {
          orgId: input.orgId,
        });
        return { items: [], nextCursor: undefined };
      }

      const events = await ctx.db.webhookEvent.findMany({
        where: {
          eventData: {
            path: ["object", "customer"],
            equals: org.stripeCustomerId,
          },
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          stripeEventId: true,
          eventType: true,
          processed: true,
          processingError: true,
          retryAttempts: true,
          maxRetries: true,
          retryQueue: true,
          deadLetter: true,
          createdAt: true,
          processedAt: true,
          nextRetryAt: true,
        },
      });

      const hasMore = events.length > input.limit;
      const items = hasMore ? events.slice(0, -1) : events;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      };
    }),
});
