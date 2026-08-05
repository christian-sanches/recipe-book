import { NextRequest } from "next/server";
import spec from "../../../../recipe-book-api.json";
import { ensureUtf8 } from "../helpers";

// Exposes the REST API OpenAPI schema so it can be used as the
// ChatGPT Actions schema (or any other OpenAPI consumer). The server
// URL is pinned to NEXTAUTH_URL so it stays correct behind proxies
// and tunnels (req.nextUrl.origin reflects the internal Host header,
// e.g. 0.0.0.0:3000, when Cloudflare forwards the request).
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;

  const doc = {
    ...spec,
    servers: (spec.servers ?? []).map((server) => ({
      ...server,
      url: baseUrl,
    })),
  };

  return ensureUtf8(Response.json(doc));
}
