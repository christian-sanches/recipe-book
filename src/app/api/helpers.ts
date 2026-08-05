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

// Ensure every JSON response declares UTF-8 so accented/special
// characters are not mis-decoded by clients.
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: JSON_HEADERS });
}

export function successResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: JSON_HEADERS });
}

// Re-wrap an existing Response to append `; charset=utf-8` to its
// Content-Type when it is missing (used by the tRPC/MCP handlers).
export function ensureUtf8(res: Response): Response {
  const headers = new Headers(res.headers);
  const contentType = headers.get("content-type") ?? "application/json";
  if (!/;\s*charset=/i.test(contentType)) {
    headers.set("content-type", `${contentType}; charset=utf-8`);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
