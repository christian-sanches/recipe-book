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

// ── Helpers ────────────────────────────────────────────────────
function createServer(session: Session) {
  const server = new Server(
    { name: "Recipe Book MCP", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
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
  const authSession = await auth();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,      // JSON in, JSON out
  });

  const session: Session = {
    user: authSession?.user
      ? {
          id: authSession.user.id,
          role: authSession.user.role,
          email: authSession.user.email ?? null,
        }
      : null,
  };

  const server = createServer(session);
  await server.connect(transport);

  return transport.handleRequest(req);
}

// ── Route Exports ───────────────────────────────────────────────
export const POST = handleMCPRequest;
export const GET = handleMCPRequest;
export const DELETE = handleMCPRequest;
