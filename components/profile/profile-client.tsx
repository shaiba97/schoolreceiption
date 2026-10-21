"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getReceptionistProfile, changeAuthPassword, updateAuthMe } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/client";

function statusBadge(status: string) {
  return <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>{status}</Badge>;
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "—";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function AvatarCircle({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const [broken, setBroken] = React.useState(false);
  const src = photoUrl?.trim() ?? "";
  if (src && !broken && /^https?:\/\//i.test(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" onError={() => setBroken(true)} className="size-14 shrink-0 rounded-full object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return (
    <span aria-hidden className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold">
      {initials || "?"}
    </span>
  );
}

// Shift configuration - role-based constant since no shift data in DB
const SHIFT_CONFIG: Record<string, string> = {
  RECEPTIONIST: "Morning Shift: 07:00 AM - 02:00 PM",
};

export function ProfileClient() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<ReceptionistProfile | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [tab, setTab] = React.useState("overview");
  const [clock, setClock] = React.useState(new Date());

  // Live clock
  React.useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const load = React.useCallback(() => {
    getReceptionistProfile()
      .then((data) => {
        setProfile(data);
        setError("");
        setLoading(false);
      })
      .catch((cause) => {
        setError(cause instanceof ApiError ? cause.message : "Unable to load profile");
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    load();
  }

  async function handleSignOut() {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">My Profile</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || "Profile not found"}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.staffNumber || "Unnamed receptionist";
  const toTitle = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  const displayTitle = displayName
    .split(/\s+/)
    .map((part) => (/^[a-zA-Z]/.test(part) ? toTitle(part) : part))
    .join(" ");

  const shiftLabel = SHIFT_CONFIG[profile.role] ?? "—";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span aria-current="page" className="truncate font-medium text-foreground">My Profile</span>
          </nav>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <AvatarCircle name={displayTitle} photoUrl={profile.user?.avatarUrl} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-tight">{displayTitle}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{profile.department ?? "Front Office"}</Badge>
                {profile.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} aria-hidden />{profile.phone}
                  </span>
                )}
                {statusBadge(profile.status)}
                <Badge variant="outline">ACTIVE DUTY</Badge>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Employee {profile.staffNumber} · {shiftLabel}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-sm font-mono text-lg tabular-nums text-muted-foreground" aria-live="off">
                {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">End this session on this device.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
            <LogOut size={14} aria-hidden /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface ReceptionistProfile {
  firstName: string;
  lastName: string;
  staffNumber: string | null;
  phone: string | null;
  email: string | null;
  role: "RECEPTIONIST";
  department?: string;
  status: string;
  user?: { avatarUrl?: string | null };
}