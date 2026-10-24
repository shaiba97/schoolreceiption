"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, Search, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReceptionistAttendance, markReceptionistAttendance, getReceptionistSocketTicket } from "@/lib/api/profile";
import { ApiError } from "@/lib/api/client";
import { useRealtimeEvent, initializeSocket } from "@/lib/realtime/socket";
import { useI18n, type MessageKey } from "@/lib/i18n/locale-provider";
import { toast } from "@/components/ui/toast";

type AttendanceType = "staff" | "teacher" | "student";

type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "PERMITTED" | "EXCUSED" | "LEAVE";

interface AttendanceRow {
  entityId: string;
  fullName: string;
  idLabel: string;
  contextLabel: string;
  status: AttendanceStatus | null;
}

const STATUS_VARIANT: Record<AttendanceStatus, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "destructive",
  PERMITTED: "info",
  EXCUSED: "info",
  LEAVE: "secondary",
};

const STATUS_KEYS: Record<AttendanceStatus, MessageKey> = {
  PRESENT: "attendance.statusPresent",
  LATE: "attendance.statusLate",
  ABSENT: "attendance.statusAbsent",
  PERMITTED: "attendance.statusPermitted",
  EXCUSED: "attendance.statusExcused",
  LEAVE: "attendance.statusLeave",
};

const TYPE_CONFIG: Record<AttendanceType, {
  labelKey: MessageKey;
  idLabelKey: MessageKey;
  contextLabelKey: MessageKey;
  searchKey: MessageKey;
  emptyTitleKey: MessageKey;
  emptyDescKey: MessageKey;
}> = {
  staff: {
    labelKey: "attendance.tabStaff",
    idLabelKey: "attendance.idStaff",
    contextLabelKey: "attendance.ctxPosition",
    searchKey: "attendance.searchStaff",
    emptyTitleKey: "attendance.noStaffTitle",
    emptyDescKey: "attendance.noStaffDesc",
  },
  teacher: {
    labelKey: "attendance.tabTeachers",
    idLabelKey: "attendance.idEmpNumber",
    contextLabelKey: "attendance.ctxSpecialization",
    searchKey: "attendance.searchTeachers",
    emptyTitleKey: "attendance.noTeachersTitle",
    emptyDescKey: "attendance.noTeachersDesc",
  },
  student: {
    labelKey: "attendance.tabStudents",
    idLabelKey: "attendance.idRoleNumber",
    contextLabelKey: "attendance.ctxGrade",
    searchKey: "attendance.searchStudents",
    emptyTitleKey: "attendance.noStudentsTitle",
    emptyDescKey: "attendance.noStudentsDesc",
  },
};

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: string): Date {
  return new Date(value + "T00:00:00");
}

function dateToKey(date: Date): string {
  return formatDateForInput(date);
}

