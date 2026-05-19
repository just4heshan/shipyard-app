import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe ??= new Stripe(key);
  return _stripe;
}

export interface PriceDetails {
  amount: number;
  currency: string;
  interval: string;
}

export async function fetchPriceDetails(
  priceId: string
): Promise<PriceDetails | null> {
  try {
    const stripe = getStripe();
    if (!stripe) return null;
    const price = await stripe.prices.retrieve(priceId);
    return {
      amount: price.unit_amount ?? 0,
      currency: price.currency,
      interval: price.recurring?.interval ?? "month",
    };
  } catch {
    return null;
  }
}
