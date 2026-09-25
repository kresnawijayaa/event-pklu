import type { Metadata } from "next";
import ParticipantForm from "@/components/participant-form";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Daftarkan peserta | PKLU GPIB 2026" };

export default function RegisterPage() {
  return <div className={styles.page}>
    <p className={styles.eyebrow}>Registrasi manual</p>
    <h1>Catat peserta.</h1>
    <p className={styles.intro}>Nomor registrasi dibuat otomatis setelah data disimpan.</p>
    <ParticipantForm />
  </div>;
}
