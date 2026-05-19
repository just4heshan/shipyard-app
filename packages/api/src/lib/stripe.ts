import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

export function getStripe(): InstanceType<typeof Stripe> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Stripe is not configured on this server.",
    });
  }
  return new Stripe(key);
}

/**
 * Returns the configured Stripe Price ID for the Pro plan.
 * Throws if the env var is absent so callers don't need to handle undefined.
 */
export function getProPriceId(): string {
  const price = process.env.STRIPE_PRO_PRICE_ID;
  if (!price) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Stripe Pro price is not configured.",
    });
  }
  return price;
}
