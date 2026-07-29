import { router } from "~/server/api/trpc";
import { recipeRouter } from "~/server/api/routers/recipe";
import { tagRouter } from "~/server/api/routers/tag";

export const appRouter = router({
  recipe: recipeRouter,
  tag: tagRouter,
});

export type AppRouter = typeof appRouter;
