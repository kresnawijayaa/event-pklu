import { z } from "zod";
import { requireRole } from "@/lib/auth/permissions";
import { hasSameOrigin } from "@/lib/auth/origin";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";
import { getEventSettings, updateEventSettings } from "@/lib/settings";

export const runtime = "nodejs";

const templateTokens = new Set(["nama", "nomor", "jemaat", "tanggal"]);
const settingsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Tanggal acara tidak valid."),
  registrationPrefix: z.string().regex(/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-$/).max(20),
  whatsappTemplate: z.string().trim().min(1).max(5_000).refine((template) => {
    const tokens = [...template.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1]);
    return tokens.every((token) => templateTokens.has(token)) && tokens.includes("nama") && tokens.includes("nomor");
  }, "Template perlu memuat {{nama}} dan {{nomor}}. Token yang tersedia: {{nama}}, {{nomor}}, {{jemaat}}, {{tanggal}}."),
});

export async function GET() {
  try {
    await requireRole(["STAFF", "ADMIN"]);
    return success(await getEventSettings());
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    if (!hasSameOrigin(request)) throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    const session = await requireRole(["STAFF", "ADMIN"]);
    const input = settingsSchema.parse(await request.json().catch(() => null));
    return success(await updateEventSettings(input, session));
  } catch (error) { return failure(error); }
}
