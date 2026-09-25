import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accessCodes, auditLogs, loginAttempts, sessions } from "@/db/schema";
import { AUDIT_ACTIONS, writeAudit } from "@/lib/audit";
import { sessionCookieName, sessionCookieOptions, sessionTtlHours } from "@/lib/auth/cookies";
import { hasSameOrigin } from "@/lib/auth/origin";
import { getAuthPepper, getIpHashSecret } from "@/lib/auth/secrets";
import {
  getLoginBlock,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { hashIp, trustedClientIp } from "@/lib/auth/ip";
import { createSessionToken, hashSessionToken } from "@/lib/auth/session-token";
import { verifyPin } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";

export const runtime = "nodejs";

const loginSchema = z.object({
  pin: z.string().regex(/^(?:\d{4}|\d{6})$/, "PIN harus berisi 4 atau 6 digit angka."),
});

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) {
      throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    }

    const body = await request.json().catch(() => null);
    const input = loginSchema.parse(body);
    const ipHash = hashIp(trustedClientIp(request.headers), getIpHashSecret());
    const blockedUntil = await getLoginBlock(ipHash);

    if (blockedUntil) {
      throw new AppError("RATE_LIMITED", 429, "Terlalu banyak percobaan. Coba lagi setelah 15 menit.");
    }

    const role = input.pin.length === 4 ? "STAFF" : "ADMIN";
    const [accessCode] = await db
      .select({ role: accessCodes.role, version: accessCodes.version, pinHash: accessCodes.pinHash })
      .from(accessCodes)
      .where(eq(accessCodes.role, role))
      .limit(1);
    const valid = accessCode
      ? await verifyPin(input.pin, getAuthPepper(), accessCode.pinHash)
      : false;

    if (!accessCode || !valid) {
      const failureCount = await recordLoginFailure(ipHash);
      await writeAudit({
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
        metadata: { reason: "invalid_credentials" },
      });

      if (failureCount >= 5) {
        throw new AppError("RATE_LIMITED", 429, "Terlalu banyak percobaan. Coba lagi setelah 15 menit.");
      }

      throw new AppError("INVALID_CREDENTIALS", 401, "PIN tidak valid.");
    }

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const ttlHours = sessionTtlHours();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await db.transaction(async (tx) => {
      const [createdSession] = await tx
        .insert(sessions)
        .values({
          tokenHash,
          role: accessCode.role,
          accessCodeVersion: accessCode.version,
          ipHash,
          userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
          expiresAt,
        })
        .returning({ id: sessions.id });
      await tx.insert(loginAttempts).values({
        ipHash,
        failureCount: 0,
        windowStartedAt: new Date(),
      }).onConflictDoUpdate({
        target: loginAttempts.ipHash,
        set: { failureCount: 0, blockedUntil: null, windowStartedAt: new Date(), updatedAt: new Date() },
      });
      await tx.insert(auditLogs).values({
        actorRole: accessCode.role,
        actorSessionId: createdSession.id,
        action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
        metadata: {},
      });
    });

    const response = success({ role: accessCode.role, expiresAt: expiresAt.toISOString() });
    response.cookies.set(sessionCookieName(), token, {
      ...sessionCookieOptions(expiresAt),
      maxAge: ttlHours * 60 * 60,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
