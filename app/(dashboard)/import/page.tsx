import { redirect } from "next/navigation";
import type { Metadata } from "next";
import ImportTool from "@/components/import-tool";
import { requireRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Impor peserta | PKLU GPIB 2026" };

export default async function ImportPage() {
  try { await requireRole(["ADMIN"]); }
  catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    if (error instanceof AppError && error.status === 403) redirect("/");
    throw error;
  }
  return <div className={styles.page}>
    <h1>Impor peserta</h1>
    <ImportTool />
  </div>;
}
