"use client";

import { ArrowLeft, Briefcase, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

type Role = "EMPLOYEE" | "MANAGER" | "SECRETARY";

interface TestUser {
  name: string;
  email: string;
}

const TEST_USERS: Record<Role, TestUser[]> = {
  EMPLOYEE: [
    { name: "Ken", email: "ken@test.com" },
    { name: "Ron", email: "ron@test.com" },
    { name: "Lenn", email: "lenn@test.com" },
  ],
  MANAGER: [
    { name: "Alice", email: "alice@test.com" },
    { name: "Bob", email: "bob@test.com" },
    { name: "Carol", email: "carol@test.com" },
  ],
  SECRETARY: [
    { name: "Dave", email: "dave@test.com" },
    { name: "Eve", email: "eve@test.com" },
    { name: "Frank", email: "frank@test.com" },
  ],
};

const ROLE_META: Record<Role, { label: string; description: string; icon: React.ReactNode }> = {
  EMPLOYEE: {
    label: "Employee",
    description: "Make parking reservations",
    icon: <Users className="size-5" />,
  },
  MANAGER: {
    label: "Manager",
    description: "Manage team and spots",
    icon: <Briefcase className="size-5" />,
  },
  SECRETARY: {
    label: "Secretary",
    description: "Handle admin tasks",
    icon: <Shield className="size-5" />,
  },
};

export default function RoleLogin({ onManualLogin }: { onManualLogin: () => void }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loggingInEmail, setLoggingInEmail] = useState<string | null>(null);

  async function handleQuickLogin(email: string) {
    setLoggingInEmail(email);
    await authClient.signIn.email(
      { email, password: "Password123!" },
      {
        onSuccess: () => {
          router.push("/dashboard");
          toast.success("Sign in successful");
        },
        onError: (error) => {
          toast.error(error.error.message || error.error.statusText);
          setLoggingInEmail(null);
        },
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Quick Login</h1>
        <p className="text-muted-foreground mt-2 text-sm">Select a role and choose a test account</p>
      </div>

      {selectedRole === null ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(Object.keys(ROLE_META) as Role[]).map((role) => {
              const meta = ROLE_META[role];
              return (
                <Card
                  key={role}
                  className="cursor-pointer transition-shadow hover:ring-2 hover:ring-primary"
                  onClick={() => setSelectedRole(role)}
                >
                  <CardHeader>
                    <div className="text-primary mb-1">{meta.icon}</div>
                    <CardTitle className="text-base">{meta.label}</CardTitle>
                    <CardDescription>{meta.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-xs">{TEST_USERS[role].map((u) => u.name).join(", ")}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Button variant="link" onClick={onManualLogin}>
              Use email & password instead
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedRole(null)} disabled={loggingInEmail !== null}>
              <ArrowLeft className="mr-1 size-4" />
              Back
            </Button>
            <h2 className="text-lg font-semibold">{ROLE_META[selectedRole].label} Accounts</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TEST_USERS[selectedRole].map((user) => {
              const isLoggingIn = loggingInEmail === user.email;
              const isDisabled = loggingInEmail !== null;
              return (
                <Card key={user.email} size="sm">
                  <CardHeader>
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center text-sm font-bold">
                      {user.name[0]}
                    </div>
                    <CardTitle>{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    {isLoggingIn ? (
                      <Skeleton className="h-8 w-full" />
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isDisabled}
                        onClick={() => handleQuickLogin(user.email)}
                      >
                        Login as {user.name}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
