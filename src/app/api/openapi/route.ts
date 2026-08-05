import { NextRequest } from "next/server";
import spec from "../../../../recipe-book-api.json";
import { ensureUtf8 } from "../helpers";

// Exposes the REST API OpenAPI schema so it can be used as the
// ChatGPT Actions schema (or any other OpenAPI consumer). The server
// URL is overridden with the request origin so it works in any env.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  const doc = {
    ...spec,
    servers: (spec.servers ?? []).map((server) => ({
      ...server,
      url: origin,
    })),
  };

  return ensureUtf8(Response.json(doc));
}
