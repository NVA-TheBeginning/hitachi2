import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";

export default async function RootPage() {
  const session = await getServerSession();

  redirect(session?.data?.user ? "/dashboard" : "/login");
}
