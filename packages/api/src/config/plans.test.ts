import { describe, it, expect } from "vitest";
import { ORG_OWNER_LIMITS, MEMBER_LIMITS, PROJECT_LIMITS } from "./plans.js";

// Sanity tests for subscription tier limits.
//
// These values are business-critical — they gate what free vs paid users can do.
// If a limit is accidentally changed (e.g. FREE: 1 → FREE: 10), free users get
// paid features for free. The Stripe billing integration in Week 3 relies on
// these exact numbers.
//
// If you intentionally change a limit, update the corresponding test below too.
// That deliberate step is the point — it prevents silent accidental edits.

describe("ORG_OWNER_LIMITS", () => {
  it("free tier: max 1 owned org", () => {
    expect(ORG_OWNER_LIMITS.FREE).toBe(1);
  });

  it("pro tier: max 10 owned orgs", () => {
    expect(ORG_OWNER_LIMITS.PRO).toBe(10);
  });

  it("enterprise tier: unlimited owned orgs", () => {
    expect(ORG_OWNER_LIMITS.ENTERPRISE).toBe(Infinity);
  });
});

describe("MEMBER_LIMITS", () => {
  it("free tier: max 5 members", () => {
    expect(MEMBER_LIMITS.FREE).toBe(5);
  });

  it("pro tier: max 25 members", () => {
    expect(MEMBER_LIMITS.PRO).toBe(25);
  });

  it("enterprise tier: unlimited members", () => {
    expect(MEMBER_LIMITS.ENTERPRISE).toBe(Infinity);
  });
});

describe("PROJECT_LIMITS", () => {
  it("free tier: max 1 active project", () => {
    expect(PROJECT_LIMITS.FREE).toBe(1);
  });

  it("pro tier: unlimited active projects", () => {
    expect(PROJECT_LIMITS.PRO).toBe(Infinity);
  });

  it("enterprise tier: unlimited active projects", () => {
    expect(PROJECT_LIMITS.ENTERPRISE).toBe(Infinity);
  });
});
