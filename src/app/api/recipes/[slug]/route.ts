import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { generateSlug } from "~/lib/utils";
import {
  resolveApiSession,
  requireAdmin,
  errorResponse,
  successResponse,
} from "../../helpers";

// GET /api/recipes/[slug] — get recipe by slug
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const recipe = await db.recipe.findUnique({
    where: { slug },
    include: {
      tags: { include: { tag: true } },
      author: { select: { id: true, name: true, image: true } },
    },
  });

  if (!recipe) {
    return errorResponse(404, "Recipe not found");
  }

  if (recipe.visibility === "HIDDEN" && !(await resolveApiSession(_req)).user) {
    return errorResponse(404, "Recipe not found");
  }

  return successResponse(recipe);
}

// PATCH /api/recipes/[slug] — update recipe (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await resolveApiSession(req);
  try {
    requireAdmin(session);
  } catch {
    return errorResponse(403, "Admin privileges required. Pass your API key.");
  }

  const { slug } = await params;
  const existing = await db.recipe.findUnique({ where: { slug } });
  if (!existing) {
    return errorResponse(404, "Recipe not found");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const data: Record<string, unknown> = {};

  if (body.title) {
    data.title = body.title;
    data.slug = generateSlug(body.title as string);
  }
  if (body.cooklangContent !== undefined) data.cooklangContent = body.cooklangContent;
  if (body.description !== undefined) data.description = body.description;
  if (body.servings !== undefined) data.servings = body.servings;
  if (body.prepTime !== undefined) data.prepTime = body.prepTime;
  if (body.cookTime !== undefined) data.cookTime = body.cookTime;
  if (body.totalTime !== undefined) data.totalTime = body.totalTime;
  if (body.source !== undefined) data.source = body.source;
  if (body.visibility !== undefined) data.visibility = body.visibility;

  // Handle tags update
  if (body.tags !== undefined) {
    await db.recipeTag.deleteMany({ where: { recipeId: existing.id } });

    const tagIds: string[] = [];
    for (const tag of body.tags as string[]) {
      const existingTag = await db.tag.findFirst({
        where: { OR: [{ id: tag }, { slug: tag }] },
      });
      if (existingTag) {
        tagIds.push(existingTag.id);
      } else {
        const newTag = await db.tag.create({
          data: { name: tag, slug: tag.toLowerCase().replace(/\s+/g, "-") },
        });
        tagIds.push(newTag.id);
      }
    }

    await db.recipe.update({
      where: { id: existing.id },
      data: {
        tags: {
          create: tagIds.map((id) => ({ tag: { connect: { id } } })),
        },
      },
    });
  }

  const recipe = await db.recipe.update({
    where: { id: existing.id },
    data: data as any,
    include: {
      tags: { include: { tag: true } },
      author: { select: { id: true, name: true, image: true } },
    },
  });

  return successResponse(recipe);
}

// DELETE /api/recipes/[slug] — delete recipe (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await resolveApiSession(req);
  try {
    requireAdmin(session);
  } catch {
    return errorResponse(403, "Admin privileges required. Pass your API key.");
  }

  const { slug } = await params;
  const existing = await db.recipe.findUnique({ where: { slug } });
  if (!existing) {
    return errorResponse(404, "Recipe not found");
  }

  await db.recipe.delete({ where: { id: existing.id } });
  return successResponse({ success: true, slug });
}
