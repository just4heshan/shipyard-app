import { db } from "@shipyard/db";
import { logger } from "@shipyard/logger";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/server/stripe";
import { processStripeEvent } from "./_lib/process";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    logger.warn("Stripe webhook received without signature or secret");
    return NextResponse.json(
      { error: "Missing stripe-signature header or webhook secret" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    logger.error(
      "Stripe webhook handler called but STRIPE_SECRET_KEY is not set"
    );
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.warn("Stripe webhook signature verification failed", {
      error: String(err),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: store the event first, then process.
  // If we've already seen this event, acknowledge immediately without
  // reprocessing
  const stored = await db.webhookEvent.upsert({
    where: { stripeEventId: event.id },
    create: {
      stripeEventId: event.id,
      eventType: event.type,
      eventData: JSON.parse(JSON.stringify(event.data)),
    },
    update: {}, // already stored — do not overwrite
    select: { id: true, processed: true },
  });

  if (stored.processed) {
    return NextResponse.json({ received: true });
  }

  try {
    await processStripeEvent(event.type, event.data, db);

    await db.webhookEvent.update({
      where: { id: stored.id },
      data: {
        processed: true,
        processingError: null,
        processedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Stripe webhook processing failed — queued for retry", {
      eventType: event.type,
      eventId: event.id,
      error: message,
    });

    await db.webhookEvent.update({
      where: { id: stored.id },
      data: {
        processingError: message,
        retryAttempts: { increment: 1 },
        retryQueue: true,
        // First retry in 1 minute
        nextRetryAt: new Date(Date.now() + 60_000),
      },
    });
  }

  // Always return 200 — we've stored the event and will retry on failure.
  // Returning 5xx would cause Stripe to retry immediately and flood the queue.
  return NextResponse.json({ received: true });
}
