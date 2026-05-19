import type { PrismaClient } from "@shipyard/db";
import { logger } from "@shipyard/logger";
import { processStripeEvent } from "./process";

// Exponential backoff delays (milliseconds) per retry attempt
const BACKOFF_MS = [
  60_000, // attempt 1: 1 minute
  300_000, // attempt 2: 5 minutes
  1_800_000, // attempt 3: 30 minutes
];

export interface RetryResult {
  processed: number;
  failed: number;
  deadLettered: number;
}

/**
 * Process all webhook events currently in the retry queue whose
 * nextRetryAt has passed. Called by the `/api/webhooks/stripe/retry` cron
 * route on every scheduled tick.
 */
export async function processRetryQueue(
  db: PrismaClient
): Promise<RetryResult> {
  const result: RetryResult = { processed: 0, failed: 0, deadLettered: 0 };

  const due = await db.webhookEvent.findMany({
    where: {
      retryQueue: true,
      deadLetter: false,
      processed: false,
      nextRetryAt: { lte: new Date() },
    },
    orderBy: [{ priority: "desc" }, { nextRetryAt: "asc" }],
    select: {
      id: true,
      eventType: true,
      eventData: true,
      retryAttempts: true,
      maxRetries: true,
    },
    take: 50, // process at most 50 events per run to stay within request budgets
  });

  for (const event of due) {
    try {
      await processStripeEvent(event.eventType, event.eventData, db);

      await db.webhookEvent.update({
        where: { id: event.id },
        data: {
          processed: true,
          processingError: null,
          processedAt: new Date(),
          retryQueue: false,
        },
      });

      result.processed++;
      logger.info("Retry succeeded", {
        eventId: event.id,
        attempt: event.retryAttempts,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const nextAttempt = event.retryAttempts + 1;
      const isDeadLetter = nextAttempt >= event.maxRetries;

      if (isDeadLetter) {
        await db.webhookEvent.update({
          where: { id: event.id },
          data: {
            retryAttempts: nextAttempt,
            processingError: message,
            retryQueue: false,
            deadLetter: true,
          },
        });
        result.deadLettered++;
        logger.error("Webhook moved to dead letter queue", {
          eventId: event.id,
          attempts: nextAttempt,
          error: message,
        });
      } else {
        const delay =
          BACKOFF_MS[nextAttempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1]!;
        await db.webhookEvent.update({
          where: { id: event.id },
          data: {
            retryAttempts: nextAttempt,
            processingError: message,
            nextRetryAt: new Date(Date.now() + delay),
          },
        });
        result.failed++;
        logger.warn("Retry failed — will retry later", {
          eventId: event.id,
          nextAttempt,
          nextRetryAt: new Date(Date.now() + delay).toISOString(),
          error: message,
        });
      }
    }
  }

  return result;
}
