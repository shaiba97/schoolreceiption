import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RECEPTIONIST_NO_AUTH_BYPASS } from "@/lib/auth-flag";
import { RECEPTIONIST_TOKEN_COOKIE } from "@/lib/api/session";

const PORTAL_PATHS = [
  "/profile",
  "/attendance",
];

/**
 * Portal guard (Next 16 `proxy` convention): cookie presence only. Token
 * validity is enforced per request by the backend (401s redirect to /login
 * client-side).
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPortalPath = PORTAL_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  const token = request.cookies.get(RECEPTIONIST_TOKEN_COOKIE)?.value;

  if (RECEPTIONIST_NO_AUTH_BYPASS) return NextResponse.next();

  if (isPortalPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile",
    "/attendance",
    "/profile/:path*",
    "/attendance/:path*",
    "/login",
  ],
};