import { NextResponse } from "next/server";
import { receptionistApiUrl, RECEPTIONIST_TENANT_COOKIE, RECEPTIONIST_TOKEN_COOKIE } from "@/lib/api/session";

type Membership = {
  tenantId: string;
  status: string;
  tenant: { id: string; name: string };
  roles: Array<{ slug: string }>;
};

type LoginResponse = {
  accessToken: string;
  memberships: Membership[];
};

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function sessionCookies(token: string, tenantId: string) {
  const secure = process.env.NODE_ENV === "production";
  const base = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure ? "; Secure" : ""}`;
  return [
    `${RECEPTIONIST_TOKEN_COOKIE}=${encodeURIComponent(token)}; ${base}`,
    `${RECEPTIONIST_TENANT_COOKIE}=${encodeURIComponent(tenantId)}; ${base}`,
  ];
}

/**
 * Receptionist login. Multi-tenant: staffNumber is globally unique.
 * - If tenantId provided: targeted lookup
 * - If no tenantId: backend finds user by staffNumber across all tenants
 *   → returns all active memberships → filter for RECEPTIONIST role
 *   → 1 membership = direct login, multiple = 409 with tenant list
 */
export async function POST(request: Request) {
  let body: { identifier?: string; password?: string; tenantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }
  const identifier = body.identifier?.trim() ?? "";
  const password = body.password ?? "";
  if (!identifier || !password) {
    return NextResponse.json({ message: "Staff ID and password are required" }, { status: 400 });
  }

  // Send to backend: include tenantId only if explicitly provided
  const payload: Record<string, string> = {
    staffNumber: identifier,
    password,
  };
  if (body.tenantId) {
    payload.tenantId = body.tenantId;
  }

  let upstream: Response;
  try {
    upstream = await fetch(receptionistApiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Receptionist API is unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    const data = await upstream.json().catch(() => undefined);
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : "Sign in failed";
    return NextResponse.json({ message }, { status: upstream.status });
  }

  const data = (await upstream.json()) as LoginResponse;
  const receptionistMemberships = (data.memberships ?? []).filter(
    (m) => m.status === "ACTIVE" && m.roles.some((r) => r.slug === "RECEPTIONIST"),
  );
  if (receptionistMemberships.length === 0) {
    return NextResponse.json(
      { message: "This account has no receptionist access — accounts are provisioned by academic affairs" },
      { status: 403 },
    );
  }
  // If multiple tenants and no explicit tenantId provided, ask which school
  if (receptionistMemberships.length > 1 && !body.tenantId) {
    return NextResponse.json(
      {
        message: "Select your school",
        tenants: receptionistMemberships.map((m) => ({ id: m.tenantId, name: m.tenant.name })),
      },
      { status: 409 },
    );
  }
  // Single tenant or explicit tenantId provided
  const membership = receptionistMemberships.find((m) => m.tenantId === body.tenantId) ?? receptionistMemberships[0];

  const response = NextResponse.json({
    ok: true,
    tenant: { id: membership.tenantId, name: membership.tenant.name },
  });
  for (const cookie of sessionCookies(data.accessToken, membership.tenantId)) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}