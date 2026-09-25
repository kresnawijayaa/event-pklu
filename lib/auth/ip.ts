import { createHmac } from "node:crypto";

export function hashIp(ip: string, secret: string) {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function trustedClientIp(headers: Headers) {
  const forwarded = headers.get("x-vercel-forwarded-for");
  return forwarded?.split(",", 1)[0]?.trim() || "unknown";
}
