import type { Metadata } from "next";
import ParticipantForm from "@/components/participant-form";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Tambah peserta | PKLU GPIB 2026" };

export default function RegisterPage() {
  return <div className={styles.page}>
    <h1>Tambah peserta</h1>
    <p className={styles.note}>Nomor registrasi dibuat otomatis setelah data disimpan.</p>
    <ParticipantForm />
  </div>;
}
