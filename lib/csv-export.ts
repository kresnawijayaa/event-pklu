export function protectCsvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function formatJakartaTimestamp(value: Date | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

export function buildParticipantsCsv(rows: Array<{
  registrationCode: string; isVip?: boolean; name: string; whatsappE164: string; church: string | null;
  registrationMode?: string | null; category?: string | null; mupel?: string | null;
  participantType?: string | null; registrationChannel?: string | null;
  createdAt: Date; checkedInAt: Date | null;
}>) {
  const values: Array<Array<string | number | null | undefined>> = [
    ["Nomor Registrasi", "VIP", "Nama", "WhatsApp", "Asal Jemaat", "Mode", "Kategori", "Asal Mupel", "Tipe", "Daftar", "Terdaftar (WIB)", "Check-in (WIB)"],
    ...rows.map((row) => [row.registrationCode, row.isVip ? "Ya" : "Tidak", row.name, row.whatsappE164, row.church,
      row.registrationMode, row.category, row.mupel, row.participantType, row.registrationChannel,
      formatJakartaTimestamp(row.createdAt), formatJakartaTimestamp(row.checkedInAt)]),
  ];
  return `\uFEFF${values.map((line) => line.map(protectCsvCell).join(",")).join("\r\n")}`;
}
