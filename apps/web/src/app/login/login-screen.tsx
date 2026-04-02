"use client";

import { useState } from "react";
import RoleLogin from "@/components/role-login";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

type View = "picker" | "signin" | "signup";

export default function LoginScreen() {
  const [view, setView] = useState<View>("picker");

  if (view === "signin") {
    return <SignInForm onSwitchToSignUp={() => setView("signup")} />;
  }

  if (view === "signup") {
    return <SignUpForm onSwitchToSignIn={() => setView("signin")} />;
  }

  return <RoleLogin onManualLogin={() => setView("signin")} />;
}
