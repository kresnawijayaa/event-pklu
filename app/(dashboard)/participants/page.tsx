import type { Metadata } from "next";
import ParticipantList from "@/components/participant-list";
import styles from "./page.module.css";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Peserta | PKLU GPIB 2026" };

export default async function ParticipantsPage() {
  const session = await requireSession();
  return <div className={styles.page}>
    <p className={styles.eyebrow}>Daftar aktif</p>
    <h1>Peserta.</h1>
    <ParticipantList role={session.role} />
  </div>;
}
