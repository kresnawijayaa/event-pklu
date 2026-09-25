import { redirect } from "next/navigation";
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
    { label: "Sudah terdaftar", value: summary.registered },
    { label: "Sudah hadir", value: summary.checkedIn },
    { label: "Belum hadir", value: summary.notCheckedIn },
    { label: "WhatsApp terkonfirmasi", value: summary.whatsappConfirmed },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>Ringkasan acara</h1>
          <p className={styles.date}>{summary.event.name} <span aria-hidden="true">·</span> {formatEventDate(summary.event.eventDate)}</p>
        </div>
        <div className={styles.progress} aria-label={`${summary.registered} dari target ${summary.event.target} peserta terdaftar`}>
          <span>Target pendaftaran</span>
          <strong>{summary.registered}<small> / {summary.event.target}</small></strong>
          <div className={styles.track}><span style={{ width: `${Math.min(100, (summary.registered / summary.event.target) * 100)}%` }} /></div>
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
    </div>
  );
}
