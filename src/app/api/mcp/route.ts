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

// ── Auth helpers ────────────────────────────────────────────────
function resolveSession(req: NextRequest): Promise<Session> {
  // 1. Try API key (for AI clients like Cursor, Claude Code, etc.)
  const apiKey =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-api-key");

  if (apiKey && env.MCP_API_KEY && apiKey === env.MCP_API_KEY) {
    return Promise.resolve({
      user: {
        id: "mcp-admin",
        role: "ADMIN",
        email: null,
      },
    });
  }

  // 2. Fall back to browser session cookie (for web UI)
  return auth().then((authSession) => ({
    user: authSession?.user
      ? {
          id: authSession.user.id,
          role: authSession.user.role,
          email: authSession.user.email ?? null,
        }
      : null,
  }));
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
          text: "Forbidden: admin privileges required. Set an MCP_API_KEY in your .env.local and pass it via Authorization: Bearer <key> header.",
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
  const server = createServer(session);
  await server.connect(transport);

  return transport.handleRequest(req);
}

// ── Route Exports ───────────────────────────────────────────────
export const POST = handleMCPRequest;
export const GET = handleMCPRequest;
export const DELETE = handleMCPRequest;
