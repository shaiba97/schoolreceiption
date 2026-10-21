const API_URL = process.env.RECEPTIONIST_API_URL || "http://localhost:3000/api";

export const RECEPTIONIST_AUTH_HEADER = "authorization";
export const RECEPTIONIST_TENANT_HEADER = "x-tenant-id";
/** Session cookie names (populated by the login slice; auth comes last). */
export const RECEPTIONIST_TOKEN_COOKIE = "rc_token";
export const RECEPTIONIST_TENANT_COOKIE = "rc_tenant";

export class ReceptionistSessionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReceptionistSessionError";
    this.status = status;
  }
}

/** Dev bypass mirroring the backend's AUTH_NO_SESSION: unauthenticated local work. */
const NO_SESSION = process.env.RECEPTIONIST_NO_AUTH === "true";

export function receptionistRequestHeaders(source: Headers) {
  const authorization = source.get(RECEPTIONIST_AUTH_HEADER);
  const tenantId = source.get(RECEPTIONIST_TENANT_HEADER);

  if (NO_SESSION) {
    return {
      authorization: authorization || "",
      tenantId: tenantId || process.env.NEXT_PUBLIC_TENANT_ID || "",
    };
  }
  if (!authorization) throw new ReceptionistSessionError("Receptionist session is missing", 401);
  if (!tenantId) throw new ReceptionistSessionError("Receptionist tenant is missing", 403);
  return { authorization, tenantId };
}

/**
 * Cookie-first resolution for the browser proxy: the login slice stores the
 * JWT + tenant in httpOnly cookies (invisible to JS), so the proxy route
 * reads them here and forwards them as headers. Direct headers still win
 * when present (server-to-server calls, dev tools).
 */
export async function getProxySession(request: Request) {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const headerAuth = request.headers.get(RECEPTIONIST_AUTH_HEADER);
  const headerTenant = request.headers.get(RECEPTIONIST_TENANT_HEADER);
  const authorization =
    headerAuth || (jar.get(RECEPTIONIST_TOKEN_COOKIE)?.value ? `Bearer ${jar.get(RECEPTIONIST_TOKEN_COOKIE)?.value}` : "");
  const tenantId = headerTenant || jar.get(RECEPTIONIST_TENANT_COOKIE)?.value || "";
  return receptionistRequestHeaders(
    new Headers({
      ...(authorization ? { [RECEPTIONIST_AUTH_HEADER]: authorization } : {}),
      ...(tenantId ? { [RECEPTIONIST_TENANT_HEADER]: tenantId } : {}),
    }),
  );
}

export async function getIncomingReceptionistHeaders() {
  const { headers } = await import("next/headers");
  return receptionistRequestHeaders(await headers());
}

export function receptionistApiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}