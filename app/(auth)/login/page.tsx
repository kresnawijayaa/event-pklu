import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import LoginForm from "@/components/login-form";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Masuk | PKLU GPIB 2026" };

export default async function LoginPage() {
  let hasSession = true;
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof AppError && error.status === 401) hasSession = false;
    else throw error;
  }
  if (hasSession) redirect("/");

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="access-title">
        <header className={styles.brand}>
          <div className={styles.brandIdentity}><Image src="/pklu-hut-16.png" width={44} height={44} alt="Logo HUT ke-16 Pelkat PKLU GPIB" priority /><strong>PKLU <span>2026</span></strong></div>
          <a href="https://gpib.or.id" target="_blank" rel="noopener noreferrer">GPIB</a>
        </header>
        <div className={styles.content}>
          <h1 id="access-title">Masuk panitia</h1>
          <p className={styles.instruction}>Masukkan PIN untuk melanjutkan.</p>
          <LoginForm />
          <p className={styles.help}><Link href="/panduan">Baca panduan penggunaan</Link><span> · </span>Perlu bantuan akses? Hubungi koordinator panitia.</p>
        </div>
      </section>
    </main>
  );
}
