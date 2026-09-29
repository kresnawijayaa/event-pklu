import { and, eq, isNull, asc } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, events, participants } from "@/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import { failure } from "@/lib/response";
import { buildParticipantsCsv } from "@/lib/csv-export";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireRole(["ADMIN"]);
    const eventSlug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
    const [event] = await db.select({ id: events.id, slug: events.slug }).from(events).where(eq(events.slug, eventSlug)).limit(1);
    if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");
    const rows = await db.select({
      registrationCode: participants.registrationCode, name: participants.name,
      whatsappE164: participants.whatsappE164, church: participants.church,
      registrationMode: participants.registrationMode, category: participants.category,
      mupel: participants.mupel, participantType: participants.participantType,
      registrationChannel: participants.registrationChannel,
      createdAt: participants.createdAt, checkedInAt: participants.checkedInAt,
    }).from(participants).where(and(eq(participants.eventId, event.id), isNull(participants.deletedAt)))
      .orderBy(asc(participants.sequenceNumber));
    const csv = buildParticipantsCsv(rows);
    await db.insert(auditLogs).values({
      eventId: event.id, actorRole: session.role, actorSessionId: session.sessionId,
      action: "EXPORT_COMPLETED", metadata: { format: "csv", rowCount: rows.length },
    });
    const filename = `${event.slug}-peserta.csv`;
    return new Response(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    } });
  } catch (error) {
    return failure(error);
  }
}
