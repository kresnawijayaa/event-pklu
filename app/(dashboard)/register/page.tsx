import type { Metadata } from "next";
import ParticipantForm from "@/components/participant-form";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Daftarkan peserta | PKLU GPIB 2026" };

export default function RegisterPage() {
  return <div className={styles.page}>
    <h1>Catat peserta</h1>
    <ParticipantForm />
  </div>;
}
