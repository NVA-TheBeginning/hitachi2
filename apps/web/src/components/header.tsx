"use client";

import { UserRole } from "@hitachi2/db/enums";
import { Activity, BarChart2, CalendarCheck, Car, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
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
    visibleItems.filter(({ href }) => matchesPath(pathname, href)).sort((a, b) => b.href.length - a.href.length)[0]
      ?.href ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:h-14 sm:flex-nowrap sm:justify-between sm:px-6 sm:py-0">
        <span className="mr-auto select-none font-mono text-sm font-bold tracking-[0.2em] text-primary uppercase sm:mr-8">
          H2
        </span>
        <div className="ml-auto flex items-center gap-2 sm:order-3 sm:ml-4">
          <ModeToggle />
          <UserMenu />
        </div>
        <nav className="order-3 grid w-full min-w-0 grid-cols-2 gap-1 pb-1 sm:order-2 sm:flex sm:flex-1 sm:grid-cols-none sm:items-center sm:pb-0">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const isActive = activeHref === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex h-10 min-w-0 items-center justify-center gap-1.5 px-2 text-center text-xs font-medium transition-colors duration-150 hover:text-foreground sm:h-14 sm:shrink-0 sm:justify-start sm:px-3 sm:text-sm",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
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
      </div>
    </header>
  );
}
