import { NextRequest } from "next/server";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { tools, type Session } from "~/mcp/tools";
import { env } from "~/env";
import { ensureUtf8 } from "../helpers";
import { verifyAccessToken } from "~/lib/mcp-oauth";

// ── Auth helpers ────────────────────────────────────────────────
async function resolveSession(req: NextRequest): Promise<Session | "unauthorized"> {
  // Extract bearer token from Authorization or X-API-Key header
  const apiKey =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-api-key");

  // If a credential header is present it MUST be valid, otherwise 401
  // (RFC 6750) so OAuth clients like ChatGPT know to re-authorize.
  if (apiKey) {
    // 1. Static API key (Cursor, Claude Code, curl, etc.)
    if (env.MCP_API_KEY && apiKey === env.MCP_API_KEY) {
      return {
        user: { id: "mcp-admin", role: "ADMIN", email: null },
      };
    }

    // 2. OAuth access token (ChatGPT dynamic client)
    const info = await verifyAccessToken(apiKey);
    if (info) {
      const user = await db.user.findUnique({ where: { id: info.userId } });
      if (user) {
        return {
          user: { id: user.id, role: user.role, email: user.email ?? null },
        };
      }
    }

    return "unauthorized";
  }

  // 3. No credential header → browser session cookie (web UI)
  const authSession = await auth();
  return {
    user: authSession?.user
      ? {
          id: authSession.user.id,
          role: authSession.user.role,
          email: authSession.user.email ?? null,
        }
      : null,
  };
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "WWW-Authenticate": 'Bearer realm="recipes.endless-point.org", error="invalid_token"',
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────
function createServer(session: Session) {
  // Filter tools based on auth — only show admin tools when user is admin
  const visibleTools = tools.filter(
    (t) => !t.requiresAdmin || (session.user?.role === "ADMIN"),
  );

  const server = new Server(
    { name: "Recipe Book MCP", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: visibleTools.map((t) => ({
      name: t.name,
      description: session.user?.role !== "ADMIN" && t.requiresAdmin
        ? `${t.description} (requires admin — not available without API key)`
        : t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Unknown tool: ${request.params.name}` }],
      };
    }

    // Enforce admin check
    if (tool.requiresAdmin && session.user?.role !== "ADMIN") {
      return {
        isError: true,
        content: [{
          type: "text" as const,
          text: "Forbidden: admin privileges required. Sign in with Google or provide a valid OAuth token / MCP_API_KEY via the Authorization: Bearer header.",
        }],
      };
    }

    try {
      const result = await tool.handler(
        (request.params.arguments ?? {}) as Record<string, unknown>,
        db,
        session,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      };
    }
  });

  return server;
}

// ── Handler ─────────────────────────────────────────────────────
async function handleMCPRequest(req: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,      // JSON in, JSON out
  });

  const session = await resolveSession(req);
  if (session === "unauthorized") {
    return unauthorizedResponse();
  }

  const server = createServer(session);
  await server.connect(transport);

  return ensureUtf8(await transport.handleRequest(req));
}

// ── Route Exports ───────────────────────────────────────────────
export const POST = handleMCPRequest;
export const GET = handleMCPRequest;
export const DELETE = handleMCPRequest;
