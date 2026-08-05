import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/trpc/root";
import { createTRPCContext } from "~/trpc/init";
import { ensureUtf8 } from "../../helpers";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext(),
  }).then(ensureUtf8);

export { handler as GET, handler as POST };
