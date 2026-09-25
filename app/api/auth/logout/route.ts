import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, sessions } from "@/db/schema";
import { AUDIT_ACTIONS } from "@/lib/audit";
import { sessionCookieName, sessionCookieOptions, readSessionToken } from "@/lib/auth/cookies";
import { hasSameOrigin } from "@/lib/auth/origin";
import { hashSessionToken } from "@/lib/auth/session-token";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) {
      throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    }

    const token = await readSessionToken();
    if (token) {
      const tokenHash = hashSessionToken(token);
      await db.transaction(async (tx) => {
        const [revoked] = await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(andTokenActive(tokenHash))
          .returning({ id: sessions.id, role: sessions.role });

        if (revoked) {
          await tx.insert(auditLogs).values({
            actorRole: revoked.role,
            actorSessionId: revoked.id,
            action: AUDIT_ACTIONS.AUTH_LOGOUT,
            metadata: {},
          });
        }
      });
    }

    const response = success({ loggedOut: true });
    response.cookies.set(sessionCookieName(), "", {
      ...sessionCookieOptions(new Date(0)),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}

function andTokenActive(tokenHash: string) {
  return and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt));
}
