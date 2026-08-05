import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { oauthError, jsonResponse } from "~/lib/mcp-oauth";

// POST /api/mcp/revoke — RFC 7009 token revocation.
// Public client: the token itself is the credential, so we accept it
// in the request body (no client authentication required).
export async function POST(req: NextRequest) {
  let body: URLSearchParams;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const json = (await req.json()) as Record<string, unknown>;
      body = new URLSearchParams();
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === "string") body.set(k, v);
      }
    } else {
      body = new URLSearchParams(await req.text());
    }
  } catch {
    return oauthError("invalid_request", "Could not parse request body");
  }

  const token = body.get("token");
  if (!token) {
    return oauthError("invalid_request", "Missing token");
  }

  const now = new Date();
  const [access, refresh] = await Promise.all([
    db.oAuthAccessToken.findUnique({ where: { token } }),
    db.oAuthRefreshToken.findUnique({ where: { token } }),
  ]);

  if (access) {
    await db.oAuthAccessToken.update({ where: { token }, data: { revokedAt: now } });
  } else if (refresh) {
    await db.oAuthRefreshToken.update({ where: { token }, data: { revokedAt: now } });
  }

  // RFC 7009: return 200 even if the token was unknown/invalid
  return jsonResponse({}, 200);
}
