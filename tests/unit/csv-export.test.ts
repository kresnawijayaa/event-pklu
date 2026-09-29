import { describe, expect, it } from "vitest";
import { buildParticipantsCsv, formatJakartaTimestamp, protectCsvCell } from "@/lib/csv-export";

describe("participant CSV export", () => {
  it("prefixes spreadsheet formulas even after leading whitespace", () => {
    for (const input of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "  =HYPERLINK(A1)", "\t=1+1"]) {
      expect(protectCsvCell(input)).toBe(`"'${input}"`);
    }
    expect(protectCsvCell('Ruth "PKLU"')).toBe('"Ruth ""PKLU"""');
  });

  it("writes BOM, complete headers, and Jakarta timestamps", () => {
    const createdAt = new Date("2026-10-11T17:05:06.000Z");
    const csv = buildParticipantsCsv([{
      registrationCode: "PKLU-001", name: "=Ruth", whatsappE164: "6281234567890", church: null,
      registrationMode: "Rombongan", category: "Umum", mupel: "Jakarta",
      participantType: "Peserta", registrationChannel: "Manual",
      createdAt, checkedInAt: null,
    }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Terdaftar (WIB)");
    expect(csv).toContain('"Mode","Kategori","Asal Mupel","Tipe","Daftar"');
    expect(csv).toContain('"Rombongan","Umum","Jakarta","Peserta","Manual"');
    expect(csv).toContain('"\'=Ruth"');
    expect(csv).toContain('"2026-10-12 00:05:06"');
    expect(formatJakartaTimestamp(null)).toBe("");
  });
});
