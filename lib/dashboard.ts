import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, participants } from "@/db/schema";

export async function getDashboardSummary() {
  const eventSlug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
  const [event] = await db
    .select({ id: events.id, name: events.name, eventDate: events.eventDate, target: events.targetParticipants })
    .from(events)
    .where(eq(events.slug, eventSlug))
    .limit(1);

  if (!event) return null;

  const [totals] = await db
    .select({
      registered: sql<number>`count(*)::int`,
      checkedIn: sql<number>`count(${participants.checkedInAt})::int`,
      whatsappConfirmed: sql<number>`count(${participants.whatsappConfirmedAt})::int`,
    })
    .from(participants)
    .where(and(eq(participants.eventId, event.id), isNull(participants.deletedAt)));

  const registered = totals?.registered ?? 0;
  const checkedIn = totals?.checkedIn ?? 0;

  return {
    event: { name: event.name, eventDate: event.eventDate, target: event.target },
    registered,
    checkedIn,
    notCheckedIn: registered - checkedIn,
    whatsappConfirmed: totals?.whatsappConfirmed ?? 0,
  };
}
