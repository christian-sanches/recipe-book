import { describe, it, expect } from "@jest/globals";
import {
  serializeRecipeToCook,
  parseCookFile,
  parseDurationToMinutes,
  stripMetadata,
} from "~/lib/cooklang";

describe("parseDurationToMinutes", () => {
  it("parses plain numbers as minutes", () => {
    expect(parseDurationToMinutes("45")).toBe(45);
    expect(parseDurationToMinutes("0")).toBe(0);
  });

  it("parses minute units", () => {
    expect(parseDurationToMinutes("15 minutes")).toBe(15);
    expect(parseDurationToMinutes("15 min")).toBe(15);
    expect(parseDurationToMinutes("15 mins")).toBe(15);
  });

  it("parses hours", () => {
    expect(parseDurationToMinutes("1h")).toBe(60);
    expect(parseDurationToMinutes("1 hour")).toBe(60);
    expect(parseDurationToMinutes("1.5h")).toBe(90);
  });

  it("parses combined durations", () => {
    expect(parseDurationToMinutes("1h30m")).toBe(90);
    expect(parseDurationToMinutes("1h 30m")).toBe(90);
    expect(parseDurationToMinutes("2 hours 30 minutes")).toBe(150);
    expect(parseDurationToMinutes("2h30min")).toBe(150);
  });

  it("returns null for empty or unparseable values", () => {
    expect(parseDurationToMinutes("")).toBeNull();
    expect(parseDurationToMinutes("about 45")).toBeNull();
    expect(parseDurationToMinutes(null)).toBeNull();
    expect(parseDurationToMinutes(undefined)).toBeNull();
  });
});

describe("stripMetadata", () => {
  it("removes leading >> metadata lines", () => {
    const body = stripMetadata(
      ">> title: Test\n>> servings: 4\n\n@flour{200%g}\nStep one."
    );
    expect(body).toBe("@flour{200%g}\nStep one.");
  });

  it("removes YAML frontmatter", () => {
    const body = stripMetadata(
      "---\ntitle: Test\nservings: 4\n---\n\n@flour{200%g}\nStep one."
    );
    expect(body).toBe("@flour{200%g}\nStep one.");
  });

  it("returns content unchanged when there is no metadata", () => {
    const body = stripMetadata("@flour{200%g}\nStep one.");
    expect(body).toBe("@flour{200%g}\nStep one.");
  });
});

describe("serializeRecipeToCook", () => {
  it("writes all provided metadata in canonical format", () => {
    const out = serializeRecipeToCook({
      title: "Tomato Sauce",
      description: "A classic.",
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      totalTime: 45,
      source: "Nonna",
      image: "https://example.com/img.jpg",
      tags: ["italian", "vegan"],
      cooklangContent: "@tomato{2%can}\nAdd @tomato to #pan.",
    });

    expect(out).toContain(">> title: Tomato Sauce");
    expect(out).toContain(">> description: A classic.");
    expect(out).toContain(">> servings: 4");
    expect(out).toContain(">> prep time: 15 minutes");
    expect(out).toContain(">> cook time: 30 minutes");
    expect(out).toContain(">> time: 45 minutes");
    expect(out).toContain(">> source: Nonna");
    expect(out).toContain(">> image: https://example.com/img.jpg");
    expect(out).toContain(">> tags: italian, vegan");
    expect(out).toContain("@tomato{2%can}\nAdd @tomato to #pan.");
  });

  it("computes total time from prep + cook when missing", () => {
    const out = serializeRecipeToCook({
      prepTime: 10,
      cookTime: 20,
      cooklangContent: "@a",
    });
    expect(out).toContain(">> time: 30 minutes");
  });

  it("omits empty metadata and strips existing metadata from the body", () => {
    const out = serializeRecipeToCook({
      title: "Only Title",
      cooklangContent: ">> servings: 8\n\n@a\nStep.",
    });

    expect(out).toContain(">> title: Only Title");
    expect(out).toContain("@a\nStep.");
    expect(out).not.toContain(">> servings: 8");
    expect(out).not.toContain(">> description:");
    expect(out).not.toContain(">> tags:");
  });
});

