"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

export function PortalName({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <p className={cn("text-xs font-medium uppercase tracking-wider", className ?? "text-muted-foreground")}>
      {t("portal.name")}
    </p>
  );
}
