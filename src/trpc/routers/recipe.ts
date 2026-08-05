import { router, publicProcedure, adminProcedure } from "~/trpc/init";
import { generateSlug } from "~/lib/utils";
import { serializeRecipeToCook } from "~/lib/cooklang";
import {
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesSchema,
  bySlugSchema,
  deleteRecipeSchema,
  exportRecipeSchema,
} from "~/models/recipe";

export const recipeRouter = router({
  list: publicProcedure
    .input(listRecipesSchema)
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
    .input(bySlugSchema)
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
    .input(createRecipeSchema)
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
    .input(updateRecipeSchema)
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
    .input(deleteRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.recipe.delete({ where: { id: input.id } });
      return { success: true };
    }),

  export: publicProcedure
    .input(exportRecipeSchema)
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findUnique({
        where: { slug: input.slug },
        include: { tags: { include: { tag: true } } },
      });

      if (!recipe) {
        throw new Error("Recipe not found");
      }

      if (recipe.visibility === "HIDDEN" && !ctx.session?.user) {
        throw new Error("Recipe not found");
      }

      return serializeRecipeToCook({
        title: recipe.title,
        description: recipe.description,
        source: recipe.source,
        image: recipe.image,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        tags: recipe.tags.map((rt) => rt.tag.name),
        cooklangContent: recipe.cooklangContent,
      });
    }),
});
