import { cookies } from "next/headers";

export function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || "pklu_session";
}

export function sessionTtlHours() {
  const value = Number(process.env.SESSION_TTL_HOURS ?? 8);
  return Number.isSafeInteger(value) && value > 0 && value <= 24 * 30 ? value : 8;
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function readSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName())?.value ?? null;
}
