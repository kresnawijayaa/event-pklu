export function isLoginBlocked(blockedUntil: Date | null | undefined, now = new Date()) {
  return Boolean(blockedUntil && blockedUntil.getTime() > now.getTime());
}
