"use client";
import type { Route } from "next";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const isManager = session?.user?.role === "MANAGER";

  const links: ReadonlyArray<{ to: Route; label: string }> = [
    { to: "/status", label: "Status" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/parking" as Route, label: "Parking" },
    ...(isManager ? [{ to: "/dashboard/statistics" as Route, label: "Statistiques" }] : []),
    { to: "/account", label: "Mon compte" },
  ];

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {(session ? links : []).map(({ to, label }) => {
            return (
              <Link key={to} href={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
