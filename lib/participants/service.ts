import { and, desc, eq, ilike, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, events, participants } from "@/db/schema";
import type { AuthSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import { normalizeIndonesianPhone, normalizePersonText, normalizeSearchText } from "./normalization";
import type { ParticipantDetailsInput } from "./details";

export async function getActiveEvent() {
  const slug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
  const [event] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");
  return event;
}

export function normalizeParticipantInput(input: { name: string; whatsapp: string; church?: string | null } & ParticipantDetailsInput) {
  const name = normalizePersonText(input.name);
  const church = normalizePersonText(input.church ?? "") || null;
  const detail = (value: string | null | undefined, label: string) => {
    const text = normalizePersonText(value ?? "") || null;
    if (text && text.length > 120) throw new AppError("VALIDATION_ERROR", 400, `${label} maksimal 120 karakter.`);
    return text;
  };
  if (name.length < 2 || name.length > 120) throw new AppError("VALIDATION_ERROR", 400, "Nama harus berisi 2 sampai 120 karakter.");
  if (church && church.length > 120) throw new AppError("VALIDATION_ERROR", 400, "Nama jemaat maksimal 120 karakter.");
  let whatsappE164: string;
  try {
    whatsappE164 = normalizeIndonesianPhone(input.whatsapp);
  } catch {
    throw new AppError("VALIDATION_ERROR", 400, "Nomor WhatsApp belum valid.");
  }
  return {
    name,
    nameNormalized: normalizeSearchText(name),
    whatsappE164,
    church,
    churchNormalized: church ? normalizeSearchText(church) : null,
    registrationMode: detail(input.registrationMode, "Mode"),
    category: detail(input.category, "Kategori"),
    mupel: detail(input.mupel, "Asal Mupel"),
    participantType: detail(input.participantType, "Tipe"),
    registrationChannel: detail(input.registrationChannel, "Daftar"),
  };
}

export async function listParticipants(options: {
  q: string;
  attendance: string;
  deleted: boolean;
  limit: number;
  cursor?: { createdAt: string; id: string };
}) {
  const event = await getActiveEvent();
  const conditions = [eq(participants.eventId, event.id)];
  conditions.push(options.deleted ? isNotNull(participants.deletedAt) : isNull(participants.deletedAt));
  if (options.attendance === "present") conditions.push(isNotNull(participants.checkedInAt));
  if (options.attendance === "absent") conditions.push(isNull(participants.checkedInAt));
  if (options.q) {
    const normalized = normalizeSearchText(options.q);
    const digits = options.q.replace(/\D/g, "");
    const queryConditions = [
      ilike(participants.nameNormalized, `%${normalized}%`),
      ilike(participants.registrationCode, `%${options.q.trim()}%`),
      ilike(participants.church, `%${normalized}%`),
      ilike(participants.mupel, `%${normalized}%`),
    ];
    if (digits.length >= 5) {
      const phoneSearch = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("8") ? `62${digits}` : digits;
      queryConditions.push(ilike(participants.whatsappE164, `%${phoneSearch}%`));
    }
    conditions.push(or(...queryConditions)!);
  }
  if (options.cursor) {
    conditions.push(sql`(${participants.createdAt}, ${participants.id}) < (${options.cursor.createdAt}::timestamptz, ${options.cursor.id}::uuid)`);
  }
  const rows = await db.select({
    id: participants.id,
    registrationCode: participants.registrationCode,
    name: participants.name,
    whatsappE164: participants.whatsappE164,
    church: participants.church,
    registrationMode: participants.registrationMode,
    category: participants.category,
    mupel: participants.mupel,
    participantType: participants.participantType,
    registrationChannel: participants.registrationChannel,
    checkedInAt: participants.checkedInAt,
    createdAt: participants.createdAt,
    deletedAt: participants.deletedAt,
  }).from(participants).where(and(...conditions)).orderBy(
    ...(options.q ? [desc(sql`CASE WHEN upper(${participants.registrationCode}) = upper(${options.q.trim()}) THEN 1 ELSE 0 END`)] : []),
    desc(participants.createdAt), desc(participants.id),
  ).limit(options.limit + 1);
  const hasMore = rows.length > options.limit;
  const page = hasMore ? rows.slice(0, options.limit) : rows;
  const last = page.at(-1);
  return {
    event: { whatsappTemplate: event.whatsappTemplate, eventDate: event.eventDate },
    participants: page,
    nextCursor: hasMore && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id })).toString("base64url") : null,
  };
}

