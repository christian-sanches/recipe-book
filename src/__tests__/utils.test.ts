import { describe, it, expect } from "@jest/globals";
import { slugify, generateSlug } from "~/lib/utils";

describe("slugify", () => {
  it("lowercases and trims", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("replaces spaces and underscores with hyphens", () => {
    expect(slugify("my recipe name")).toBe("my-recipe-name");
    expect(slugify("hello_world_test")).toBe("hello-world-test");
  });

  it("removes special characters", () => {
    expect(slugify("chicken & rice!")).toBe("chicken-rice");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("foo---bar")).toBe("foo-bar");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-hello-")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("generateSlug", () => {
  it("contains the slugified title", () => {
    const slug = generateSlug("My Recipe");
    expect(slug).toContain("my-recipe");
  });

  it("includes a random suffix", () => {
    const slug = generateSlug("Test");
    // format: "test-<6char suffix>"
    expect(slug).toMatch(/^test-[a-z0-9]{6}$/);
  });

  it("produces unique slugs for same title", () => {
    const a = generateSlug("Same");
    const b = generateSlug("Same");
    expect(a).not.toBe(b);
  });
});
