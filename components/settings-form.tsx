"use client";

import { useState, type FormEvent } from "react";
import { formatEventDate, renderWhatsAppMessage } from "@/lib/whatsapp";
import type { getEventSettings } from "@/lib/settings";
import styles from "./settings-form.module.css";

type SettingsData = Awaited<ReturnType<typeof getEventSettings>>;

const actionNames: Record<string, string> = {
  PARTICIPANT_CREATED: "Peserta didaftarkan",
  PARTICIPANT_UPDATED: "Data peserta diubah",
  PARTICIPANT_DELETED: "Peserta dihapus",
  PARTICIPANT_RESTORED: "Peserta dipulihkan",
  PARTICIPANT_CHECKED_IN: "Check-in dicatat",
  WHATSAPP_OPENED: "WhatsApp dibuka",
  WHATSAPP_CONFIRMED: "WhatsApp terkonfirmasi",
  SETTINGS_UPDATED: "Pengaturan diubah",
  IMPORT_COMPLETED: "Impor selesai",
  EXPORT_COMPLETED: "Ekspor selesai",
};

function formatAuditDate(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export default function SettingsForm({ initial }: { initial: SettingsData }) {
  const [name, setName] = useState(initial.event.name);
  const [eventDate, setEventDate] = useState(initial.event.eventDate);
  const [target, setTarget] = useState(String(initial.event.targetParticipants));
  const [prefix, setPrefix] = useState(initial.event.registrationPrefix);
  const [template, setTemplate] = useState(initial.event.whatsappTemplate);
  const [audit, setAudit] = useState(initial.audit);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setIsError(false);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, eventDate, targetParticipants: Number(target), registrationPrefix: prefix, whatsappTemplate: template }),
      });
      const result = await response.json() as { ok: boolean; data?: SettingsData["event"]; error?: { message?: string } };
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Pengaturan belum berhasil disimpan.");
      setMessage("Perubahan tersimpan. Pesan WhatsApp berikutnya memakai template terbaru.");
      const refreshed = await fetch("/api/settings", { cache: "no-store" });
      if (refreshed.ok) {
        const latest = await refreshed.json() as { data?: SettingsData };
        if (latest.data) setAudit(latest.data.audit);
      }
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "Koneksi bermasalah. Coba lagi."); }
    finally { setBusy(false); }
  }

  const preview = renderWhatsAppMessage(template, {
    name: "Maria Salome",
    registrationCode: `${prefix}${String(initial.event.nextSequence).padStart(initial.event.registrationPadding, "0")}`,
    church: "GPIB Immanuel",
    eventDate,
  });

  return <div className={styles.content}>
    <form className={styles.form} onSubmit={save}>
      <section className={styles.section} aria-labelledby="event-details-title">
        <h2 id="event-details-title">Detail acara</h2>
        <div className={styles.fields}>
          <label>Nama acara<input required minLength={2} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Tanggal<input required type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
          <label>Target peserta<input required type="number" min={1} max={100000} value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          <label>Prefix registrasi<input required minLength={2} maxLength={20} pattern="[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} disabled={initial.prefixLocked} aria-describedby="prefix-help" /><span id="prefix-help">Contoh PKLU-. Prefix terkunci setelah peserta pertama dibuat.</span></label>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="template-title">
        <h2 id="template-title">Template WhatsApp</h2>
        <p className={styles.help}>Token: <code>{"{{nama}}"}</code>, <code>{"{{nomor}}"}</code>, <code>{"{{jemaat}}"}</code>, <code>{"{{tanggal}}"}</code>. Baris Asal jemaat otomatis hilang jika data jemaat kosong.</p>
        <label className={styles.templateLabel} htmlFor="whatsapp-template">Isi pesan</label>
        <textarea id="whatsapp-template" required minLength={1} maxLength={5000} rows={12} value={template} onChange={(e) => setTemplate(e.target.value)} />
        <div className={styles.preview}><h3>Pratinjau pesan</h3><p>{formatEventDate(eventDate)}</p><pre>{preview}</pre></div>
      </section>
      {message && <p className={isError ? styles.error : styles.status} role={isError ? "alert" : "status"}>{message}</p>}
      <button className={styles.submit} type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan pengaturan"}</button>
    </form>
    <section className={styles.audit} aria-labelledby="audit-title">
      <p className={styles.eyebrow}>Jejak perubahan</p>
      <h2 id="audit-title">Aktivitas terbaru.</h2>
      {audit.length ? <ol>{audit.map((item, index) => <li key={`${item.action}-${item.createdAt}-${index}`}><span>{actionNames[item.action] ?? item.action}</span><time dateTime={new Date(item.createdAt).toISOString()}>{formatAuditDate(item.createdAt)} WIB</time><small>{item.actorRole === "ADMIN" ? "Admin" : item.actorRole === "STAFF" ? "Panitia" : "Sistem"}</small></li>)}</ol> : <p className={styles.empty}>Belum ada aktivitas acara tercatat.</p>}
    </section>
  </div>;
}
