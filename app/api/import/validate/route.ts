import { z } from "zod";
import { requireRole } from "@/lib/auth/permissions";
import { hasSameOrigin } from "@/lib/auth/origin";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";
import { validateImportRows } from "@/lib/imports";
import { participantDetailsSchema } from "@/lib/participants/details";

export const runtime = "nodejs";

const rowSchema = z.object({
  requestId: z.string().uuid(), name: z.string().max(500), whatsapp: z.string().max(60), church: z.string().max(500).nullable().optional(),
  ...participantDetailsSchema,
});
const payloadSchema = z.object({ rows: z.array(rowSchema).min(1).max(1_000) }).refine(
  ({ rows }) => new Set(rows.map((row) => row.requestId)).size === rows.length,
  "requestId setiap baris harus unik.",
);

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    await requireRole(["STAFF", "ADMIN"]);
    const input = payloadSchema.parse(await request.json().catch(() => null));
    return success({ rows: await validateImportRows(input.rows) });
  } catch (error) { return failure(error); }
}
