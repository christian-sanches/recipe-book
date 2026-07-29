import { z } from "zod";

export const recipeVisibility = z.enum(["PUBLIC", "HIDDEN"]);

const nullableString = z.string().nullable().optional();
const nullablePositiveInt = z.number().int().positive().nullable().optional();

export const createRecipeSchema = z.object({
  title: z.string().min(1).max(200),
  cooklangContent: z.string(),
  description: nullableString,
  servings: nullablePositiveInt,
  prepTime: nullablePositiveInt,
  cookTime: nullablePositiveInt,
  totalTime: nullablePositiveInt,
  source: nullableString,
  image: nullableString,
  visibility: recipeVisibility.default("PUBLIC"),
  tags: z.array(z.string()).optional(),
});

export const updateRecipeSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  cooklangContent: z.string().optional(),
  description: nullableString,
  servings: nullablePositiveInt,
  prepTime: nullablePositiveInt,
  cookTime: nullablePositiveInt,
  totalTime: nullablePositiveInt,
  source: nullableString,
  image: nullableString,
  visibility: recipeVisibility.optional(),
  tags: z.array(z.string()).optional(),
});

export const listRecipesSchema = z.object({
  query: z.string().optional(),
  tagSlugs: z.array(z.string()).optional(),
  visibility: recipeVisibility.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const bySlugSchema = z.object({ slug: z.string() });
export const deleteRecipeSchema = z.object({ id: z.string() });
export const exportRecipeSchema = z.object({ slug: z.string() });
