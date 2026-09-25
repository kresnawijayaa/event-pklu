import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { hashPin, isPinFormatValid, isPinTooWeak, verifyPin } from "@/lib/auth/password";
import { sessionCookieOptions } from "@/lib/auth/cookies";
import { roleIsAllowed } from "@/lib/auth/role-policy";
import { createSessionToken, hashSessionToken } from "@/lib/auth/session-token";
import { isLoginBlocked } from "@/lib/auth/rate-limit-policy";
import { hashIp, trustedClientIp } from "@/lib/auth/ip";
import { requireRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { normalizeIndonesianPhone, normalizeSearchText } from "@/lib/participants/normalization";
import { createWhatsAppUrl, renderWhatsAppMessage } from "@/lib/whatsapp";

vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));

describe("PIN policy", () => {
  it("requires four staff digits and six admin digits", () => {
    expect(isPinFormatValid("STAFF", "4827")).toBe(true);
    expect(isPinFormatValid("STAFF", "48270")).toBe(false);
    expect(isPinFormatValid("ADMIN", "735914")).toBe(true);
    expect(isPinFormatValid("ADMIN", "73591")).toBe(false);
  });

  it("rejects common, repeated, and event-date PINs", () => {
    expect(isPinTooWeak("0000")).toBe(true);
    expect(isPinTooWeak("1234")).toBe(true);
    expect(isPinTooWeak("111111")).toBe(true);
    expect(isPinTooWeak("2026", "2026-10-12")).toBe(true);
    expect(isPinTooWeak("735914", "2026-10-12")).toBe(false);
  });
});

describe("role policy", () => {
  it("allows only listed roles", () => {
    expect(roleIsAllowed("STAFF", ["STAFF", "ADMIN"])).toBe(true);
    expect(roleIsAllowed("STAFF", ["ADMIN"])).toBe(false);
    expect(roleIsAllowed("ADMIN", ["ADMIN"])).toBe(true);
  });

  it("denies staff through the server role guard for admin-only actions", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce({
      sessionId: "session-test",
      role: "STAFF",
      expiresAt: new Date("2026-10-12T00:00:00.000Z"),
    });

    await expect(requireRole(["ADMIN"])).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });
});

describe("login rate limit policy", () => {
  const now = new Date("2026-10-12T01:00:00.000Z");

  it("blocks only until the stored deadline", () => {
    expect(isLoginBlocked(new Date(now.getTime() + 1), now)).toBe(true);
    expect(isLoginBlocked(now, now)).toBe(false);
    expect(isLoginBlocked(null, now)).toBe(false);
  });

  it("uses trusted Vercel IP header and hashes without exposing IP", () => {
    const ip = trustedClientIp(
      new Headers({ "x-vercel-forwarded-for": "203.0.113.5, 10.0.0.1" }),
    );
    const secret = randomBytes(32).toString("hex");
    const hash = hashIp(ip, secret);

    expect(ip).toBe("203.0.113.5");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(ip);
    expect(trustedClientIp(new Headers())).toBe("unknown");
  });
});

describe("session tokens", () => {
  it("creates a random 32-byte token and stores only a SHA-256-sized hash", () => {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);

    expect(token).toHaveLength(43);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).not.toBe(token);
    expect(hashSessionToken(token)).toBe(tokenHash);
  });

  it("sets session cookie security attributes", () => {
    const expires = new Date("2026-10-12T00:00:00.000Z");
    const options = sessionCookieOptions(expires);

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBe(expires);
  });
});

describe("PIN hashing", () => {
  it("verifies bcrypt hash created with pepper", async () => {
    const pepper = randomBytes(32).toString("hex");
    const hash = await hashPin("4827", pepper);

    expect(hash).not.toContain("4827");
    await expect(verifyPin("4827", pepper, hash)).resolves.toBe(true);
    await expect(verifyPin("0000", pepper, hash)).resolves.toBe(false);
  });
});

describe("participant normalization", () => {
  it("normalizes Indonesian mobile numbers into E.164 digits", () => {
    expect(normalizeIndonesianPhone("0812 3456-7890")).toBe("6281234567890");
    expect(normalizeIndonesianPhone("81234567890")).toBe("6281234567890");
    expect(normalizeIndonesianPhone("+62 812-3456-7890")).toBe("6281234567890");
    expect(() => normalizeIndonesianPhone("12345")).toThrow("Nomor WhatsApp belum valid.");
  });

  it("normalizes name search independent of accents and spacing", () => {
    expect(normalizeSearchText("  José   Maria ")).toBe("jose maria");
  });
});

describe("WhatsApp message helpers", () => {
  const template = "Halo {{nama}}, kode {{nomor}}.\nAsal jemaat: {{jemaat}}\nTanggal: {{tanggal}}";

  it("fills message details and removes the whole church line when empty", () => {
    const message = renderWhatsAppMessage(template, {
      name: "Maria Salome", registrationCode: "PKLU-012", church: null, eventDate: "2026-10-12",
    });
    expect(message).toContain("Halo Maria Salome, kode PKLU-012.");
    expect(message).not.toContain("Asal jemaat:");
    expect(message).toContain("12 Oktober 2026");
  });

  it("creates an encoded wa.me link for an E.164 phone", () => {
    expect(createWhatsAppUrl("6281234567890", "Halo Maria\nPKLU-012")).toBe(
      "https://wa.me/6281234567890?text=Halo%20Maria%0APKLU-012",
    );
    expect(() => createWhatsAppUrl("081234567890", "Halo")).toThrow("Nomor WhatsApp belum valid.");
  });
});
