import { redirect } from "next/navigation";
import type { Metadata } from "next";
import ParticipantList from "@/components/participant-list";
import { requireRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "Peserta terhapus | PKLU GPIB 2026" };

export default async function DeletedParticipantsPage() {
  try {
    await requireRole(["ADMIN"]);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    if (error instanceof AppError && error.status === 403) redirect("/participants");
    throw error;
  }
  return <div className={styles.page}>
    <h1>Peserta terhapus</h1>
    <ParticipantList role="ADMIN" deleted />
  </div>;
}
