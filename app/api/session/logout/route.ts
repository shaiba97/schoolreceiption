import { NextResponse } from "next/server";
import { RECEPTIONIST_TENANT_COOKIE, RECEPTIONIST_TOKEN_COOKIE } from "@/lib/api/session";

function clearCookieHeader(name: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearCookieHeader(RECEPTIONIST_TOKEN_COOKIE));
  response.headers.append("Set-Cookie", clearCookieHeader(RECEPTIONIST_TENANT_COOKIE));
  return response;
}