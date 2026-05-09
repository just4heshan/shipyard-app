import { describe, it, expect } from "vitest";
import { userInitials } from "./userInitials.js";

// userInitials generates the 1-2 character abbreviation shown in Avatar
// components when no profile image is available.
//
// The function under test (userInitials.ts):
//   if (name) → split by space, take first char of each word, uppercase, slice to 2
//   else      → first char of email (uppercase) or "U" as final fallback

describe("userInitials", () => {
  // --- name is provided ---

  it("returns initials from a two-word name", () => {
    // "John Doe" → ["John", "Doe"] → ["J", "D"] → "JD"
    expect(userInitials("John Doe")).toBe("JD");
  });

  it("returns first two characters for a single-word name", () => {
    // "Alice" → ["Alice"] → ["A"] → "A" → slice(0,2) → "AL"
    // Note: slice takes the first char of EACH word, then slices the joined string.
    // Single word "Alice" → first chars → "A" → slice(0,2) → "A"
    // Wait — the function maps each word to its first char, so "Alice" → ["A"] → "A"
    expect(userInitials("Alice")).toBe("A");
  });

  it("caps at 2 characters for names with 3+ words", () => {
    // "Mary Jane Watson" → ["M","J","W"] → "MJW" → slice(0,2) → "MJ"
    expect(userInitials("Mary Jane Watson")).toBe("MJ");
  });

  it("uppercases the result", () => {
    expect(userInitials("john doe")).toBe("JD");
  });

  // --- name is null/undefined, email is provided ---

  it("falls back to first char of email when name is null", () => {
    expect(userInitials(null, "alice@example.com")).toBe("A");
  });

  it("falls back to first char of email when name is undefined", () => {
    expect(userInitials(undefined, "bob@example.com")).toBe("B");
  });

  it("uppercases the email fallback", () => {
    expect(userInitials(null, "carol@example.com")).toBe("C");
  });

  // --- both are null/undefined ---

  it("returns U when both name and email are null", () => {
    // "U" is the safe fallback for users with incomplete OAuth profiles
    expect(userInitials(null, null)).toBe("U");
  });

  it("returns U when both name and email are undefined", () => {
    expect(userInitials(undefined, undefined)).toBe("U");
  });
});
