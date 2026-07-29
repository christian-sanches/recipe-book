import { describe, it, expect } from "@jest/globals";
import {
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesSchema,
  bySlugSchema,
  deleteRecipeSchema,
  exportRecipeSchema,
} from "~/models/recipe";
import { createTagSchema } from "~/models/tag";

describe("recipe schemas", () => {
  describe("createRecipeSchema", () => {
    it("accepts valid input", () => {
      const result = createRecipeSchema.safeParse({
        title: "Test Recipe",
        cooklangContent: "@flour{2%cups}",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing title", () => {
      const result = createRecipeSchema.safeParse({
        cooklangContent: "@flour{2%cups}",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing cooklangContent", () => {
      const result = createRecipeSchema.safeParse({
        title: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional fields", () => {
      const result = createRecipeSchema.safeParse({
        title: "Test",
        cooklangContent: "",
        description: "A test",
        servings: 4,
        prepTime: 15,
        cookTime: 30,
        totalTime: 45,
        source: "https://example.com",
        visibility: "PUBLIC",
        tags: ["tag1", "tag2"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts null optional fields", () => {
      const result = createRecipeSchema.safeParse({
        title: "Test",
        cooklangContent: "",
        description: null,
        servings: null,
        prepTime: null,
        cookTime: null,
        totalTime: null,
        source: null,
        visibility: "HIDDEN",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateRecipeSchema", () => {
    it("requires id", () => {
      const result = updateRecipeSchema.safeParse({
        title: "New title",
      });
      expect(result.success).toBe(false);
    });

    it("accepts partial data with id", () => {
      const result = updateRecipeSchema.safeParse({
        id: "abc123",
        title: "Updated Title",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("listRecipesSchema", () => {
    it("provides defaults", () => {
      const result = listRecipesSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });
  });

  describe("bySlugSchema", () => {
    it("requires slug", () => {
      const result = bySlugSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("deleteRecipeSchema", () => {
    it("requires id", () => {
      const result = deleteRecipeSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("exportRecipeSchema", () => {
    it("requires slug", () => {
      const result = exportRecipeSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe("tag schemas", () => {
  describe("createTagSchema", () => {
    it("accepts valid tag name", () => {
      const result = createTagSchema.safeParse({ name: "dessert" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createTagSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });
});
