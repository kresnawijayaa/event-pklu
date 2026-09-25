import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { hasSameOrigin } from "@/lib/auth/origin";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";
import { softDeleteParticipant, updateParticipant } from "@/lib/participants/service";
import { participantDetailsSchema } from "@/lib/participants/details";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().max(500), whatsapp: z.string().max(40),
  church: z.string().max(500).nullable().optional(), confirmDuplicate: z.boolean().default(false),
  ...participantDetailsSchema,
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(request)) throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    const session = await requireSession();
    const { id } = await context.params;
    z.string().uuid().parse(id);
    const input = updateSchema.parse(await request.json().catch(() => null));
    const result = await updateParticipant(id, input, session);
    if (result.duplicateCandidates.length && !result.participant) {
      return NextResponse.json({ ok: false, error: { code: "DUPLICATE_WARNING", message: "Data serupa ditemukan. Periksa sebelum melanjutkan.", candidates: result.duplicateCandidates } }, { status: 409 });
    }
    return success({ participant: result.participant });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(request)) throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    const session = await requireRole(["ADMIN"]);
    const { id } = await context.params;
    z.string().uuid().parse(id);
    return success(await softDeleteParticipant(id, session));
  } catch (error) { return failure(error); }
}
