export async function getReceptionistProfile(): Promise<ReceptionistProfile> {
  const { receptionistApiFetch } = await import("./client");
  return receptionistApiFetch<ReceptionistProfile>("/receptionist/profile");
}

export async function getReceptionistAttendance(
  type: "staff" | "teacher" | "student",
  date: string,
): Promise<AttendanceListResponse> {
  const { receptionistApiFetch } = await import("./client");
  return receptionistApiFetch<AttendanceListResponse>(
    `/receptionist/attendance?type=${type}&date=${date}`,
  );
}

export async function markReceptionistAttendance(
  payload: MarkAttendanceRequest,
): Promise<MarkAttendanceResponse> {
  const { receptionistApiFetch } = await import("./client");
  return receptionistApiFetch<MarkAttendanceResponse>("/receptionist/attendance/mark", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getReceptionistSocketTicket(): Promise<SocketTicketResponse> {
  const { receptionistApiFetch } = await import("./client");
  return receptionistApiFetch<SocketTicketResponse>("/receptionist/socket-ticket");
}

export interface ReceptionistProfile {
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

export async function changeAuthPassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  const { receptionistApiFetch } = await import("./client");
  return receptionistApiFetch("/receptionist/password/change", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAuthMe(payload: { firstName: string; lastName: string; phone: string; avatarUrl: string }): Promise<void> {
  const { receptionistApiFetch } = await import("./client");
  return receptionistApiFetch("/receptionist/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface AttendanceRow {
  entityId: string;
  fullName: string;
  idLabel: string;
  contextLabel: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "PERMITTED" | "EXCUSED" | "LEAVE" | null;
}

export interface AttendanceListResponse {
  rows: AttendanceRow[];
}

export interface MarkAttendanceRequest {
  entityType: "staff" | "teacher" | "student";
  entityId: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "PERMITTED";
  date: string;
  remarks?: string;
}

export interface MarkAttendanceResponse {
  entityId: string;
  entityType: "staff" | "teacher" | "student";
  status: string;
  date: string;
}

export interface SocketTicketResponse {
  ticket: string;
  expiresIn: number;
}