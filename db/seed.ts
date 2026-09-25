import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { events } from "./schema";

const eventSlug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";

const defaultEvent = {
  slug: eventSlug,
  name: "PKLU GPIB 2026",
  eventDate: "2026-10-12",
  timezone: "Asia/Jakarta",
  targetParticipants: 645,
  registrationPrefix: "PKLU-",
  registrationPadding: 3,
  nextSequence: 1,
  whatsappTemplate: `Halo Bapak/Ibu {{nama}},

Terima kasih telah terdaftar sebagai peserta *PKLU GPIB 2026*.

*KODE REGISTRASI ANDA*
*{{nomor}}*

Asal jemaat: {{jemaat}}
Tanggal kegiatan: {{tanggal}}

Mohon tunjukkan kode registrasi ini kepada panitia saat check-in.

Sampai jumpa. Tuhan memberkati.`,
  isActive: true,
};

async function main() {
  try {
    await db.insert(events).values(defaultEvent).onConflictDoNothing({
      target: events.slug,
    });

    const [seededEvent] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, eventSlug))
      .limit(1);

    if (!seededEvent) {
      throw new Error("Seed event tidak ditemukan setelah insert.");
    }

    console.info(`Seed event tersedia: ${eventSlug}`);
  } finally {
    await pool.end();
  }
}

void main();
