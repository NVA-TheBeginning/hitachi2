import { redirect } from "next/navigation";

import { client } from "@/utils/orpc";

import LoginScreen from "./login-screen";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await client.getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginScreen />;
}
