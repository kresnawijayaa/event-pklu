import { requireSession } from "@/lib/auth/session";
import { failure, success } from "@/lib/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireSession();
    return success({ role: session.role, expiresAt: session.expiresAt.toISOString() });
  } catch (error) {
    return failure(error);
  }
}
