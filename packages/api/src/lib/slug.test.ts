import { describe, expect, it } from "vitest";
import { toSlug } from "./slug.js";

// toSlug converts a display name into a URL-safe slug.
// It is used in the "Create Organization" form to show the user what
// their org URL will look like as they type the name.

describe("toSlug", () => {
  it("converts uppercase to lowercase", () => {
    expect(toSlug("Acme")).toBe("acme");
  });

  it("replaces spaces with hyphens", () => {
    expect(toSlug("My Project")).toBe("my-project");
  });

  it("collapses multiple spaces into a single hyphen", () => {
    // "hello   world" → "hello-world", not "hello---world"
    expect(toSlug("hello   world")).toBe("hello-world");
  });

  it("strips leading and trailing whitespace", () => {
    expect(toSlug("  acme  ")).toBe("acme");
  });

  it("removes special characters", () => {
    expect(toSlug("Hello@World!")).toBe("hello-world");
  });

  it("strips leading hyphens that result from special chars at the start", () => {
    // "@acme" → after removing "@" we'd get "-acme" → strip leading hyphen → "acme"
    expect(toSlug("@acme")).toBe("acme");
  });

  it("strips trailing hyphens that result from special chars at the end", () => {
    expect(toSlug("acme!")).toBe("acme");
  });

  it("passes through an already-valid slug unchanged", () => {
    expect(toSlug("acme-inc")).toBe("acme-inc");
  });

  it("handles numbers", () => {
    expect(toSlug("Team 42")).toBe("team-42");
  });

  it("returns an empty string for input with only special characters", () => {
    expect(toSlug("!!!")).toBe("");
  });
});
