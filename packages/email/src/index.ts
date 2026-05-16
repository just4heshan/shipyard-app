import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { PrismaClient } from "@shipyard/db";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Template identifier stored in EmailLog for replay/debugging */
  templateName?: string;
  /** Template props stored in EmailLog (must be JSON-serialisable) */
  templateData?: Record<string, unknown>;
  /** Prisma client — when provided writes an EmailLog entry */
  db?: PrismaClient;
}

export async function sendEmail({
  to,
  subject,
  html,
  templateName,
  templateData,
  db,
}: SendEmailOptions): Promise<void> {
  // Write PENDING log before attempting delivery so we capture every attempt.
  // Skip logging when templateName is absent (e.g. legacy callers without full metadata).
  const logId =
    templateName && templateData
      ? await createPendingLog(db, { recipient: to, subject, templateName, templateData })
      : null;

  try {
    if (process.env.NODE_ENV === "development") {
      await sendViaMailhog({ to, subject, html });
    } else {
      await sendViaResend({ to, subject, html });
    }

    await updateLog(db, logId, { status: "SENT", deliveredAt: new Date() });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await updateLog(db, logId, { status: "FAILED", failureReason: reason });
    throw err;
  }
}

// ─── Transports ──────────────────────────────────────────────────────────────

async function sendViaMailhog({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST ?? "localhost",
    port: Number(process.env.EMAIL_PORT ?? 1025),
    secure: false,
  });
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@shipyard.dev",
    to,
    subject,
    html,
  });
}

async function sendViaResend({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@shipyard.dev",
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── EmailLog helpers ─────────────────────────────────────────────────────────

async function createPendingLog(
  db: PrismaClient | undefined,
  data: {
    recipient: string;
    subject: string;
    templateName: string;
    templateData: Record<string, unknown>;
  },
): Promise<string | null> {
  if (!db) return null;
  try {
    const log = await db.emailLog.create({
      data: {
        recipient: data.recipient,
        subject: data.subject,
        templateName: data.templateName,
        // JSON.parse(JSON.stringify(...)) strips non-JSON-serialisable values
        // and satisfies Prisma's InputJsonValue constraint
        templateData: JSON.parse(JSON.stringify(data.templateData)),
        status: "PENDING",
      },
      select: { id: true },
    });
    return log.id;
  } catch {
    // Never let logging block delivery
    return null;
  }
}

async function updateLog(
  db: PrismaClient | undefined,
  logId: string | null,
  data: { status: "SENT" | "FAILED"; deliveredAt?: Date; failureReason?: string },
): Promise<void> {
  if (!db || !logId) return;
  try {
    await db.emailLog.update({ where: { id: logId }, data });
  } catch {
    // Never let logging block the caller
  }
}

// Re-export templates so callers can import from one place
export { renderVerifyEmail } from "./templates/verify-email";
export type { VerifyEmailProps } from "./templates/verify-email";
export { renderPaymentFailedEmail } from "./templates/payment-failed";
export type { PaymentFailedEmailProps } from "./templates/payment-failed";
export { renderInviteEmail } from "./templates/invite";
export type { InviteEmailProps } from "./templates/invite";
export { renderTaskAssignedEmail } from "./templates/task-assigned";
export type { TaskAssignedEmailProps } from "./templates/task-assigned";
export { renderCommentMentionEmail } from "./templates/comment-mention";
export type { CommentMentionEmailProps } from "./templates/comment-mention";
export {
  renderSubscriptionUpgradeEmail,
  renderSubscriptionCancelScheduledEmail,
  renderSubscriptionReactivatedEmail,
  renderSubscriptionDowngradedEmail,
} from "./templates/subscription";
export type {
  SubscriptionUpgradeEmailProps,
  SubscriptionCancelScheduledEmailProps,
  SubscriptionReactivatedEmailProps,
  SubscriptionDowngradedEmailProps,
} from "./templates/subscription";
