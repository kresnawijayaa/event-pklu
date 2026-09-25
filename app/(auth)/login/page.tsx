import type { Metadata } from "next";
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
      <section className={styles.story} aria-labelledby="event-title">
        <p className={styles.eyebrow}><a href="https://gpibharapanindah.org" target="_blank" rel="noopener noreferrer">GPIB Harapan Indah</a> · 2026</p>
        <div className={styles.storyCopy}>
          <p className={styles.kicker}>Portal panitia</p>
          <h1 id="event-title">Temu<br />PKLU 2026.</h1>
        </div>
        <div className={styles.eventMark} aria-hidden="true">
          <span>Persekutuan Kaum Lanjut Usia</span>
          <span className={styles.year}>2026</span>
        </div>
      </section>
      <div className={styles.seam} aria-hidden="true"><span /></div>
      <section className={styles.access} aria-labelledby="access-title">
        <div className={styles.accessInner}>
          <h2 id="access-title">Masuk.</h2>
          <p className={styles.instruction}>Masukkan PIN panitia untuk melanjutkan.</p>
          <LoginForm />
          <p className={styles.help}>Perlu bantuan akses? Hubungi koordinator panitia.</p>
        </div>
        <footer className={styles.footer}>PKLU 2026 <span>·</span> <a href="https://gpibharapanindah.org" target="_blank" rel="noopener noreferrer">GPIB Harapan Indah</a></footer>
      </section>
    </main>
  );
}
