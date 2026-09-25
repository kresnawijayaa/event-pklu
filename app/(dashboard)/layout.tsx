import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import DashboardShell from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    throw error;
  }

  return <DashboardShell role={session.role}>{children}</DashboardShell>;
}
