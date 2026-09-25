import type { AccessRole } from "./types";

export function roleIsAllowed(role: AccessRole, allowedRoles: AccessRole[]) {
  return allowedRoles.includes(role);
}
