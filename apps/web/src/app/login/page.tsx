import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";

import LoginScreen from "./login-screen";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginScreen />;
}
