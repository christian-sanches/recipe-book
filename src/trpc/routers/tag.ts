import { router, publicProcedure, adminProcedure } from "~/trpc/init";
import { slugify } from "~/lib/utils";
import { createTagSchema } from "~/models/tag";

export const tagRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.tag.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { recipes: true } },
      },
    });
  }),

  create: adminProcedure
    .input(createTagSchema)
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name);

      const existing = await ctx.db.tag.findUnique({ where: { slug } });
      if (existing) {
        return existing;
      }

      return ctx.db.tag.create({
        data: {
          name: input.name,
          slug,
        },
      });
    }),
});
