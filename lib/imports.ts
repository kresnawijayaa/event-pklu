import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, events, participants } from "@/db/schema";
import type { AuthSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import { normalizeParticipantInput } from "@/lib/participants/service";
import type { ParticipantDetailsInput } from "@/lib/participants/details";

export type ImportInputRow = ParticipantDetailsInput & {
  requestId: string;
  name: string;
  whatsapp: string;
  church?: string | null;
};

type NormalizedRow = ImportInputRow & ReturnType<typeof normalizeParticipantInput> & { index: number };
type Candidate = { registrationCode: string; name: string; church: string | null };

function normalizeRows(rows: ImportInputRow[]) {
  return rows.map((row, index) => {
    try {
      return { index, row: { ...row, ...normalizeParticipantInput(row) } as NormalizedRow, error: null };
    } catch (error) {
      return { index, row: null, error: error instanceof Error ? error.message : "Baris tidak valid." };
    }
  });
}

function rowMatches(left: Pick<NormalizedRow, "whatsappE164" | "nameNormalized" | "churchNormalized">, right: Pick<NormalizedRow, "whatsappE164" | "nameNormalized" | "churchNormalized">) {
  return left.whatsappE164 === right.whatsappE164 || (
    left.nameNormalized === right.nameNormalized && left.churchNormalized === right.churchNormalized
  );
}

async function findExistingCandidates(eventId: string, rows: NormalizedRow[]) {
  const phones = [...new Set(rows.map((row) => row.whatsappE164))];
  const names = [...new Set(rows.map((row) => row.nameNormalized))];
  if (!phones.length || !names.length) return [];
  return db.select({
    id: participants.id,
    registrationCode: participants.registrationCode,
    name: participants.name,
    nameNormalized: participants.nameNormalized,
    whatsappE164: participants.whatsappE164,
    church: participants.church,
    churchNormalized: participants.churchNormalized,
  }).from(participants).where(and(
    eq(participants.eventId, eventId), isNull(participants.deletedAt),
    or(inArray(participants.whatsappE164, phones), inArray(participants.nameNormalized, names)),
  ));
}

export async function validateImportRows(rows: ImportInputRow[]) {
  if (rows.length > 1_000) throw new AppError("VALIDATION_ERROR", 400, "Maksimal 1.000 baris per impor.");
  const eventSlug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.slug, eventSlug)).limit(1);
  if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");
  const normalized = normalizeRows(rows);
  const validRows = normalized.flatMap((item) => item.row ? [item.row] : []);
  const existing = await findExistingCandidates(event.id, validRows);
  const earlierRows: NormalizedRow[] = [];
  return normalized.map((item) => {
    if (!item.row) return { index: item.index + 1, requestId: rows[item.index].requestId, status: "ERROR" as const, message: item.error, candidates: [] };
    const matchedExisting = existing.filter((candidate) => rowMatches(item.row!, candidate));
    const matchedFile = earlierRows.filter((candidate) => rowMatches(item.row!, candidate)).map((candidate) => ({
      registrationCode: `Baris ${candidate.index + 1}`, name: candidate.name, church: candidate.church,
    }));
    earlierRows.push(item.row);
    const candidates: Candidate[] = [...matchedExisting, ...matchedFile].slice(0, 5);
    return {
      index: item.index + 1,
      requestId: item.row.requestId,
      status: candidates.length ? "WARNING" as const : "VALID" as const,
      message: candidates.length ? "Nomor WhatsApp atau nama dan jemaat serupa ditemukan." : "Siap diimpor.",
      normalized: {
        name: item.row.name, whatsapp: item.row.whatsappE164, church: item.row.church,
        registrationMode: item.row.registrationMode, category: item.row.category, mupel: item.row.mupel,
        participantType: item.row.participantType, registrationChannel: item.row.registrationChannel,
      },
      candidates,
    };
  });
}