export async function createParticipant(input: {
  requestId: string;
  name: string;
  whatsapp: string;
  church?: string | null;
  confirmDuplicate: boolean;
} & ParticipantDetailsInput, session: AuthSession) {
  const eventSlug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
  const normalized = normalizeParticipantInput(input);
  return db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.slug, eventSlug)).for("update").limit(1);
    if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");
    const [existing] = await tx.select().from(participants).where(eq(participants.sourceRequestId, input.requestId)).limit(1);
    if (existing) return { participant: existing, duplicateCandidates: [], replayed: true };

    const duplicates = await tx.select({
      id: participants.id, registrationCode: participants.registrationCode, name: participants.name, church: participants.church,
    }).from(participants).where(and(
      eq(participants.eventId, event.id), isNull(participants.deletedAt),
      or(
        eq(participants.whatsappE164, normalized.whatsappE164),
        and(eq(participants.nameNormalized, normalized.nameNormalized), normalized.churchNormalized ? eq(participants.churchNormalized, normalized.churchNormalized) : isNull(participants.churchNormalized)),
      ),
    )).limit(5);
    if (duplicates.length && !input.confirmDuplicate) return { participant: null, duplicateCandidates: duplicates, replayed: false };

    const sequence = event.nextSequence;
    await tx.update(events).set({ nextSequence: sql`${events.nextSequence} + 1`, updatedAt: new Date() }).where(eq(events.id, event.id));
    const registrationCode = `${event.registrationPrefix}${String(sequence).padStart(event.registrationPadding, "0")}`;
    const [participant] = await tx.insert(participants).values({
      eventId: event.id, sequenceNumber: sequence, registrationCode,
      ...normalized, source: "MANUAL", sourceRequestId: input.requestId,
    }).returning();
    await tx.insert(auditLogs).values({
      eventId: event.id, participantId: participant.id, actorRole: session.role,
      actorSessionId: session.sessionId, action: "PARTICIPANT_CREATED", metadata: { source: "MANUAL" },
    });
    return { participant, duplicateCandidates: [], replayed: false };
  });
}

export async function updateParticipant(id: string, input: {
  name: string; whatsapp: string; church?: string | null; confirmDuplicate: boolean;
} & ParticipantDetailsInput, session: AuthSession) {
  const event = await getActiveEvent();
  const normalized = normalizeParticipantInput(input);
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(participants).where(and(
      eq(participants.id, id), eq(participants.eventId, event.id), isNull(participants.deletedAt),
    )).limit(1);
    if (!current) throw new AppError("NOT_FOUND", 404, "Peserta tidak ditemukan.");
    const duplicates = await tx.select({
      id: participants.id, registrationCode: participants.registrationCode, name: participants.name, church: participants.church,
    }).from(participants).where(and(
      eq(participants.eventId, event.id), isNull(participants.deletedAt), ne(participants.id, id),
      or(
        eq(participants.whatsappE164, normalized.whatsappE164),
        and(eq(participants.nameNormalized, normalized.nameNormalized), normalized.churchNormalized ? eq(participants.churchNormalized, normalized.churchNormalized) : isNull(participants.churchNormalized)),
      ),
    )).limit(5);
    if (duplicates.length && !input.confirmDuplicate) return { participant: null, duplicateCandidates: duplicates };
    const details = {
      registrationMode: input.registrationMode === undefined ? current.registrationMode : normalized.registrationMode,
      category: input.category === undefined ? current.category : normalized.category,
      mupel: input.mupel === undefined ? current.mupel : normalized.mupel,
      participantType: input.participantType === undefined ? current.participantType : normalized.participantType,
      registrationChannel: input.registrationChannel === undefined ? current.registrationChannel : normalized.registrationChannel,
    };
    const [participant] = await tx.update(participants).set({ ...normalized, ...details, updatedAt: new Date() }).where(eq(participants.id, id)).returning();
    await tx.insert(auditLogs).values({
      eventId: event.id, participantId: id, actorRole: session.role, actorSessionId: session.sessionId,
      action: "PARTICIPANT_UPDATED", metadata: {},
    });
    return { participant, duplicateCandidates: [] };
  });
}

