import { z } from "zod";
import { PrismaClient } from "@prisma/client";

// ── Schema ──────────────────────────────────────────────────────
export type Session = {
  user: { id: string; role: string; email?: string | null } | null;
};

// ── Tool Definitions ────────────────────────────────────────────
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>, db: PrismaClient, session: Session) => Promise<unknown>;
}

export const tools: ToolDef[] = [
  {
    name: "list_recipes",
    description: "Search and list recipes. Filters by query string, tags, visibility, and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search by recipe name or ingredient text" },
        tagSlugs: { type: "array", items: { type: "string" }, description: "Filter by tag slugs" },
        visibility: { type: "string", enum: ["PUBLIC", "HIDDEN"], description: "Filter by visibility (admins only)" },
        limit: { type: "number", default: 20, description: "Max results (default 20)" },
        offset: { type: "number", default: 0, description: "Pagination offset" },
      },
    },
    async handler(args, db, session) {
      const where: Record<string, unknown> = {};

      // Not logged in → public only
      if (!session.user) {
        where.visibility = "PUBLIC";
      } else if (args.visibility && session.user.role === "ADMIN") {
        where.visibility = args.visibility;
      }

      if (args.tagSlugs && Array.isArray(args.tagSlugs) && args.tagSlugs.length > 0) {
        where.tags = {
          some: { tag: { slug: { in: args.tagSlugs } } },
        };
      }

      if (args.query && typeof args.query === "string" && args.query.trim()) {
        const q = args.query.trim();
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { cooklangContent: { contains: q, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        db.recipe.findMany({
          where,
          include: {
            tags: { include: { tag: true } },
            author: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: Math.min((args.limit as number) ?? 20, 100),
          skip: (args.offset as number) ?? 0,
        }),
        db.recipe.count({ where }),
      ]);

      return { items, total };
    },
  },

  {
    name: "get_recipe",
    description: "Get full recipe details by slug, including parsed cooklang content.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The recipe slug (URL-friendly name)" },
      },
      required: ["slug"],
    },
    async handler(args, db, session) {
      const recipe = await db.recipe.findUnique({
        where: { slug: args.slug as string },
        include: {
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, image: true } },
        },
      });
      if (!recipe) throw new Error("Recipe not found");
      if (recipe.visibility === "HIDDEN" && !session.user) {
        throw new Error("Recipe not found");
      }
      return recipe;
    },
  },

  {
    name: "create_recipe",
    description: "Create a new recipe. Requires admin privileges.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Recipe title" },
        cooklangContent: { type: "string", description: "Recipe content in Cooklang format" },
        description: { type: "string", description: "Short description" },
        servings: { type: "number", description: "Number of servings" },
        prepTime: { type: "number", description: "Prep time in minutes" },
        cookTime: { type: "number", description: "Cook time in minutes" },
        totalTime: { type: "number", description: "Total time in minutes" },
        visibility: { type: "string", enum: ["PUBLIC", "HIDDEN"], default: "PUBLIC" },
        tagIds: { type: "array", items: { type: "string" }, description: "Tag IDs to attach" },
      },
      required: ["title", "cooklangContent"],
    },
    async handler(args, db, session) {
      if (session.user?.role !== "ADMIN") {
        throw new Error("Forbidden: admin privileges required");
      }
      const slug = args.title
        ? (args.title as string)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        : `recipe-${Date.now()}`;

      const recipe = await db.recipe.create({
        data: {
          title: args.title as string,
          slug,
          cooklangContent: args.cooklangContent as string,
          description: (args.description as string) ?? null,
          servings: (args.servings as number) ?? null,
          prepTime: (args.prepTime as number) ?? null,
          cookTime: (args.cookTime as number) ?? null,
          totalTime: (args.totalTime as number) ?? null,
          visibility: (args.visibility as "PUBLIC" | "HIDDEN") ?? "PUBLIC",
          authorId: session.user!.id,
          ...(Array.isArray(args.tagIds) && args.tagIds.length > 0
            ? { tags: { create: (args.tagIds as string[]).map((id) => ({ tag: { connect: { id } } })) } }
            : {}),
        },
        include: {
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, image: true } },
        },
      });
      return recipe;
    },
  },

  {
    name: "update_recipe",
    description: "Update an existing recipe by slug. Requires admin privileges.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The recipe slug to update" },
        title: { type: "string", description: "New title" },
        cooklangContent: { type: "string", description: "New Cooklang content" },
        description: { type: "string", description: "New description" },
        servings: { type: "number", description: "New servings count" },
        prepTime: { type: "number", description: "New prep time in minutes" },
        cookTime: { type: "number", description: "New cook time in minutes" },
        totalTime: { type: "number", description: "New total time in minutes" },
        visibility: { type: "string", enum: ["PUBLIC", "HIDDEN"] },
        tagIds: { type: "array", items: { type: "string" }, description: "Replace all tags with these IDs" },
      },
      required: ["slug"],
    },
    async handler(args, db, session) {
      if (session.user?.role !== "ADMIN") {
        throw new Error("Forbidden: admin privileges required");
      }
      const existing = await db.recipe.findUnique({ where: { slug: args.slug as string } });
      if (!existing) throw new Error("Recipe not found");

      const data: Record<string, unknown> = {};

      if (args.title) {
        data.title = args.title;
        data.slug = (args.title as string)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      for (const field of ["cooklangContent", "description", "servings", "prepTime", "cookTime", "totalTime"] as const) {
        if (args[field] !== undefined) data[field] = args[field];
      }
      if (args.visibility !== undefined) data.visibility = args.visibility as "PUBLIC" | "HIDDEN";

      if (Array.isArray(args.tagIds)) {
        await db.recipeTag.deleteMany({ where: { recipeId: existing.id } });
        data.tags = {
          create: (args.tagIds as string[]).map((id) => ({ tag: { connect: { id } } })),
        };
      }

      const recipe = await db.recipe.update({
        where: { id: existing.id },
        data,
        include: {
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, image: true } },
        },
      });
      return recipe;
    },
  },

  {
    name: "delete_recipe",
    description: "Delete a recipe by slug. Requires admin privileges.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The recipe slug to delete" },
      },
      required: ["slug"],
    },
    async handler(args, db, session) {
      if (session.user?.role !== "ADMIN") {
        throw new Error("Forbidden: admin privileges required");
      }
      const recipe = await db.recipe.findUnique({ where: { slug: args.slug as string } });
      if (!recipe) throw new Error("Recipe not found");
      await db.recipe.delete({ where: { id: recipe.id } });
      return { success: true };
    },
  },

  {
    name: "list_tags",
    description: "List all available tags/categories.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    async handler(_args, db, _session) {
      const tags = await db.tag.findMany({
        include: { _count: { select: { recipes: true } } },
        orderBy: { name: "asc" },
      });
      return tags;
    },
  },
];
