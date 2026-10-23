"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  CalendarClock,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";

const ITEMS: { href: string; labelKey: MessageKey; icon: typeof CalendarCheck }[] = [
  { href: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
  { href: "/profile", labelKey: "nav.profile", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label={t("nav.navLabel")} className="flex flex-col gap-1 overflow-visible p-2">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon size={16} aria-hidden />
            <span className="whitespace-nowrap">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}