export function AttendanceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // Initial tab from URL or default to staff
  const initialTab = (searchParams.get("tab") as AttendanceType) ?? "staff";
  const [activeTab, setActiveTab] = React.useState<AttendanceType>(initialTab);

  // Date state - default to today
  const [date, setDate] = React.useState(() => {
    const param = searchParams.get("date");
    return param ? parseDateInput(param) : new Date();
  });

  // Search filter
  const [search, setSearch] = React.useState("");

  // Data state
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set());

  // Update URL when tab or date changes
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    params.set("date", formatDateForInput(date));
    router.replace(`/attendance?${params.toString()}`);
  }, [activeTab, date, router]);

  // Fetch attendance data
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getReceptionistAttendance(activeTab, formatDateForInput(date));
      setRows(data.rows);
      setError("");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("attendance.loadError"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, date, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Realtime updates
  useRealtimeEvent<{ entityType: string; entityId: string; status: string }>("attendance_updated", (payload) => {
    if (payload.entityType === activeTab) {
      setRows((prev) =>
        prev.map((row) =>
          row.entityId === payload.entityId
            ? { ...row, status: payload.status as AttendanceRow["status"] }
            : row,
        ),
      );
    }
  });

  // Initialize socket connection on mount
  React.useEffect(() => {
    let cancelled = false;
    getReceptionistSocketTicket()
      .then((res) => {
        if (!cancelled) return initializeSocket(res.ticket);
      })
      .catch(() => {
        // Silently ignore — realtime is best-effort; REST still works
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Optimistic mark
  async function handleMark(entityId: string, status: "PRESENT" | "LATE" | "ABSENT" | "PERMITTED") {
    const row = rows.find((r) => r.entityId === entityId);
    if (!row) return;

    // Optimistic update
    setRows((prev) =>
      prev.map((r) => (r.entityId === entityId ? { ...r, status } : r)),
    );
    setPendingIds((prev) => new Set(prev).add(entityId));

    try {
      await markReceptionistAttendance({
        entityType: activeTab,
        entityId,
        status,
        date: formatDateForInput(date),
      });
      // Server will echo back via realtime, but we keep optimistic update
    } catch (cause) {
      // Revert on failure
      setRows((prev) =>
        prev.map((r) => (r.entityId === entityId ? { ...r, status: row.status } : r)),
      );
      toast.add({
        title: cause instanceof ApiError ? cause.message : t("attendance.markError"),
        type: "error",
      });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
    }
  }

  // Filter rows by search
  const filteredRows = React.useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(term) ||
        r.idLabel.toLowerCase().includes(term) ||
        r.contextLabel.toLowerCase().includes(term),
    );
  }, [rows, search]);

  // Date navigation
  function changeDate(delta: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    setDate(next);
  }

  const isPending = (id: string) => pendingIds.has(id);

  return (
    <div className="space-y-4">
      {/* Header with date picker and search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => changeDate(-1)} aria-label={t("attendance.prevDay")}>
            <ChevronLeft size={16} className="rtl:-scale-x-100" />
          </Button>
          <Input
            type="date"
            value={formatDateForInput(date)}
            onChange={(e) => setDate(parseDateInput(e.target.value))}
            className="w-[160px]"
          />
          <Button variant="outline" size="sm" onClick={() => changeDate(1)} aria-label={t("attendance.nextDay")}>
            <ChevronRight size={16} className="rtl:-scale-x-100" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
            {t("attendance.today")}
          </Button>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
          <Input
            placeholder={t(TYPE_CONFIG[activeTab].searchKey)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {(["staff", "teacher", "student"] as AttendanceType[]).map((type) => (
            <TabsTrigger key={type} value={type} className="text-sm">
              {t(TYPE_CONFIG[type].labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <AttendanceTable
            rows={filteredRows}
            loading={loading}
            error={error}
            type="staff"
            onMark={handleMark}
            isPending={isPending}
          />
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teacher">
          <AttendanceTable
            rows={filteredRows}
            loading={loading}
            error={error}
            type="teacher"
            onMark={handleMark}
            isPending={isPending}
          />
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="student">
          <AttendanceTable
            rows={filteredRows}
            loading={loading}
            error={error}
            type="student"
            onMark={handleMark}
            isPending={isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AttendanceTableProps {
  rows: AttendanceRow[];
  loading: boolean;
  error: string;
  type: AttendanceType;
  onMark: (entityId: string, status: "PRESENT" | "LATE" | "ABSENT" | "PERMITTED") => void;
  isPending: (id: string) => boolean;
}

function AttendanceTable({ rows, loading, error, type, onMark, isPending }: AttendanceTableProps) {
  const { t } = useI18n();
  const config = TYPE_CONFIG[type];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t(config.emptyTitleKey)}
        description={t(config.emptyDescKey)}
        action={<TrendingUp size={20} />}
      />
    );
  }

  const typeLabel = t(config.labelKey);
  const cardTitle = t(
    rows.length === 1 ? "attendance.cardTitleOne" : "attendance.cardTitleMany",
    { type: typeLabel, count: rows.length },
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">{t("attendance.colName")}</TableHead>
                <TableHead className="w-[140px]">{t(config.idLabelKey)}</TableHead>
                <TableHead>{t(config.contextLabelKey)}</TableHead>
                <TableHead className="w-[360px] text-end">{t("attendance.colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const pending = isPending(row.entityId);
                return (
                  <TableRow key={row.entityId}>
                    <TableCell className="font-medium">{row.fullName}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{row.idLabel}</TableCell>
                    <TableCell className="text-muted-foreground">{row.contextLabel}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {row.status && (
                          <Badge variant={STATUS_VARIANT[row.status]} className="me-2">
                            {t(STATUS_KEYS[row.status])}
                          </Badge>
                        )}
                        <div className="flex gap-1" role="group" aria-label={t("attendance.markGroupAria", { name: row.fullName })}>
                          <Button
                            variant={row.status === "PRESENT" ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => onMark(row.entityId, "PRESENT")}
                            disabled={pending}
                            aria-pressed={row.status === "PRESENT"}
                          >
                            {t("attendance.markPresentShort")}
                          </Button>
                          <Button
                            variant={row.status === "LATE" ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => onMark(row.entityId, "LATE")}
                            disabled={pending}
                            aria-pressed={row.status === "LATE"}
                          >
                            {t("attendance.markLateShort")}
                          </Button>
                          <Button
                            variant={row.status === "ABSENT" ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => onMark(row.entityId, "ABSENT")}
                            disabled={pending}
                            aria-pressed={row.status === "ABSENT"}
                          >
                            {t("attendance.markAbsentShort")}
                          </Button>
                          <Button
                            variant={row.status === "PERMITTED" ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => onMark(row.entityId, "PERMITTED")}
                            disabled={pending}
                            aria-pressed={row.status === "PERMITTED" || row.status === "EXCUSED"}
                          >
                            {t("attendance.markPermittedShort")}
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
