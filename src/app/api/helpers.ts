import { db } from "~/server/db";
import { env } from "~/env";

export type ApiSession = {
  user: {
    id: string;
    role: string;
    email: string | null;
  } | null;
};

let cachedApiUser: { id: string } | null = null;

async function getApiUser(): Promise<{ id: string }> {
  if (cachedApiUser) return cachedApiUser;

  // Find the first admin user in the DB to use as the API author
  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (admin) {
    cachedApiUser = admin;
    return admin;
  }

  // Fallback: create a dedicated API user
  const user = await db.user.create({
    data: {
      id: "api-system-user",
      email: "api@recipes.endless-point.org",
      name: "API Admin",
      role: "ADMIN",
    },
  });
  cachedApiUser = user;
  return user;
}

export async function resolveApiSession(req: Request): Promise<ApiSession> {
  const apiKey =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-api-key");

  if (apiKey && env.MCP_API_KEY && apiKey === env.MCP_API_KEY) {
    const user = await getApiUser();
    return {
      user: { id: user.id, role: "ADMIN", email: "api@recipes.endless-point.org" },
    };
  }

  return { user: null };
}

export function requireAdmin(session: ApiSession): void {
  if (session.user?.role !== "ADMIN") {
    throw new Error("Forbidden: admin privileges required. Use your API key.");
  }
}

export function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export function successResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