describe("parseCookFile", () => {
  it("parses >> metadata lines", () => {
    const parsed = parseCookFile(
      [
        ">> title: Tomato Sauce",
        ">> description: A classic.",
        ">> tags: italian, vegan",
        ">> source: Nonna",
        ">> servings: 4",
        ">> prep time: 15 minutes",
        ">> cook time: 30 minutes",
        ">> time: 45 minutes",
        ">> image: https://example.com/img.jpg",
        "",
        "@tomato{2%can}",
        "Add @tomato to #pan.",
      ].join("\n")
    );

    expect(parsed.title).toBe("Tomato Sauce");
    expect(parsed.description).toBe("A classic.");
    expect(parsed.tags).toEqual(["italian", "vegan"]);
    expect(parsed.source).toBe("Nonna");
    expect(parsed.servings).toBe(4);
    expect(parsed.prepTime).toBe(15);
    expect(parsed.cookTime).toBe(30);
    expect(parsed.totalTime).toBe(45);
    expect(parsed.image).toBe("https://example.com/img.jpg");
    expect(parsed.cooklangContent).toBe("@tomato{2%can}\nAdd @tomato to #pan.");
  });

  it("parses YAML frontmatter including tag lists", () => {
    const parsed = parseCookFile(
      [
        "---",
        "title: YAML Sauce",
        "servings: 2",
        "prep time: 1h30m",
        "tags:",
        "  - italian",
        "  - quick",
        "---",
        "",
        "@basil{1%bunch}",
      ].join("\n")
    );

    expect(parsed.title).toBe("YAML Sauce");
    expect(parsed.servings).toBe(2);
    expect(parsed.prepTime).toBe(90);
    expect(parsed.tags).toEqual(["italian", "quick"]);
    expect(parsed.cooklangContent).toBe("@basil{1%bunch}");
  });

  it("handles servings with units and compact durations", () => {
    const parsed = parseCookFile(">> servings: 15 cups worth\n>> time: 1h30m\n@a");
    expect(parsed.servings).toBe(15);
    expect(parsed.totalTime).toBe(90);
  });

  it("returns nulls and empty lists for missing fields", () => {
    const parsed = parseCookFile("@flour{2%cups}\nMix.");
    expect(parsed.title).toBeNull();
    expect(parsed.description).toBeNull();
    expect(parsed.source).toBeNull();
    expect(parsed.image).toBeNull();
    expect(parsed.servings).toBeNull();
    expect(parsed.prepTime).toBeNull();
    expect(parsed.cookTime).toBeNull();
    expect(parsed.totalTime).toBeNull();
    expect(parsed.tags).toEqual([]);
    expect(parsed.cooklangContent).toBe("@flour{2%cups}\nMix.");
  });
});

describe("round-trip", () => {
  it("serialize then parse preserves all fields", () => {
    const original = {
      title: "Sauce",
      description: "A classic.",
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      totalTime: 45,
      source: "Nonna",
      image: "https://example.com/i.jpg",
      tags: ["italian", "vegan"],
      cooklangContent: "@tomato{2%can}\nAdd @tomato to #pan.",
    };

    const file = serializeRecipeToCook(original);
    const parsed = parseCookFile(file);

    expect(parsed.title).toBe(original.title);
    expect(parsed.description).toBe(original.description);
    expect(parsed.servings).toBe(original.servings);
    expect(parsed.prepTime).toBe(original.prepTime);
    expect(parsed.cookTime).toBe(original.cookTime);
    expect(parsed.totalTime).toBe(original.totalTime);
    expect(parsed.source).toBe(original.source);
    expect(parsed.image).toBe(original.image);
    expect(parsed.tags).toEqual(original.tags);
    expect(parsed.cooklangContent).toBe(original.cooklangContent);
  });
});
