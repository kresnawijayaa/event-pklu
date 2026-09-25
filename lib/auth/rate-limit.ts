import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { isLoginBlocked } from "./rate-limit-policy";

export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_BLOCK_MS = 15 * 60 * 1000;

export async function getLoginBlock(ipHash: string, now = new Date()) {
  const [attempt] = await db
    .select({ blockedUntil: loginAttempts.blockedUntil })
    .from(loginAttempts)
    .where(eq(loginAttempts.ipHash, ipHash))
    .limit(1);

  return isLoginBlocked(attempt?.blockedUntil, now) ? attempt?.blockedUntil ?? null : null;
}

export async function recordLoginFailure(ipHash: string, now = new Date()) {
  const windowExpired = sql`${loginAttempts.windowStartedAt} <= (${now}::timestamptz - interval '15 minutes')`;

  const [attempt] = await db
    .insert(loginAttempts)
    .values({
      ipHash,
      failureCount: 1,
      windowStartedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: loginAttempts.ipHash,
      set: {
        failureCount: sql`CASE WHEN ${windowExpired} THEN 1 ELSE ${loginAttempts.failureCount} + 1 END`,
        windowStartedAt: sql`CASE WHEN ${windowExpired} THEN ${now} ELSE ${loginAttempts.windowStartedAt} END`,
        blockedUntil: sql`CASE
          WHEN ${windowExpired} THEN NULL
          WHEN ${loginAttempts.failureCount} >= ${LOGIN_FAILURE_LIMIT - 1} THEN ${now}::timestamptz + interval '15 minutes'
          ELSE ${loginAttempts.blockedUntil}
        END`,
        updatedAt: now,
      },
    })
    .returning({ failureCount: loginAttempts.failureCount });

  return attempt?.failureCount ?? 1;
}

export async function clearLoginFailures(ipHash: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.ipHash, ipHash));
}
