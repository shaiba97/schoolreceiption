import { AttendanceClient } from "@/components/attendance/attendance-client";
import { Suspense } from "react";

export const instant = false;

export default function ReceptionistAttendancePage() {
  return (
    <Suspense fallback={<div className="p-4">Loading attendance…</div>}>
      <AttendanceClient />
    </Suspense>
  );
}