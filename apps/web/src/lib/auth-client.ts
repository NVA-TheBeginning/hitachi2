import type { auth } from "@hitachi2/auth";
import { env } from "@hitachi2/env/web";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export async function getServerSession() {
  const { headers } = await import("next/headers");
  return authClient.getSession({
    fetchOptions: { headers: Object.fromEntries(await headers()) },
  });
}
