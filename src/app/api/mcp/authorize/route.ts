import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { MCP_SCOPE, baseUrl } from "~/lib/mcp-oauth";

// GET /api/mcp/authorize — OAuth 2.0 authorization endpoint.
//
// ChatGPT opens this URL in a browser. If the user is already logged
// into the web app, we issue a code immediately. Otherwise we bounce
// them to /login (Google sign-in) with the full authorize URL as the
// callbackUrl so Auth.js brings them back here with a session.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const responseType = params.get("response_type");
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");
  const state = params.get("state");
  const scope = params.get("scope");

  if (responseType !== "code" || !clientId || !redirectUri || !codeChallenge) {
    return renderError(
      "Invalid authorization request",
      "Missing required parameters: response_type=code, client_id, redirect_uri, code_challenge.",
    );
  }
  if (codeChallengeMethod && codeChallengeMethod !== "S256") {
    return renderError(
      "Unsupported code_challenge_method",
      "Only S256 is supported (RFC 7636).",
    );
  }

  const client = await db.oAuthClient.findUnique({ where: { clientId } });
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return renderError(
      "Invalid client",
      "The client_id or redirect_uri is not registered with this server.",
    );
  }

  const session = await auth();
  if (!session?.user) {
    // Not logged in — send the user through the existing Google sign-in,
    // preserving this exact authorize request as the callback target.
    // NOTE: rebuild the URL from baseUrl() because req.nextUrl.href
    // carries the internal Host (0.0.0.0:3000) behind the tunnel.
    const authorizeUrl = new URL("/api/mcp/authorize", baseUrl());
    for (const [k, v] of params.entries()) {
      authorizeUrl.searchParams.set(k, v);
    }
    const loginUrl = new URL("/login", baseUrl());
    loginUrl.searchParams.set("callbackUrl", authorizeUrl.toString());
    return Response.redirect(loginUrl.toString(), 302);
  }

  // Authorized — issue a single-use, short-lived authorization code.
  const code = randomBytes(24).toString("base64url");
  await db.oAuthAuthorizationCode.create({
    data: {
      code,
      clientId,
      codeChallenge,
      redirectUri,
      scopes: scope ? scope.split(/\s+/) : [MCP_SCOPE],
      userId: session.user.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) {
    target.searchParams.set("state", state);
  }
  return Response.redirect(target.toString(), 302);
}

function renderError(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#fff;border-radius:12px;padding:32px 40px;max-width:480px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  h1{font-size:20px;margin:0 0 8px}.err{color:#cf1322;font-size:14px;font-weight:600;margin-bottom:8px}
  p{color:#666;font-size:14px;line-height:1.5;margin:0}
</style></head>
<body><div class="card"><div class="err">⚠️ ${title}</div><h1>Authorization failed</h1><p>${message}</p></div></body>
</html>`;
  return new Response(html, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
