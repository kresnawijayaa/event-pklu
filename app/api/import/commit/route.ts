import { z } from "zod";
import { requireRole } from "@/lib/auth/permissions";
import { hasSameOrigin } from "@/lib/auth/origin";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";
import { commitImportRows } from "@/lib/imports";
import { participantDetailsSchema } from "@/lib/participants/details";

export const runtime = "nodejs";

const payloadSchema = z.object({ rows: z.array(z.object({
  requestId: z.string().uuid(), name: z.string().max(500), whatsapp: z.string().max(60),
  church: z.string().max(500).nullable().optional(), confirmDuplicate: z.boolean().default(false),
  ...participantDetailsSchema,
})).min(1).max(100) });

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    const session = await requireRole(["STAFF", "ADMIN"]);
    const input = payloadSchema.parse(await request.json().catch(() => null));
    return success(await commitImportRows(input.rows, session));
  } catch (error) { return failure(error); }
}