export async function softDeleteParticipant(id: string, session: AuthSession) {
  const event = await getActiveEvent();
  return db.transaction(async (tx) => {
    const [participant] = await tx.update(participants).set({ deletedAt: new Date(), deletedBySessionId: session.sessionId, updatedAt: new Date() })
      .where(and(eq(participants.id, id), eq(participants.eventId, event.id), isNull(participants.deletedAt))).returning({ id: participants.id });
    if (!participant) throw new AppError("NOT_FOUND", 404, "Peserta tidak ditemukan.");
    await tx.insert(auditLogs).values({ eventId: event.id, participantId: id, actorRole: session.role, actorSessionId: session.sessionId, action: "PARTICIPANT_DELETED", metadata: {} });
    return participant;
  });
}

export async function restoreParticipant(id: string, session: AuthSession) {
  const event = await getActiveEvent();
  return db.transaction(async (tx) => {
    const [participant] = await tx.update(participants).set({ deletedAt: null, deletedBySessionId: null, updatedAt: new Date() })
      .where(and(eq(participants.id, id), eq(participants.eventId, event.id), isNotNull(participants.deletedAt))).returning({ id: participants.id });
    if (!participant) throw new AppError("NOT_FOUND", 404, "Peserta terhapus tidak ditemukan.");
    await tx.insert(auditLogs).values({ eventId: event.id, participantId: id, actorRole: session.role, actorSessionId: session.sessionId, action: "PARTICIPANT_RESTORED", metadata: {} });
    return participant;
  });
}

export async function checkInParticipant(id: string, session: AuthSession) {
  const event = await getActiveEvent();
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(participants).set({
      checkedInAt: new Date(), checkedInBySessionId: session.sessionId, updatedAt: new Date(),
    }).where(and(
      eq(participants.id, id), eq(participants.eventId, event.id),
      isNull(participants.checkedInAt), isNull(participants.deletedAt),
    )).returning();
    if (updated) {
      await tx.insert(auditLogs).values({
        eventId: event.id, participantId: id, actorRole: session.role,
        actorSessionId: session.sessionId, action: "PARTICIPANT_CHECKED_IN", metadata: {},
      });
      return { participant: updated, alreadyCheckedIn: false };
    }
    const [existing] = await tx.select().from(participants).where(and(
      eq(participants.id, id), eq(participants.eventId, event.id), isNull(participants.deletedAt),
    )).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", 404, "Peserta tidak ditemukan atau sudah dihapus.");
    return { participant: existing, alreadyCheckedIn: true };
  });
}

export async function cancelCheckInParticipant(id: string, session: AuthSession) {
  const event = await getActiveEvent();
  return db.transaction(async (tx) => {
    const [participant] = await tx.update(participants).set({
      checkedInAt: null, checkedInBySessionId: null, updatedAt: new Date(),
    }).where(and(
      eq(participants.id, id), eq(participants.eventId, event.id),
      isNotNull(participants.checkedInAt), isNull(participants.deletedAt),
    )).returning();
    if (!participant) throw new AppError("NOT_CHECKED_IN", 409, "Peserta belum tercatat hadir atau tidak ditemukan. Muat ulang data.");
    await tx.insert(auditLogs).values({
      eventId: event.id, participantId: id, actorRole: session.role,
      actorSessionId: session.sessionId, action: "PARTICIPANT_CHECK_IN_CANCELLED", metadata: {},
    });
    return { participant };
  });
}
