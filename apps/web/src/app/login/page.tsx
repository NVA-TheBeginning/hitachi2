import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-client";

import LoginScreen from "./login-screen";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session.data?.user) {
    redirect("/dashboard");
  }

  return <LoginScreen />;
}
