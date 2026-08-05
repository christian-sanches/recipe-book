import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "~/server/db";
import { MCP_SCOPE, jsonResponse, oauthError } from "~/lib/mcp-oauth";

// POST /api/mcp/register — RFC 7591 dynamic client registration.
// ChatGPT registers itself here before starting the OAuth flow.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return oauthError("invalid_client_metadata", "Request body must be valid JSON");
  }

  // Validate redirect_uris (required by RFC 7591)
  const rawUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (rawUris.length === 0) {
    return oauthError("invalid_client_metadata", "redirect_uris is required and must be a non-empty array");
  }
  const redirectUris: string[] = [];
  for (const uri of rawUris) {
    try {
      const url = new URL(uri);
      if (url.protocol !== "https:" && url.hostname !== "localhost") {
        return oauthError("invalid_client_metadata", `redirect_uri must be https: ${uri}`);
      }
      redirectUris.push(uri);
    } catch {
      return oauthError("invalid_client_metadata", `Invalid redirect_uri: ${uri}`);
    }
  }

  const grantTypes = Array.isArray(body.grant_types)
    ? body.grant_types.filter((g): g is string => typeof g === "string")
    : ["authorization_code", "refresh_token"];
  const responseTypes = Array.isArray(body.response_types)
    ? body.response_types.filter((r): r is string => typeof r === "string")
    : ["code"];

  const clientId = randomBytes(16).toString("hex");
  const clientName = typeof body.client_name === "string" ? body.client_name : null;
  const clientUri = typeof body.client_uri === "string" ? body.client_uri : null;
  const scope = typeof body.scope === "string" ? body.scope : MCP_SCOPE;

  await db.oAuthClient.create({
    data: {
      clientId,
      redirectUris,
      grantTypes,
      responseTypes,
      clientName,
      clientUri,
      scope,
    },
  });

  return jsonResponse(
    {
      client_id: clientId,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: "none", // public client — PKCE only
      client_name: clientName,
      client_uri: clientUri,
      scope,
    },
    201,
  );
}
