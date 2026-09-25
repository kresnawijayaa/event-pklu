import { and, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { participants } from "@/db/schema";

export async function findParticipantDuplicates(input: {
  eventId: string;
  whatsappE164: string;
  nameNormalized: string;
  churchNormalized: string | null;
  excludeId?: string;
}) {
  const conditions = [
    eq(participants.eventId, input.eventId),
    isNull(participants.deletedAt),
    or(
      eq(participants.whatsappE164, input.whatsappE164),
      and(
        eq(participants.nameNormalized, input.nameNormalized),
        input.churchNormalized
          ? eq(participants.churchNormalized, input.churchNormalized)
          : isNull(participants.churchNormalized),
      ),
    ),
  ];
  if (input.excludeId) conditions.push(ne(participants.id, input.excludeId));
  return db.select({
    id: participants.id,
    registrationCode: participants.registrationCode,
    name: participants.name,
    church: participants.church,
  }).from(participants).where(and(...conditions)).limit(5);
}
