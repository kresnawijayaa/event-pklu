import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboardSummary } from "@/lib/dashboard";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  if (!summary) redirect("/login");

  const metrics = [
    { label: "Total peserta", value: summary.registered },
    { label: "Hadir", value: summary.checkedIn },
    { label: "Belum hadir", value: summary.notCheckedIn },
    { label: "WhatsApp terkonfirmasi", value: summary.whatsappConfirmed },
  ];
  const pendingWhatsApp = summary.registered - summary.whatsappConfirmed;
  const nextAction = summary.registered === 0
    ? { title: "Mulai dari data peserta", detail: "Tambahkan satu peserta atau impor file Excel yang sudah lengkap nomornya.", href: "/import", label: "Impor peserta" }
    : pendingWhatsApp > 0
      ? { title: `${pendingWhatsApp.toLocaleString("id-ID")} WhatsApp belum dikonfirmasi`, detail: "Gunakan filter WhatsApp di daftar peserta, kirim pesan, lalu tandai yang sudah terkirim.", href: "/participants", label: "Lihat peserta" }
      : summary.notCheckedIn > 0
        ? { title: "Data peserta siap untuk check-in", detail: "Saat peserta datang, cari nama atau kode PKLU lalu catat kehadirannya.", href: "/check-in", label: "Buka check-in" }
        : { title: "Semua peserta sudah tercatat hadir", detail: "Ringkasan di atas menunjukkan data terbaru yang tersimpan.", href: "/participants", label: "Lihat peserta" };

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>Ringkasan acara</h1>
          <p className={styles.date}>{summary.event.name} <span aria-hidden="true">·</span> {formatEventDate(summary.event.eventDate)}</p>
        </div>
      </div>
      <section className={styles.metrics} aria-label="Statistik acara">
        {metrics.map((metric, index) => (
          <article className={styles.metric} key={metric.label}>
            <p>{metric.label}</p>
            <strong className={index === 0 ? styles.primaryValue : undefined}>{metric.value.toLocaleString("id-ID")}</strong>
          </article>
        ))}
      </section>
      <section className={styles.nextAction} aria-labelledby="next-action-title">
        <div><p>Langkah berikutnya</p><h2 id="next-action-title">{nextAction.title}</h2><span>{nextAction.detail}</span></div>
        <Link href={nextAction.href}>{nextAction.label}</Link>
      </section>
      <section className={styles.workflow} aria-labelledby="workflow-title">
        <div className={styles.workflowHeading}><h2 id="workflow-title">Urutan kerja</h2><Link href="/panduan">Baca panduan</Link></div>
        <ol>
          <li><span className={styles.stepNumber}>1</span><div><strong>Masukkan data</strong><p>Impor file Excel atau tambahkan satu peserta.</p></div><div className={styles.stepLinks}><Link href="/import">Impor</Link><Link href="/register">Tambah peserta</Link></div></li>
          <li><span className={styles.stepNumber}>2</span><div><strong>Kirim undangan</strong><p>Buka WhatsApp dari daftar peserta, kirim pesan, lalu konfirmasi.</p></div><div className={styles.stepLinks}><Link href="/participants">Lihat peserta</Link></div></li>
          <li><span className={styles.stepNumber}>3</span><div><strong>Catat kehadiran</strong><p>Cari peserta saat datang, lalu pilih Catat hadir.</p></div><div className={styles.stepLinks}><Link href="/check-in">Check-in</Link></div></li>
        </ol>
      </section>
    </div>
  );
}
