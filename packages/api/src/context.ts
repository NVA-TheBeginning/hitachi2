import type { IncomingHttpHeaders } from "node:http";

import { auth } from "@hitachi2/auth";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(req: IncomingHttpHeaders) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req),
  });
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
