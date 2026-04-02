"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { UserRole } from "@/lib/enum";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const isManager = session?.user?.role === UserRole.MANAGER;
  const isSecretary = session?.user?.role === UserRole.SECRETARY;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          <Link href="/status">Status</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/parking">Parking</Link>
          {isSecretary && <Link href="/dashboard/users">Utilisateurs</Link>}
          {isSecretary && <Link href="/dashboard/reservations">Reservations</Link>}
          {isManager && <Link href="/dashboard/statistics">Statistiques</Link>}
          <Link href="/account">Mon compte</Link>
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
