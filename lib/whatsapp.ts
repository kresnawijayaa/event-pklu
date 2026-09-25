export function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`));
}

export function renderWhatsAppMessage(template: string, input: {
  name: string; registrationCode: string; church: string | null; eventDate: string;
}) {
  let message = template;
  const replacements: Record<string, string> = {
    nama: input.name,
    nomor: input.registrationCode,
    jemaat: input.church ?? "",
    tanggal: formatEventDate(input.eventDate),
  };
  for (const [key, value] of Object.entries(replacements)) {
    message = message.replaceAll(`{{${key}}}`, value);
  }
  if (!input.church) {
    message = message.replace(/^[\t ]*Asal jemaat:[\t ]*\r?\n?/gim, "");
  }
  return message.trim();
}

export function createWhatsAppUrl(phoneE164: string, message: string) {
  if (!/^62\d{8,13}$/.test(phoneE164)) throw new Error("Nomor WhatsApp belum valid.");
  return `https://wa.me/${phoneE164}?text=${encodeURIComponent(message)}`;
}
