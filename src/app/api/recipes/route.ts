import { db } from "~/server/db";
import { generateSlug } from "~/lib/utils";
import {
  resolveApiSession,
  requireAdmin,
  errorResponse,
  successResponse,
} from "../helpers";

// GET /api/recipes — list recipes
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("query");
  const tagSlugs = url.searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const session = await resolveApiSession(req);
  const where: Record<string, unknown> = {};

  if (!session.user) {
    where.visibility = "PUBLIC";
  }

  if (tagSlugs.length > 0) {
    where.tags = {
      some: {
        tag: { slug: { in: tagSlugs } },
      },
    };
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { cooklangContent: { contains: query, mode: "insensitive" } },
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
      take: limit,
      skip: offset,
    }),
    db.recipe.count({ where }),
  ]);

  return successResponse({ items, total, limit, offset });
}

// POST /api/recipes — create recipe (admin only)
export async function POST(req: Request) {
  const session = await resolveApiSession(req);
  try {
    requireAdmin(session);
  } catch {
    return errorResponse(403, "Admin privileges required. Pass your API key.");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const title = body.title as string;
  if (!title?.trim()) {
    return errorResponse(400, "title is required");
  }

  const slug = generateSlug(title);

  // Resolve tags: can be tag IDs or tag names
  let tagIds: string[] | undefined;
  const rawTags = body.tags;
  if (Array.isArray(rawTags) && rawTags.length > 0) {
    tagIds = [];
    for (const tag of rawTags) {
      const t = tag as string;
      // Check if it's an existing ID
      const existing = await db.tag.findFirst({
        where: { OR: [{ id: t }, { slug: t }] },
      });
      if (existing) {
        tagIds.push(existing.id);
      } else {
        // Create new tag
        const newTag = await db.tag.create({
          data: { name: t, slug: t.toLowerCase().replace(/\s+/g, "-") },
        });
        tagIds.push(newTag.id);
      }
    }
  }

  const recipe = await db.recipe.create({
    data: {
      title,
      slug,
      cooklangContent: (body.cooklangContent as string) ?? "",
      description: (body.description as string) ?? null,
      servings: (body.servings as number) ?? null,
      prepTime: (body.prepTime as number) ?? null,
      cookTime: (body.cookTime as number) ?? null,
      totalTime: (body.totalTime as number) ?? null,
      source: (body.source as string) ?? null,
      image: (body.image as string) ?? null,
      visibility: (body.visibility as "PUBLIC" | "HIDDEN") ?? "PUBLIC",
      authorId: session.user!.id,
      tags: tagIds
        ? { create: tagIds.map((id) => ({ tag: { connect: { id } } })) }
        : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      author: { select: { id: true, name: true, image: true } },
    },
  });

  return successResponse(recipe, 201);
}
