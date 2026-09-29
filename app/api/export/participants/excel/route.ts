import { and, asc, eq, isNull } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { auditLogs, events, participants } from "@/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { formatJakartaTimestamp } from "@/lib/csv-export";
import { AppError } from "@/lib/errors";
import { failure } from "@/lib/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireRole(["STAFF", "ADMIN"]);
    const slug = process.env.ACTIVE_EVENT_SLUG ?? "pklu-gpib-2026";
    const [event] = await db.select({ id: events.id, slug: events.slug }).from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");

    const rows = await db.select({
      registrationCode: participants.registrationCode,
      name: participants.name,
      whatsappE164: participants.whatsappE164,
      church: participants.church,
      registrationMode: participants.registrationMode,
      category: participants.category,
      mupel: participants.mupel,
      participantType: participants.participantType,
      registrationChannel: participants.registrationChannel,
      isVip: participants.isVip,
      checkedInAt: participants.checkedInAt,
      createdAt: participants.createdAt,
      source: participants.source,
    }).from(participants).where(and(eq(participants.eventId, event.id), isNull(participants.deletedAt)))
      .orderBy(asc(participants.sequenceNumber));

    const headers = ["Nomor Registrasi", "Nama", "Nomor WhatsApp", "Asal Jemaat", "Mode", "Kategori", "Asal Mupel", "Tipe", "Daftar", "VIP", "Kehadiran", "Terdaftar (WIB)", "Check-in (WIB)", "Sumber"];
    const sheet = XLSX.utils.aoa_to_sheet([
      headers,
      ...rows.map((row) => [
        row.registrationCode, row.name, row.whatsappE164, row.church ?? "",
        row.registrationMode ?? "", row.category ?? "", row.mupel ?? "",
        row.participantType ?? "", row.registrationChannel ?? "", row.isVip ? "Ya" : "Tidak",
        row.checkedInAt ? "Hadir" : "Belum hadir", formatJakartaTimestamp(row.createdAt),
        formatJakartaTimestamp(row.checkedInAt), row.source,
      ]),
    ]);
    sheet["!cols"] = [
      { wch: 21 }, { wch: 30 }, { wch: 21 }, { wch: 25 }, { wch: 19 }, { wch: 19 }, { wch: 19 },
      { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 17 }, { wch: 23 }, { wch: 23 }, { wch: 13 },
    ];
    sheet["!autofilter"] = { ref: `A1:N${Math.max(rows.length + 1, 2)}` };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Peserta");
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "buffer", compression: true }) as Buffer;

    await db.insert(auditLogs).values({
      eventId: event.id, actorRole: session.role, actorSessionId: session.sessionId,
      action: "EXPORT_COMPLETED", metadata: { format: "xlsx", rowCount: rows.length },
    });

    return new Response(new Uint8Array(output), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${event.slug}-peserta.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return failure(error);
  }
}
