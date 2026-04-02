"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import RoleLogin from "@/components/role-login";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";

type View = "picker" | "signin" | "signup";

export default function LoginScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [view, setView] = useState<View>("picker");

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (isPending || session) return <Loader />;

  if (view === "signin") {
    return <SignInForm onSwitchToSignUp={() => setView("signup")} />;
  }

  if (view === "signup") {
    return <SignUpForm onSwitchToSignIn={() => setView("signin")} />;
  }

  return <RoleLogin onManualLogin={() => setView("signin")} />;
}
