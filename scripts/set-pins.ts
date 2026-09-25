import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { hashPin, isPinFormatValid, isPinTooWeak } from "@/lib/auth/password";

config({ path: [".env.local", ".env"] });

let failureStage = "validasi PIN";

async function main() {
  const staffPin = process.env.STAFF_PIN;
  const adminPin = process.env.ADMIN_PIN;

  if (!staffPin || !adminPin) {
    throw new Error("STAFF_PIN dan ADMIN_PIN harus diatur sebelum menjalankan script.");
  }

  if (!isPinFormatValid("STAFF", staffPin) || !isPinFormatValid("ADMIN", adminPin)) {
    throw new Error("Staff PIN harus 4 digit dan Admin PIN harus 6 digit.");
  }

  if (isPinTooWeak(staffPin) || isPinTooWeak(adminPin)) {
    throw new Error("PIN terlalu mudah ditebak atau berisi tanggal acara.");
  }

  const [{ db, pool }, { accessCodes, events }, { getAuthPepper }] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("@/lib/auth/secrets"),
  ]);

  try {
    failureStage = "pemeriksaan acara aktif";
    const eventSlug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
    const [event] = await db
      .select({ eventDate: events.eventDate })
      .from(events)
      .where(eq(events.slug, eventSlug))
      .limit(1);

    if (!event) {
      throw new Error("Event aktif tidak ditemukan. Jalankan seed lebih dulu.");
    }

    if (isPinTooWeak(staffPin, event.eventDate) || isPinTooWeak(adminPin, event.eventDate)) {
      throw new Error("PIN terlalu mudah ditebak atau berisi tanggal acara.");
    }

    failureStage = "pembuatan hash PIN";
    const pepper = getAuthPepper();
    const [staffHash, adminHash] = await Promise.all([
      hashPin(staffPin, pepper),
      hashPin(adminPin, pepper),
    ]);

    failureStage = "penyimpanan ke database";
    for (const [role, pinHash] of [
      ["STAFF", staffHash],
      ["ADMIN", adminHash],
    ] as const) {
      await db
        .insert(accessCodes)
        .values({ role, pinHash, version: 1 })
        .onConflictDoUpdate({
          target: accessCodes.role,
          set: {
            pinHash,
            version: sql`${accessCodes.version} + 1`,
            updatedAt: new Date(),
          },
        });
    }

    console.info("Staff dan Admin PIN berhasil diperbarui. Sesi lama tidak berlaku.");
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const safeMessages = new Set([
    "STAFF_PIN dan ADMIN_PIN harus diatur sebelum menjalankan script.",
    "Staff PIN harus 4 digit dan Admin PIN harus 6 digit.",
    "PIN terlalu mudah ditebak atau berisi tanggal acara.",
    "Event aktif tidak ditemukan. Jalankan seed lebih dulu.",
    "AUTH_PEPPER harus diatur dengan nilai acak minimal 32 byte.",
    "AUTH_PEPPER dan IP_HASH_SECRET harus berbeda.",
  ]);
  if (error instanceof Error && safeMessages.has(error.message)) {
    console.error(error.message);
  } else {
    console.error(`PIN provisioning gagal saat ${failureStage}. Periksa koneksi database dengan npm run db:check.`);
  }
  process.exitCode = 1;
});
