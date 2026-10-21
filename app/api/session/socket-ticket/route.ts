import { NextResponse } from "next/server";
import { getProxySession, receptionistApiUrl, ReceptionistSessionError } from "@/lib/api/session";

export async function GET(request: Request) {
  let session: { authorization: string; tenantId: string };
  try {
    session = await getProxySession(request);
  } catch (error) {
    if (error instanceof ReceptionistSessionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }

  const response = await fetch(receptionistApiUrl("/receptionist/socket-ticket"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: session.authorization,
      "X-Tenant-Id": session.tenantId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => undefined);
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : "Failed to get socket ticket";
    return NextResponse.json({ message }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}