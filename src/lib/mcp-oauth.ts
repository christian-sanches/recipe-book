import { createHash, randomBytes } from "node:crypto";
import { db } from "~/server/db";

export const MCP_SCOPE = "mcp:tools";
// 24h: reduces refresh churn and 401-after-idle windows. ChatGPT's connector
// is known to break connections after idle; a longer-lived access token
// means a still-valid token on reconnect (no refresh needed).
const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function baseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

// RFC 7636 S256: base64url(SHA-256(code_verifier))
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function isValidPkceVerifier(v: string): boolean {
  return /^[A-Za-z0-9\-._~]{43,128}$/.test(v);
}

export type TokenInfo = {
  token: string;
  clientId: string;
  scopes: string[];
  userId: string;
  expiresAt: number;
};

export async function verifyAccessToken(token: string): Promise<TokenInfo | null> {
  const record = await db.oAuthAccessToken.findUnique({ where: { token } });
  if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
    return null;
  }
  return {
    token: record.token,
    clientId: record.clientId,
    scopes: record.scopes,
    userId: record.userId,
    expiresAt: record.expiresAt.getTime(),
  };
}

export async function issueTokens(
  clientId: string,
  userId: string,
  scopes: string[],
): Promise<Record<string, unknown>> {
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const now = Date.now();

  await db.oAuthAccessToken.create({
    data: {
      token: accessToken,
      clientId,
      scopes,
      userId,
      expiresAt: new Date(now + ACCESS_TOKEN_TTL_MS),
    },
  });
  await db.oAuthRefreshToken.create({
    data: {
      token: refreshToken,
      clientId,
      scopes,
      userId,
      expiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
      // link the access token issued in the same grant so an idempotent
      // grace-period refresh can return the matching pair (RFC 9700)
      accessToken,
    },
  });

  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: ACCESS_TOKEN_TTL_MS / 1000,
    refresh_token: refreshToken,
    scope: scopes.join(" "),
  };
}

// RFC 8414 authorization server metadata (ChatGPT fetches this to
// discover the OAuth endpoints for an MCP server).
export function authorizationServerMetadata(): Record<string, unknown> {
  const base = baseUrl();
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/mcp/authorize`,
    token_endpoint: `${base}/api/mcp/token`,
    registration_endpoint: `${base}/api/mcp/register`,
    revocation_endpoint: `${base}/api/mcp/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [MCP_SCOPE],
  };
}

// RFC 9728 protected resource metadata for the MCP endpoint.
export function protectedResourceMetadata(): Record<string, unknown> {
  const base = baseUrl();
  return {
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function oauthError(error: string, description: string, status = 400): Response {
  return jsonResponse(
    { error, error_description: description },
    status,
  );
}
