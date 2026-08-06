import { NextRequest } from "next/server";
import { db } from "~/server/db";
import {
  issueTokens,
  isValidPkceVerifier,
  jsonResponse,
  oauthError,
  pkceChallenge,
} from "~/lib/mcp-oauth";

// POST /api/mcp/token — OAuth 2.0 token endpoint.
// Supports authorization_code (with PKCE) and refresh_token grants.
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let body: URLSearchParams;
  try {
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

  const grantType = body.get("grant_type");
  const clientId = body.get("client_id");
  if (!clientId) {
    return oauthError("invalid_client", "Missing client_id");
  }
  const client = await db.oAuthClient.findUnique({ where: { clientId } });
  if (!client) {
    return oauthError("invalid_client", "Unknown client_id");
  }

  if (grantType === "authorization_code") {
    const code = body.get("code");
    const codeVerifier = body.get("code_verifier");
    const redirectUri = body.get("redirect_uri");

    if (!code || !codeVerifier) {
      return oauthError("invalid_grant", "Missing code or code_verifier");
    }

    const record = await db.oAuthAuthorizationCode.findUnique({ where: { code } });
    if (!record || record.clientId !== clientId || record.expiresAt.getTime() < Date.now()) {
      return oauthError("invalid_grant", "Invalid or expired authorization code");
    }
    if (redirectUri && record.redirectUri !== redirectUri) {
      return oauthError("invalid_grant", "redirect_uri does not match the authorization request");
    }
    if (!isValidPkceVerifier(codeVerifier)) {
      return oauthError("invalid_grant", "code_verifier must be 43-128 chars of [A-Za-z0-9-._~]");
    }
    // RFC 7636: S256(code_verifier) must equal the stored challenge
    if (pkceChallenge(codeVerifier) !== record.codeChallenge) {
      return oauthError("invalid_grant", "PKCE verification failed");
    }

    // Single-use code
    await db.oAuthAuthorizationCode.delete({ where: { code } });

    const tokens = await issueTokens(clientId, record.userId, record.scopes);
    return jsonResponse(tokens);
  }

  if (grantType === "refresh_token") {
    const refreshToken = body.get("refresh_token");
    if (!refreshToken) {
      return oauthError("invalid_grant", "Missing refresh_token");
    }

    const record = await db.oAuthRefreshToken.findUnique({ where: { token: refreshToken } });
    if (!record || record.clientId !== clientId || record.expiresAt.getTime() < Date.now()) {
      return oauthError("invalid_grant", "Invalid or expired refresh token");
    }

    // RFC 9700 grace period: if this token was already rotated but very
    // recently (concurrent refresh race — ChatGPT's connector fires
    // duplicate refreshes), follow the chain to the current token and
    // return it idempotently instead of killing the client with
    // invalid_grant. Reuse outside the grace window stays rejected.
    const GRACE_MS = 60 * 1000;
    if (record.revokedAt) {
      if (record.revokedAt.getTime() + GRACE_MS < Date.now() || !record.replacedByToken) {
        return oauthError("invalid_grant", "Refresh token has been revoked (reuse detected)");
      }

      let current = record;
      const seen = new Set<string>([current.token]);
      while (current.revokedAt) {
        if (current.revokedAt.getTime() + GRACE_MS < Date.now() || !current.replacedByToken) {
          return oauthError("invalid_grant", "Refresh token chain is stale");
        }
        const next = await db.oAuthRefreshToken.findUnique({
          where: { token: current.replacedByToken },
        });
        if (!next || seen.has(next.token)) {
          return oauthError("invalid_grant", "Invalid refresh token chain");
        }
        seen.add(next.token);
        current = next;
      }

      if (current.expiresAt.getTime() < Date.now()) {
        return oauthError("invalid_grant", "Invalid or expired refresh token");
      }
      if (!current.accessToken) {
        return oauthError("invalid_grant", "Refresh token chain is incomplete");
      }

      // Idempotent: return the current valid pair without rotating again.
      const activeAccess = await db.oAuthAccessToken.findUnique({
        where: { token: current.accessToken },
      });
      return jsonResponse({
        access_token: current.accessToken,
        token_type: "bearer",
        expires_in: activeAccess
          ? Math.max(1, Math.floor((activeAccess.expiresAt.getTime() - Date.now()) / 1000))
          : 3600,
        refresh_token: current.token,
        scope: current.scopes.join(" "),
      });
    }

    // Normal rotation: revoke the old refresh token, issue a fresh pair
    const tokens = (await issueTokens(clientId, record.userId, record.scopes)) as {
      access_token: string;
      refresh_token: string;
    };
    await db.oAuthRefreshToken.update({
      where: { token: refreshToken },
      data: { revokedAt: new Date(), replacedByToken: tokens.refresh_token },
    });

    return jsonResponse(tokens);
  }

  return oauthError("unsupported_grant_type", `Unsupported grant_type: ${grantType ?? "(none)"}`);
}
