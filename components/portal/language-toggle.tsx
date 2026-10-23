"use client";

import { useI18n } from "@/lib/i18n/locale-provider";
import { Globe } from "lucide-react";

const LABELS: Record<string, string> = { en: "EN", ar: "AR" };

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  const next = locale === "en" ? "ar" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-pressed={locale === "ar"}
      aria-label={LABELS[locale]}
      title={LABELS[locale]}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    >
      <Globe size={14} aria-hidden />
      <span>{LABELS[locale]}</span>
    </button>
  );
}
