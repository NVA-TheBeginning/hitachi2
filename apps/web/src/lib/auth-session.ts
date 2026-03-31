import { headers } from "next/headers";

import { authClient } from "./auth-client";

export async function getServerSession() {
  return authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });
}
