import type { IncomingHttpHeaders } from "node:http";
import type { JobQueue } from "@api/types";
import { auth } from "@hitachi2/auth";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(req: IncomingHttpHeaders, jobQueue?: JobQueue) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req),
  });
  return {
    session,
    jobQueue: jobQueue ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
