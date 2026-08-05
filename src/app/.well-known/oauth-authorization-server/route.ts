import { authorizationServerMetadata } from "~/lib/mcp-oauth";

// GET /.well-known/oauth-authorization-server — RFC 8414 discovery.
// ChatGPT uses this to find the OAuth endpoints for the MCP server.
export async function GET() {
  return Response.json(authorizationServerMetadata(), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
