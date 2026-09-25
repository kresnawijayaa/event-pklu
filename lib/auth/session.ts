import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accessCodes, sessions } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { readSessionToken, sessionTtlHours } from "./cookies";
import { hashSessionToken } from "./session-token";
import type { AccessRole, AuthSession } from "./types";
export { createSessionToken, hashSessionToken } from "./session-token";

export function sessionExpiry(now = new Date()) {
  return new Date(now.getTime() + sessionTtlHours() * 60 * 60 * 1000);
}

export async function requireSession(): Promise<AuthSession> {
  const token = await readSessionToken();

  if (!token) {
    throw new AppError("UNAUTHENTICATED", 401, "Sesi Anda sudah berakhir. Silakan masuk kembali.");
  }

  const now = new Date();
  const [session] = await db
    .select({
      sessionId: sessions.id,
      role: sessions.role,
      expiresAt: sessions.expiresAt,
      accessCodeVersion: sessions.accessCodeVersion,
      currentAccessCodeVersion: accessCodes.version,
    })
    .from(sessions)
    .innerJoin(accessCodes, eq(sessions.role, accessCodes.role))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
      ),
    )
    .limit(1);

  if (!session || session.accessCodeVersion !== session.currentAccessCodeVersion) {
    throw new AppError("UNAUTHENTICATED", 401, "Sesi Anda sudah berakhir. Silakan masuk kembali.");
  }

  return {
    sessionId: session.sessionId,
    role: session.role as AccessRole,
    expiresAt: session.expiresAt,
  };
}
