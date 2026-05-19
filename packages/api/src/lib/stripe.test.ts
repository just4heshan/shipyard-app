import { TRPCError } from "@trpc/server";
import { afterEach, describe, expect, it } from "vitest";
import { getProPriceId, getStripe } from "./stripe.js";

// These helpers gate Stripe functionality behind env vars.
// We test the guard behaviour without needing a real Stripe key.

describe("getStripe", () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    // Restore env after each test
    if (originalKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalKey;
    }
  });

  it("throws INTERNAL_SERVER_ERROR when STRIPE_SECRET_KEY is not set", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => getStripe()).toThrow(TRPCError);
  });

  it("throws with code INTERNAL_SERVER_ERROR, not UNAUTHORIZED", () => {
    delete process.env.STRIPE_SECRET_KEY;
    try {
      getStripe();
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
  });

  it("returns a Stripe instance when the key is present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    // We only verify it does not throw — we do not make real API calls.
    expect(() => getStripe()).not.toThrow();
  });
});

describe("getProPriceId", () => {
  const originalPrice = process.env.STRIPE_PRO_PRICE_ID;

  afterEach(() => {
    if (originalPrice === undefined) {
      delete process.env.STRIPE_PRO_PRICE_ID;
    } else {
      process.env.STRIPE_PRO_PRICE_ID = originalPrice;
    }
  });

  it("throws INTERNAL_SERVER_ERROR when STRIPE_PRO_PRICE_ID is not set", () => {
    delete process.env.STRIPE_PRO_PRICE_ID;
    expect(() => getProPriceId()).toThrow(TRPCError);
  });

  it("throws with code INTERNAL_SERVER_ERROR", () => {
    delete process.env.STRIPE_PRO_PRICE_ID;
    try {
      getProPriceId();
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
  });

  it("returns the price ID string when the env var is set", () => {
    process.env.STRIPE_PRO_PRICE_ID = "price_test_123";
    expect(getProPriceId()).toBe("price_test_123");
  });
});
