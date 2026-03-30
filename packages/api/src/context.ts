import type { IncomingHttpHeaders } from "node:http";

import { auth } from "@hitachi2/auth";
import { fromNodeHeaders } from "better-auth/node";

export interface JobQueue {
  send<T extends object>(name: string, data: T): Promise<string | null>;
}

export async function createContext(req: IncomingHttpHeaders, jobQueue: JobQueue) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req),
  });
  return {
    session,
    jobQueue,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
