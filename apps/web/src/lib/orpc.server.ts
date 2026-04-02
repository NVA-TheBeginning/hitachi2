import "server-only";

import { createContext } from "@hitachi2/api/context";
import type { AppRouterClient } from "@hitachi2/api/routers/index";
import { appRouter } from "@hitachi2/api/routers/index";
import { createRouterClient } from "@orpc/server";
import { headers } from "next/headers";

declare global {
  var $orpcClient: AppRouterClient | undefined;
}

export const client: AppRouterClient =
  globalThis.$orpcClient ??
  createRouterClient(appRouter, {
    context: async () => {
      const headersList = await headers();
      return createContext(Object.fromEntries(headersList.entries()));
    },
  });
