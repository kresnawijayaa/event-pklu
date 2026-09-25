export type AccessRole = "STAFF" | "ADMIN";

export type AuthSession = {
  sessionId: string;
  role: AccessRole;
  expiresAt: Date;
};
