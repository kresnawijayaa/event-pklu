import { randomBytes, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { auditLogs, events, participants, sessions } from "@/db/schema";
import { commitImportRows, validateImportRows } from "@/lib/imports";
import { createParticipant, updateParticipant } from "@/lib/participants/service";

const sessionId = randomUUID();
const runId = randomUUID().slice(0, 8);
const rows = Array.from({ length: 663 }, (_, index) => ({
  requestId: randomUUID(),
  name: `Import Fixture ${runId} ${index + 1}`,
  whatsapp: `62812${String(index + 1).padStart(8, "0")}`,
  church: "Jemaat Test",
  registrationMode: index % 2 ? "Mandiri" : "Rombongan",
  category: "Umum",
  mupel: "Jakarta",
  participantType: "Peserta",
  registrationChannel: "Manual",
  confirmDuplicate: false,
}));
const requestIds = rows.map((row) => row.requestId);
const session = { sessionId, role: "ADMIN" as const, expiresAt: new Date(Date.now() + 120_000) };

describe("large participant import", () => {
  beforeAll(async () => {
    const slug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
    const [event] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) throw new Error("Test event missing; run db:seed:test first.");
    await db.insert(sessions).values({
      id: sessionId, tokenHash: randomBytes(32).toString("hex"), role: "ADMIN",
      accessCodeVersion: 1, expiresAt: session.expiresAt,
    });
  });

  afterAll(async () => {
    await db.delete(auditLogs).where(eq(auditLogs.actorSessionId, sessionId));
    await db.delete(participants).where(inArray(participants.sourceRequestId, requestIds));
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    await pool.end();
  });

  it("validates 663 rows, imports sequential batches, and skips identical retries", async () => {
    const validation = await validateImportRows(rows);
    expect(validation).toHaveLength(663);
    expect(validation.every((row) => row.status === "VALID")).toBe(true);
    expect(validation[0].normalized).toMatchObject({
      registrationMode: "Rombongan", category: "Umum", mupel: "Jakarta",
      participantType: "Peserta", registrationChannel: "Manual",
    });

    const firstPass = [];
    for (let offset = 0; offset < rows.length; offset += 100) {
      firstPass.push(await commitImportRows(rows.slice(offset, offset + 100), session));
    }
    expect(firstPass.reduce((count, batch) => count + batch.imported, 0)).toBe(663);
    expect(firstPass.reduce((count, batch) => count + batch.failed, 0)).toBe(0);

    const saved = await db.select({
      sourceRequestId: participants.sourceRequestId, sequenceNumber: participants.sequenceNumber,
      registrationCode: participants.registrationCode, registrationMode: participants.registrationMode,
      category: participants.category, mupel: participants.mupel,
      participantType: participants.participantType, registrationChannel: participants.registrationChannel,
    })
      .from(participants).where(inArray(participants.sourceRequestId, requestIds));
    expect(saved).toHaveLength(663);
    const sequenceByCode = new Map(saved.map((row) => [row.registrationCode, row.sequenceNumber]));
    for (const batch of firstPass) {
      const sequences = batch.results.map((result) => sequenceByCode.get(result.registrationCode!)).sort((a, b) => a! - b!);
      expect(sequences.every((value, index) => value === sequences[0]! + index)).toBe(true);
    }
    expect(new Set(saved.map((row) => row.registrationCode)).size).toBe(663);
    expect(saved.every((row) => row.category === "Umum" && row.mupel === "Jakarta" && row.participantType === "Peserta" && row.registrationChannel === "Manual")).toBe(true);
    expect(new Set(saved.map((row) => row.registrationMode))).toEqual(new Set(["Mandiri", "Rombongan"]));

    const retry = [];
    for (let offset = 0; offset < rows.length; offset += 100) {
      retry.push(await commitImportRows(rows.slice(offset, offset + 100), session));
    }
    expect(retry.reduce((count, batch) => count + batch.skipped, 0)).toBe(663);
    expect(retry.reduce((count, batch) => count + batch.imported, 0)).toBe(0);
  }, 120_000);

  it("stores manual details and preserves omitted details during edits", async () => {
    const requestId = randomUUID();
    requestIds.push(requestId);
    const whatsapp = `62814${randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "7")}`;
    const created = await createParticipant({
      requestId, name: `Manual Details ${runId}`, whatsapp, church: "Jemaat Test",
      registrationMode: "Mandiri", category: "Tuan Rumah", mupel: "Bekasi",
      participantType: "Pendamping", registrationChannel: "Link Amanloka", confirmDuplicate: false,
    }, session);
    expect(created.participant?.registrationMode).toBe("Mandiri");
    const updated = await updateParticipant(created.participant!.id, {
      name: `Manual Details ${runId}`, whatsapp, church: "Jemaat Test",
      registrationMode: "Rombongan", confirmDuplicate: false,
    }, session);
    expect(updated.participant).toMatchObject({
      registrationMode: "Rombongan", category: "Tuan Rumah", mupel: "Bekasi",
      participantType: "Pendamping", registrationChannel: "Link Amanloka",
    });
  });
});
