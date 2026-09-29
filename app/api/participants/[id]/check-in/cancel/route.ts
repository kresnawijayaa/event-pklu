import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { hasSameOrigin } from "@/lib/auth/origin";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";
import { cancelCheckInParticipant } from "@/lib/participants/service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(request)) throw new AppError("INVALID_ORIGIN", 403, "Permintaan tidak berasal dari aplikasi ini.");
    const session = await requireSession();
    const { id } = await context.params;
    z.string().uuid().parse(id);
    return success(await cancelCheckInParticipant(id, session));
  } catch (error) { return failure(error); }
}
