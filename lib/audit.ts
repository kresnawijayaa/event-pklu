import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AccessRole } from "@/lib/auth/types";

export const AUDIT_ACTIONS = {
  AUTH_LOGIN_SUCCESS: "AUTH_LOGIN_SUCCESS",
  AUTH_LOGIN_FAILED: "AUTH_LOGIN_FAILED",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  PARTICIPANT_CREATED: "PARTICIPANT_CREATED",
  PARTICIPANT_UPDATED: "PARTICIPANT_UPDATED",
  PARTICIPANT_DELETED: "PARTICIPANT_DELETED",
  PARTICIPANT_RESTORED: "PARTICIPANT_RESTORED",
  PARTICIPANT_CHECKED_IN: "PARTICIPANT_CHECKED_IN",
  PARTICIPANT_CHECK_IN_CANCELLED: "PARTICIPANT_CHECK_IN_CANCELLED",
  WHATSAPP_OPENED: "WHATSAPP_OPENED",
  WHATSAPP_CONFIRMED: "WHATSAPP_CONFIRMED",
  IMPORT_COMPLETED: "IMPORT_COMPLETED",
  EXPORT_COMPLETED: "EXPORT_COMPLETED",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
} as const;

type AuditInput = {
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
  actorRole?: AccessRole | null;
  actorSessionId?: string | null;
  eventId?: string | null;
  participantId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function writeAudit(input: AuditInput) {
  await db.insert(auditLogs).values({
    action: input.action,
    actorRole: input.actorRole ?? null,
    actorSessionId: input.actorSessionId ?? null,
    eventId: input.eventId ?? null,
    participantId: input.participantId ?? null,
    metadata: input.metadata ?? {},
  });
}
