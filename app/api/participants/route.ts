import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { hasSameOrigin } from "@/lib/auth/origin";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";
import { createParticipant, listParticipants } from "@/lib/participants/service";
import { participantDetailsSchema } from "@/lib/participants/details";

export const runtime = "nodejs";

const createSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().max(500),
  whatsapp: z.string().max(40),
  church: z.string().max(500).nullable().optional(),
  isVip: z.boolean().default(false),
  ...participantDetailsSchema,
  confirmDuplicate: z.boolean().default(false),
});
const cursorSchema = z.object({ createdAt: z.string().datetime(), id: z.string().uuid() });

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const deleted = params.get("deleted") === "true";
    if (deleted) await requireRole(["ADMIN"]);
    else await requireSession();
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 50) || 50));
    let cursor: z.infer<typeof cursorSchema> | undefined;
    const encoded = params.get("cursor");
    if (encoded) {
      try {
        const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
        cursor = cursorSchema.parse(parsed);
      } catch {
        throw new AppError("VALIDATION_ERROR", 400, "Cursor daftar tidak valid.");
      }
    }
    const attendance = params.get("attendance") ?? "all";
    if (!["all", "present", "absent"].includes(attendance)) {
      throw new AppError("VALIDATION_ERROR", 400, "Filter daftar tidak valid.");
    }
    const result = await listParticipants({
      q: params.get("q")?.slice(0, 120) ?? "", attendance,
      deleted, limit, cursor,
    });
    return success(result);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    const session = await requireSession();
    const input = createSchema.parse(await request.json().catch(() => null));
    const result = await createParticipant(input, session);
    if (result.duplicateCandidates.length && !result.participant) {
      return NextResponse.json({ ok: false, error: {
        code: "DUPLICATE_WARNING", message: "Data serupa ditemukan. Periksa sebelum melanjutkan.",
        candidates: result.duplicateCandidates,
      } }, { status: 409 });
    }
    return success({ participant: result.participant, requestId: input.requestId }, result.replayed ? 200 : 201);
  } catch (error) {
    return failure(error);
  }
}
