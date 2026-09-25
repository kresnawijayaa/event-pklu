import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, events, participants } from "@/db/schema";
import type { AuthSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";

const eventSlug = () => process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";

export async function getEventSettings() {
  const [event] = await db.select({
    id: events.id,
    name: events.name,
    eventDate: events.eventDate,
    targetParticipants: events.targetParticipants,
    registrationPrefix: events.registrationPrefix,
    registrationPadding: events.registrationPadding,
    nextSequence: events.nextSequence,
    whatsappTemplate: events.whatsappTemplate,
  }).from(events).where(eq(events.slug, eventSlug())).limit(1);
  if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");
  const audit = await db.select({
    action: auditLogs.action,
    actorRole: auditLogs.actorRole,
    createdAt: auditLogs.createdAt,
  }).from(auditLogs).where(eq(auditLogs.eventId, event.id)).orderBy(desc(auditLogs.createdAt)).limit(30);
  const [participantCount] = await db.select({ count: sql<number>`count(*)::int` }).from(participants).where(eq(participants.eventId, event.id));
  return { event, audit, prefixLocked: (participantCount?.count ?? 0) > 0 };
}

export async function updateEventSettings(input: {
  name: string;
  eventDate: string;
  targetParticipants: number;
  registrationPrefix: string;
  whatsappTemplate: string;
}, session: AuthSession) {
  return db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.slug, eventSlug())).for("update").limit(1);
    if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");
    if (input.registrationPrefix !== event.registrationPrefix) {
      const [count] = await tx.select({ count: sql<number>`count(*)::int` }).from(participants).where(eq(participants.eventId, event.id));
      if ((count?.count ?? 0) > 0) {
        throw new AppError("PREFIX_LOCKED", 409, "Prefix registrasi tidak dapat diubah setelah peserta pertama dibuat.");
      }
    }
    const [updated] = await tx.update(events).set({
      name: input.name,
      eventDate: input.eventDate,
      targetParticipants: input.targetParticipants,
      registrationPrefix: input.registrationPrefix,
      whatsappTemplate: input.whatsappTemplate,
      updatedAt: new Date(),
    }).where(and(eq(events.id, event.id), eq(events.slug, eventSlug()))).returning({
      id: events.id, name: events.name, eventDate: events.eventDate,
      targetParticipants: events.targetParticipants, registrationPrefix: events.registrationPrefix,
      registrationPadding: events.registrationPadding, whatsappTemplate: events.whatsappTemplate,
    });
    await tx.insert(auditLogs).values({
      eventId: event.id, actorRole: session.role, actorSessionId: session.sessionId,
      action: "SETTINGS_UPDATED",
      metadata: { fields: Object.keys(input).sort().join(",") },
    });
    return updated;
  });
}
