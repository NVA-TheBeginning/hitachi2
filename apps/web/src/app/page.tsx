import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-client";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await getServerSession();

  redirect(session.data?.user ? "/dashboard" : "/login");
}
