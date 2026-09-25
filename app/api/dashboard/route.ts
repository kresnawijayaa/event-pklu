import { requireSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/dashboard";
import { AppError } from "@/lib/errors";
import { failure, success } from "@/lib/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
    const summary = await getDashboardSummary();
    if (!summary) throw new AppError("EVENT_NOT_FOUND", 404, "Acara aktif belum tersedia.");
    return success(summary);
  } catch (error) {
    return failure(error);
  }
}
