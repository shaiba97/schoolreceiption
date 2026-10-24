"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, KeyRound, LogOut, Pencil, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getReceptionistProfile, getAuthMe, changeAuthPassword, updateAuthMe, type AuthMe } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/locale-provider";

function statusBadge(status: string) {
  return status === "ACTIVE" ? (
    <Badge variant="success">{status}</Badge>
  ) : (
    <Badge variant="warning">{status}</Badge>
  );
}

// Shift configuration - role-based constant since no shift data in DB
const SHIFT_CONFIG: Record<string, string> = {
  RECEPTIONIST: "07:00 - 14:00",
};

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
    <span aria-hidden className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
      {initials || "?"}
    </span>
  );
}

export function ProfileClient() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [profile, setProfile] = React.useState<ReceptionistProfile | null>(null);
  const [me, setMe] = React.useState<AuthMe | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
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
      .then(() => getAuthMe())
      .then((data) => {
        setMe(data);
      })
      .catch((cause) => {
        setError(cause instanceof ApiError ? cause.message : t("profile.loadError"));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <h1 className="text-xl font-semibold tracking-tight">{t("profile.title")}</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || t("profile.notFound")}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
              {t("common.retry")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
              {t("profile.signOut")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.staffNumber ||
    t("profile.unnamed");
  const shiftLabel = SHIFT_CONFIG[profile.role] ?? t("profile.shiftFallback");
  const accountMe: AuthMe = me ?? {
    id: "",
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    avatarUrl: profile.user?.avatarUrl ?? null,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span aria-current="page" className="truncate font-medium text-foreground">{t("profile.title")}</span>
          </nav>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <AvatarCircle name={displayName} photoUrl={accountMe.avatarUrl} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-tight">{displayName}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{profile.department ?? t("profile.departmentFallback")}</Badge>
                {profile.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} aria-hidden />{profile.phone}
                  </span>
                )}
                {statusBadge(profile.status)}
                <Badge variant="outline" className="border-transparent bg-accent text-accent-foreground">{t("profile.activeDuty")}</Badge>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("profile.employeeOf", { number: profile.staffNumber ?? "—", shift: shiftLabel })}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 text-sm font-mono text-lg tabular-nums text-muted-foreground" aria-live="off">
                {clock.toLocaleTimeString(locale === "ar" ? "ar-u-nu-latn" : [], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil size={14} aria-hidden /> {t("profile.editContact")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                  <KeyRound size={14} aria-hidden /> {t("profile.changePassword")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">{t("profile.signOutCard")}</p>
            <p className="text-xs text-muted-foreground">{t("profile.signOutHint")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleSignOut()}>
            <LogOut size={14} aria-hidden /> {t("profile.signOut")}
          </Button>
        </CardContent>
      </Card>

      {editOpen && (
        <EditContactDialog
          open
          me={accountMe}
          onOpenChange={setEditOpen}
          onSaved={() => {
            setEditOpen(false);
            setLoading(true);
            load();
          }}
        />
      )}
      {passwordOpen && <PasswordDialog open onOpenChange={setPasswordOpen} />}
    </div>
  );
}

function EditContactDialog({
  open,
  me,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  me: AuthMe;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [firstName, setFirstName] = React.useState(me.firstName ?? "");
  const [lastName, setLastName] = React.useState(me.lastName ?? "");
  const [phone, setPhone] = React.useState(me.phone ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(me.avatarUrl ?? "");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim()) {
      setFormError(t("profile.firstNameRequired"));
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await updateAuthMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      onSaved();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : t("profile.saveError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.contactTitle")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 p-6 pt-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-first">{t("profile.firstName")}</Label>
              <Input id="profile-first" value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-last">{t("profile.lastName")}</Label>
              <Input id="profile-last" value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={100} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">{t("profile.phoneField")}</Label>
            <Input id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-avatar">{t("profile.avatarField")}</Label>
            <Input id="profile-avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} maxLength={500} inputMode="url" placeholder="https://…" />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <DialogFooter className="p-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("common.saving") : t("profile.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [done, setDone] = React.useState(false);
  const { t } = useI18n();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setFormError(t("profile.passwordShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t("profile.passwordMismatch"));
      return;
    }
    setPending(true);
    setFormError("");
    try {
      await changeAuthPassword({ currentPassword, newPassword });
      setDone(true);
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : t("profile.passwordError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.passwordTitle")}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="space-y-4 p-6 pt-2">
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeCheck size={16} className="text-primary" aria-hidden />
              {t("profile.passwordDone")}
            </p>
            <DialogFooter className="p-0">
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t("common.close")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4 p-6 pt-2" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">{t("profile.currentPassword")}</Label>
              <Input
                id="pw-current"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">{t("profile.newPassword")}</Label>
              <Input
                id="pw-new"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">{t("profile.confirmPassword")}</Label>
              <Input
                id="pw-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <DialogFooter className="p-0 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t("common.saving") : t("profile.changePassword")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
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

export function ProfileLoadingFallback() {
  const { t } = useI18n();
  return <div className="p-4">{t("profile.loading")}</div>;
}
