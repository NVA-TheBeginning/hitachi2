"use client";

import { Activity, BarChart2, CalendarCheck, Car, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { UserRole } from "@/lib/enum";
import { cn } from "@/lib/utils";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const NAV_ITEMS = [
  { href: "/status", label: "Status", icon: Activity, role: null },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, role: null },
  { href: "/parking", label: "Parking", icon: Car, role: null },
  { href: "/dashboard/users", label: "Utilisateurs", icon: Users, role: UserRole.SECRETARY },
  { href: "/dashboard/reservations", label: "Réservations", icon: CalendarCheck, role: UserRole.SECRETARY },
  { href: "/dashboard/statistics", label: "Statistiques", icon: BarChart2, role: UserRole.MANAGER },
] as const;

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role;

  const visibleItems = NAV_ITEMS.filter(({ role }) => !role || userRole === role);
  const activeHref =
    visibleItems
      .filter(({ href }) => matchesPath(pathname, href))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <header className="h-14 backdrop-blur-sm bg-background/90 border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-6">
        <span className="font-mono text-sm font-bold tracking-[0.2em] text-primary uppercase select-none mr-8">H2</span>
        <nav className="flex items-center gap-1 flex-1">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const isActive = activeHref === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 h-14 text-sm font-medium transition-colors duration-150 hover:text-foreground",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-200",
                    isActive ? "w-full" : "w-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 ml-4">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
