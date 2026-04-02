import { redirect } from "next/navigation";

import { client } from "@/utils/orpc";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await client.getSession();

  redirect(session?.user ? "/dashboard" : "/login");
}