export async function commitImportRows(rows: Array<ImportInputRow & { confirmDuplicate: boolean }>, session: AuthSession) {
  if (rows.length > 100) throw new AppError("VALIDATION_ERROR", 400, "Maksimal 100 baris per batch impor.");
  if (new Set(rows.map((row) => row.requestId)).size !== rows.length) throw new AppError("VALIDATION_ERROR", 400, "requestId dalam batch harus unik.");
  const eventSlug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
  return db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.slug, eventSlug)).for("update").limit(1);
    if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");
    const requestIds = rows.map((row) => row.requestId);
    const prior = requestIds.length ? await tx.select({
      sourceRequestId: participants.sourceRequestId,
      registrationCode: participants.registrationCode,
      name: participants.name,
    }).from(participants).where(inArray(participants.sourceRequestId, requestIds)) : [];
    const priorByRequest = new Map(prior.map((row) => [row.sourceRequestId, row]));
    const normalized = normalizeRows(rows);
    const validRows = normalized.flatMap((item) => item.row ? [item.row] : []);
    const existing = await (async () => {
      const phones = [...new Set(validRows.map((row) => row.whatsappE164))];
      const names = [...new Set(validRows.map((row) => row.nameNormalized))];
      if (!phones.length || !names.length) return [];
      return tx.select({ registrationCode: participants.registrationCode, name: participants.name, nameNormalized: participants.nameNormalized, whatsappE164: participants.whatsappE164, church: participants.church, churchNormalized: participants.churchNormalized })
        .from(participants).where(and(eq(participants.eventId, event.id), isNull(participants.deletedAt), or(inArray(participants.whatsappE164, phones), inArray(participants.nameNormalized, names))));
    })();
    const resultById = new Map<string, { status: "IMPORTED" | "SKIPPED" | "FAILED"; registrationCode?: string; message?: string }>();
    const accepted: Array<{ row: NormalizedRow; confirmed: boolean }> = [];
    const acceptedEarlier: NormalizedRow[] = [];

    for (const item of normalized) {
      const input = rows[item.index];
      const priorRow = priorByRequest.get(input.requestId);
      if (priorRow) {
        resultById.set(input.requestId, { status: "SKIPPED", registrationCode: priorRow.registrationCode, message: "Permintaan impor sebelumnya sudah tersimpan." });
        continue;
      }
      if (!item.row) {
        resultById.set(input.requestId, { status: "FAILED", message: item.error ?? "Baris tidak valid." });
        continue;
      }
      const duplicate = existing.some((candidate) => rowMatches(item.row!, candidate)) || acceptedEarlier.some((candidate) => rowMatches(item.row!, candidate));
      if (duplicate && !input.confirmDuplicate) {
        resultById.set(input.requestId, { status: "FAILED", message: "Duplikat perlu dikonfirmasi sebelum impor." });
        continue;
      }
      accepted.push({ row: item.row, confirmed: input.confirmDuplicate });
      acceptedEarlier.push(item.row);
    }

    if (accepted.length) {
      const firstSequence = event.nextSequence;
      await tx.update(events).set({ nextSequence: sql`${events.nextSequence} + ${accepted.length}`, updatedAt: new Date() }).where(eq(events.id, event.id));
      const inserted = await tx.insert(participants).values(accepted.map(({ row }, offset) => ({
        eventId: event.id,
        sequenceNumber: firstSequence + offset,
        registrationCode: `${event.registrationPrefix}${String(firstSequence + offset).padStart(event.registrationPadding, "0")}`,
        name: row.name,
        nameNormalized: row.nameNormalized,
        whatsappE164: row.whatsappE164,
        church: row.church,
        churchNormalized: row.churchNormalized,
        registrationMode: row.registrationMode,
        category: row.category,
        mupel: row.mupel,
        participantType: row.participantType,
        registrationChannel: row.registrationChannel,
        source: "IMPORT" as const,
        sourceRequestId: row.requestId,
      }))).returning({ sourceRequestId: participants.sourceRequestId, registrationCode: participants.registrationCode });
      const byRequest = new Map(inserted.map((row) => [row.sourceRequestId, row.registrationCode]));
      for (const { row } of accepted) resultById.set(row.requestId, { status: "IMPORTED", registrationCode: byRequest.get(row.requestId) });
      await tx.insert(auditLogs).values({
        eventId: event.id, actorRole: session.role, actorSessionId: session.sessionId,
        action: "IMPORT_COMPLETED", metadata: { imported: accepted.length, batchSize: rows.length },
      });
    }

    const results = rows.map((row) => ({ requestId: row.requestId, ...(resultById.get(row.requestId) ?? { status: "FAILED" as const, message: "Baris tidak diproses." }) }));
    return {
      imported: results.filter((row) => row.status === "IMPORTED").length,
      skipped: results.filter((row) => row.status === "SKIPPED").length,
      failed: results.filter((row) => row.status === "FAILED").length,
      results,
    };
  });
}
