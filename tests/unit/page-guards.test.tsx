import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import LoginPage from "@/app/(auth)/login/page";
import DashboardLayout from "@/app/(dashboard)/layout";
import { requireSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`Redirect to ${path}`); }),
  usePathname: vi.fn(() => "/"),
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));

const session = { sessionId: "test-session", role: "STAFF" as const, expiresAt: new Date("2026-10-12T00:00:00Z") };

describe("page session routing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends an active session from login to dashboard", async () => {
    vi.mocked(requireSession).mockResolvedValue(session);
    await expect(LoginPage()).rejects.toThrow("Redirect to /");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("shows login when session is missing", async () => {
    vi.mocked(requireSession).mockRejectedValue(new AppError("UNAUTHENTICATED", 401, "Session missing"));
    const page = await LoginPage();
    expect(page.type).toBe("main");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends an unauthenticated dashboard request to login", async () => {
    vi.mocked(requireSession).mockRejectedValue(new AppError("UNAUTHENTICATED", 401, "Session missing"));
    await expect(DashboardLayout({ children: null })).rejects.toThrow("Redirect to /login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders dashboard when session is valid", async () => {
    vi.mocked(requireSession).mockResolvedValue(session);
    const page = await DashboardLayout({ children: null });
    expect(page.props.role).toBe("STAFF");
    expect(redirect).not.toHaveBeenCalled();
  });
});
