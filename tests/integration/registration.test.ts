import { randomBytes, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { auditLogs, events, participants, sessions } from "@/db/schema";
import { checkInParticipant, createParticipant, restoreParticipant, softDeleteParticipant } from "@/lib/participants/service";
import { getEventSettings, updateEventSettings } from "@/lib/settings";

const sessionId = randomUUID();
const createdIds: string[] = [];

describe("participant registration transaction", () => {
  beforeAll(async () => {
    const slug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
    const [event] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) throw new Error("Test event missing; run db:seed:test first.");
    await db.insert(sessions).values({
      id: sessionId,
      tokenHash: randomBytes(32).toString("hex"),
      role: "STAFF",
      accessCodeVersion: 1,
      expiresAt: new Date(Date.now() + 60_000),
    });
  });

  afterAll(async () => {
    if (createdIds.length) {
      await db.delete(auditLogs).where(inArray(auditLogs.participantId, createdIds));
      await db.delete(participants).where(inArray(participants.id, createdIds));
    }
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    await pool.end();
  });

  it("allocates unique registration numbers for concurrent requests", async () => {
    const suffix = randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "7");
    const requests = Array.from({ length: 10 }, (_, index) => createParticipant({
      requestId: randomUUID(),
      name: `Integration Participant ${suffix} ${index}`,
      whatsapp: `62812${suffix}${String(index).padStart(1, "0")}`,
      confirmDuplicate: false,
    }, { sessionId, role: "STAFF", expiresAt: new Date(Date.now() + 60_000) }));
    const results = await Promise.all(requests);
    const registrations = results.map((result) => {
      expect(result.participant).toBeTruthy();
      createdIds.push(result.participant!.id);
      return result.participant!.registrationCode;
    });
    expect(new Set(registrations).size).toBe(10);
    expect(registrations.every((code) => /^PKLU-\d+$/.test(code))).toBe(true);
  });

  it("keeps the first check-in timestamp when requests repeat concurrently", async () => {
    const suffix = randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "7");
    const created = await createParticipant({
      requestId: randomUUID(), name: `Checkin Participant ${suffix}`,
      whatsapp: `62813${suffix}9`, confirmDuplicate: false,
    }, { sessionId, role: "STAFF", expiresAt: new Date(Date.now() + 60_000) });
    const participantId = created.participant!.id;
    createdIds.push(participantId);
    const checkins = await Promise.all([
      checkInParticipant(participantId, { sessionId, role: "STAFF", expiresAt: new Date(Date.now() + 60_000) }),
      checkInParticipant(participantId, { sessionId, role: "STAFF", expiresAt: new Date(Date.now() + 60_000) }),
    ]);
    expect(checkins.map((item) => item.alreadyCheckedIn).sort()).toEqual([false, true]);
    expect(checkins[0].participant.checkedInAt?.toISOString()).toBe(checkins[1].participant.checkedInAt?.toISOString());
  });

  it("soft-deletes and restores without losing the participant", async () => {
    const suffix = randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "7");
    const created = await createParticipant({
      requestId: randomUUID(), name: `Restore Participant ${suffix}`,
      whatsapp: `62815${suffix}9`, confirmDuplicate: false,
    }, { sessionId, role: "STAFF", expiresAt: new Date(Date.now() + 60_000) });
    const participantId = created.participant!.id;
    createdIds.push(participantId);
    const adminSession = { sessionId, role: "ADMIN" as const, expiresAt: new Date(Date.now() + 60_000) };
    await softDeleteParticipant(participantId, adminSession);
    const deleted = await db.select({ deletedAt: participants.deletedAt }).from(participants).where(eq(participants.id, participantId)).limit(1);
    expect(deleted[0]?.deletedAt).toBeInstanceOf(Date);
    await restoreParticipant(participantId, adminSession);
    const restored = await db.select({ deletedAt: participants.deletedAt }).from(participants).where(eq(participants.id, participantId)).limit(1);
    expect(restored[0]?.deletedAt).toBeNull();
  });

  it("requires confirmation before saving duplicate contact details", async () => {
    const suffix = randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "7");
    const phone = `62816${suffix}9`;
    const first = await createParticipant({
      requestId: randomUUID(), name: `Original Participant ${suffix}`, whatsapp: phone, confirmDuplicate: false,
    }, { sessionId, role: "STAFF", expiresAt: new Date(Date.now() + 60_000) });
    createdIds.push(first.participant!.id);
    const retryId = randomUUID();
    const warning = await createParticipant({
      requestId: retryId, name: `Different Participant ${suffix}`, whatsapp: phone, confirmDuplicate: false,
    }, { sessionId, role: "STAFF", expiresAt: new Date(Date.now() + 60_000) });
    expect(warning.participant).toBeNull();
    expect(warning.duplicateCandidates[0]?.registrationCode).toBe(first.participant!.registrationCode);
    const confirmed = await createParticipant({
      requestId: retryId, name: `Different Participant ${suffix}`, whatsapp: phone, confirmDuplicate: true,
    }, { sessionId, role: "STAFF", expiresAt: new Date(Date.now() + 60_000) });
    createdIds.push(confirmed.participant!.id);
    expect(confirmed.participant?.name).toBe(`Different Participant ${suffix}`);
  });

  it("uses a changed registration prefix for new participants", async () => {
    const settings = await getEventSettings();
    const session = { sessionId, role: "STAFF" as const, expiresAt: new Date(Date.now() + 60_000) };
    const changedPrefix = settings.event.registrationPrefix === "TEST-" ? "NEW-" : "TEST-";
    const originalCode = (await db.select({ registrationCode: participants.registrationCode })
      .from(participants).where(eq(participants.id, createdIds[0])).limit(1))[0].registrationCode;
    try {
      await updateEventSettings({
        name: settings.event.name,
        eventDate: settings.event.eventDate,
        registrationPrefix: changedPrefix,
        whatsappTemplate: settings.event.whatsappTemplate,
      }, session);
      const suffix = randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "7");
      const created = await createParticipant({
        requestId: randomUUID(), name: `New Prefix ${suffix}`,
        whatsapp: `62819${suffix}9`, confirmDuplicate: false,
      }, session);
      createdIds.push(created.participant!.id);
      expect(created.participant!.registrationCode.startsWith(changedPrefix)).toBe(true);
      const [existing] = await db.select({ registrationCode: participants.registrationCode })
        .from(participants).where(eq(participants.id, createdIds[0])).limit(1);
      expect(existing.registrationCode).toBe(originalCode);
    } finally {
      await updateEventSettings({
        name: settings.event.name,
        eventDate: settings.event.eventDate,
        registrationPrefix: settings.event.registrationPrefix,
        whatsappTemplate: settings.event.whatsappTemplate,
      }, session);
    }
  });
});
