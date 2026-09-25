import { AppError } from "@/lib/errors";
import { requireSession } from "./session";
import { roleIsAllowed } from "./role-policy";
import type { AccessRole } from "./types";

export { roleIsAllowed } from "./role-policy";

export async function requireRole(allowedRoles: AccessRole[]) {
  const session = await requireSession();

  if (!roleIsAllowed(session.role, allowedRoles)) {
    throw new AppError("FORBIDDEN", 403, "Anda tidak memiliki akses untuk tindakan ini.");
  }

  return session;
}
