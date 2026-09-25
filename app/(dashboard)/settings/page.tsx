import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SettingsForm from "@/components/settings-form";
import { requireRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import { getEventSettings } from "@/lib/settings";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Pengaturan acara | PKLU GPIB 2026" };

export default async function SettingsPage() {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    if (error instanceof AppError && error.status === 403) redirect("/");
    throw error;
  }
  const data = await getEventSettings();
  return <div className={styles.page}>
    <h1>Pengaturan acara</h1>
    <SettingsForm initial={data} />
  </div>;
}
