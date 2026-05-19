import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import {
  requireContributorRole,
  requireManagerRole,
  requireOwner,
} from "./membership.js";

// TDD exercise: these tests describe expected behavior first.
// Run them against the existing code to confirm everything passes.

// ---------------------------------------------------------------------------
// requireManagerRole
// Rule: only OWNER and ADMIN may manage the org (invite members, edit projects)
// ---------------------------------------------------------------------------

describe("requireManagerRole", () => {
  it("allows OWNER", () => {
    // not.toThrow() — the function should return normally with no error
    expect(() => requireManagerRole("OWNER")).not.toThrow();
  });

  it("allows ADMIN", () => {
    expect(() => requireManagerRole("ADMIN")).not.toThrow();
  });

  it("throws for MEMBER", () => {
    // We wrap in an arrow function () => so Vitest can call it and catch
    // the thrown error. Calling requireManagerRole("MEMBER") directly would
    // crash the test line itself before expect() gets a chance to run.
    expect(() => requireManagerRole("MEMBER")).toThrow(TRPCError);
  });

  it("throws for VIEWER", () => {
    expect(() => requireManagerRole("VIEWER")).toThrow(TRPCError);
  });

  it("throws with code FORBIDDEN, not UNAUTHORIZED", () => {
    // UNAUTHORIZED = not logged in.
    // FORBIDDEN    = logged in but not allowed.
    // These are different HTTP semantics and the frontend toast message
    // depends on this distinction, so we pin it explicitly.
    try {
      requireManagerRole("MEMBER");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

// ---------------------------------------------------------------------------
// requireContributorRole
// Rule: VIEWER is read-only — cannot create tasks or comments
// ---------------------------------------------------------------------------

describe("requireContributorRole", () => {
  it("allows OWNER", () => {
    expect(() => requireContributorRole("OWNER")).not.toThrow();
  });

  it("allows ADMIN", () => {
    expect(() => requireContributorRole("ADMIN")).not.toThrow();
  });

  it("allows MEMBER", () => {
    // This is the key difference from requireManagerRole —
    // MEMBERs can contribute (create tasks, write comments)
    // but cannot manage the org (invite people, change roles).
    expect(() => requireContributorRole("MEMBER")).not.toThrow();
  });

  it("throws for VIEWER", () => {
    expect(() => requireContributorRole("VIEWER")).toThrow(TRPCError);
  });

  it("throws with code FORBIDDEN for VIEWER", () => {
    try {
      requireContributorRole("VIEWER");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

// ---------------------------------------------------------------------------
// requireOwner
// Rule: only OWNER can manage billing / subscription
// ---------------------------------------------------------------------------

describe("requireOwner", () => {
  it("allows OWNER", () => {
    expect(() => requireOwner("OWNER")).not.toThrow();
  });

  it("throws for ADMIN", () => {
    expect(() => requireOwner("ADMIN")).toThrow(TRPCError);
  });

  it("throws for MEMBER", () => {
    expect(() => requireOwner("MEMBER")).toThrow(TRPCError);
  });

  it("throws for VIEWER", () => {
    expect(() => requireOwner("VIEWER")).toThrow(TRPCError);
  });

  it("throws with code FORBIDDEN, not UNAUTHORIZED", () => {
    try {
      requireOwner("ADMIN");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});
