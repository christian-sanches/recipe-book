import { db } from "~/server/db";
import { slugify } from "~/lib/utils";
import {
  resolveApiSession,
  requireAdmin,
  errorResponse,
  successResponse,
} from "../helpers";

// GET /api/tags — list all tags
export async function GET() {
  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { recipes: true } } },
  });
  return successResponse(tags);
}

// POST /api/tags — create a tag (admin only)
export async function POST(req: Request) {
  const session = await resolveApiSession(req);
  try {
    requireAdmin(session);
  } catch {
    return errorResponse(403, "Admin privileges required. Pass your API key.");
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  if (!body.name?.trim()) {
    return errorResponse(400, "name is required");
  }

  const slug = slugify(body.name);
  const existing = await db.tag.findUnique({ where: { slug } });
  if (existing) {
    return successResponse(existing);
  }

  const tag = await db.tag.create({ data: { name: body.name, slug } });
  return successResponse(tag, 201);
}
