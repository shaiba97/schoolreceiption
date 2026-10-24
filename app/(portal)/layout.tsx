import { BottomNav } from "@/components/portal/bottom-nav";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { PortalName } from "@/components/portal/portal-name";
import { TenantLockedNotice } from "@/components/portal/tenant-locked-notice";
import { Sidebar } from "@/components/portal/sidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TenantLockedNotice />
      {/* Desktop: deep-navy rail anchors navigation, content canvas stays light */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground print:hidden lg:flex">
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-5">
          <PortalName className="text-sidebar-foreground/70" />
          <LanguageToggle className="border-sidebar-ring/50 hover:bg-sidebar-hover hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring/60 focus-visible:ring-offset-sidebar" />
        </div>
        <Sidebar />
      </aside>
      {/* Mobile: white header over the light canvas */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-card px-4 print:hidden md:hidden">
        <PortalName />
        <LanguageToggle />
      </header>
      <div className="flex min-h-screen flex-col lg:ps-64">
        <main className="min-w-0 flex-1 p-4 pb-28 pt-16 md:p-6 md:pt-6">{children}</main>
        <BottomNav />
      </div>
    </>
  );
}
