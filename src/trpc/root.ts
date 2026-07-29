import { router } from "~/trpc/init";
import { recipeRouter } from "~/trpc/routers/recipe";
import { tagRouter } from "~/trpc/routers/tag";

export const appRouter = router({
  recipe: recipeRouter,
  tag: tagRouter,
});

export type AppRouter = typeof appRouter;
