"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Receptionist portal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-primary print:hidden md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 px-1 pt-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary-foreground" : "text-primary-foreground/70 hover:text-primary-foreground",
              )}
            >
              <Icon size={20} aria-hidden />
              <span className="w-full truncate text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}