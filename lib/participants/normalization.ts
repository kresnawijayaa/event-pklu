export function normalizeIndonesianPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("8") ? `62${digits}` : digits;
  if (!/^62\d{8,13}$/.test(normalized)) throw new Error("Nomor WhatsApp belum valid.");
  return normalized;
}

export function normalizePersonText(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function normalizeSearchText(input: string | null) {
  return input?.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID") ?? "";
}
