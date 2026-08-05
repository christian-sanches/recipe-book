import { protectedResourceMetadata } from "~/lib/mcp-oauth";

// GET /.well-known/oauth-protected-resource — RFC 9728 resource metadata.
// Points OAuth clients at the MCP endpoint and its authorization server.
export async function GET() {
  return Response.json(protectedResourceMetadata(), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
