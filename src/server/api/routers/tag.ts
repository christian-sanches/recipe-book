import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "~/server/api/trpc";
import { slugify } from "~/lib/utils";

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
    .input(
      z.object({
        name: z.string().min(1).max(100),
      })
    )
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
