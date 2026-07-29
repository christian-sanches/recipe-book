import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { slugify, generateSlug } from "~/lib/utils";
import { Visibility } from "@prisma/client";

export const recipeRouter = router({
  list: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        tagSlugs: z.array(z.string()).optional(),
        visibility: z.nativeEnum(Visibility).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (!ctx.session?.user) {
        where.visibility = "PUBLIC";
      } else if (input.visibility) {
        where.visibility = input.visibility;
      }

      if (input.tagSlugs && input.tagSlugs.length > 0) {
        where.tags = {
          some: {
            tag: {
              slug: { in: input.tagSlugs },
            },
          },
        };
      }

      if (input.query) {
        where.OR = [
          { title: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
          { cooklangContent: { contains: input.query, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.db.recipe.findMany({
          where,
          include: {
            tags: { include: { tag: true } },
            author: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.recipe.count({ where }),
      ]);

      return { items, total };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findUnique({
        where: { slug: input.slug },
        include: {
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, image: true } },
        },
      });

      if (!recipe) {
        throw new Error("Recipe not found");
      }

      if (recipe.visibility === "HIDDEN" && !ctx.session?.user) {
        throw new Error("Recipe not found");
      }

      return recipe;
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        cooklangContent: z.string(),
        description: z.string().optional(),
        servings: z.number().int().positive().optional(),
        prepTime: z.number().int().positive().optional(),
        cookTime: z.number().int().positive().optional(),
        totalTime: z.number().int().positive().optional(),
        source: z.string().optional(),
        image: z.string().optional(),
        visibility: z.nativeEnum(Visibility).default("PUBLIC"),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(input.title);

      const recipe = await ctx.db.recipe.create({
        data: {
          title: input.title,
          slug,
          cooklangContent: input.cooklangContent,
          description: input.description,
          servings: input.servings,
          prepTime: input.prepTime,
          cookTime: input.cookTime,
          totalTime: input.totalTime,
          source: input.source,
          image: input.image,
          visibility: input.visibility,
          authorId: ctx.session.user.id,
          tags: input.tags
            ? {
                create: input.tags.map((tagId) => ({
                  tag: { connect: { id: tagId } },
                })),
              }
            : undefined,
        },
        include: {
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, image: true } },
        },
      });

      return recipe;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        cooklangContent: z.string().optional(),
        description: z.string().optional(),
        servings: z.number().int().positive().optional().nullable(),
        prepTime: z.number().int().positive().optional().nullable(),
        cookTime: z.number().int().positive().optional().nullable(),
        totalTime: z.number().int().positive().optional().nullable(),
        source: z.string().optional().nullable(),
        image: z.string().optional().nullable(),
        visibility: z.nativeEnum(Visibility).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...data } = input;

      if (data.title) {
        (data as any).slug = generateSlug(data.title);
      }

      if (tags !== undefined) {
        await ctx.db.recipeTag.deleteMany({ where: { recipeId: id } });
      }

      const recipe = await ctx.db.recipe.update({
        where: { id },
        data: {
          ...data,
          ...(tags !== undefined
            ? {
                tags: {
                  create: tags.map((tagId) => ({
                    tag: { connect: { id: tagId } },
                  })),
                },
              }
            : {}),
        },
        include: {
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, image: true } },
        },
      });

      return recipe;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.recipe.delete({ where: { id: input.id } });
      return { success: true };
    }),

  export: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findUnique({
        where: { slug: input.slug },
      });

      if (!recipe) {
        throw new Error("Recipe not found");
      }

      if (recipe.visibility === "HIDDEN" && !ctx.session?.user) {
        throw new Error("Recipe not found");
      }

      return recipe.cooklangContent;
    }),
});
