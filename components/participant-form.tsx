"use client";

import { useState, type FormEvent } from "react";
import styles from "./participant-form.module.css";

type Candidate = { id: string; registrationCode: string; name: string; church: string | null };
type Result = { ok: boolean; data?: { participant: { registrationCode: string; name: string } }; error?: { code?: string; message?: string; candidates?: Candidate[] } };

export default function ParticipantForm() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [church, setChurch] = useState("");
  const [registrationMode, setRegistrationMode] = useState("");
  const [category, setCategory] = useState("");
  const [mupel, setMupel] = useState("");
  const [participantType, setParticipantType] = useState("");
  const [registrationChannel, setRegistrationChannel] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/participants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, name, whatsapp, church: church || null,
          registrationMode, category, mupel, participantType, registrationChannel, confirmDuplicate }),
      });
      const result = await response.json() as Result;
      if (response.status === 409 && result.error?.code === "DUPLICATE_WARNING") {
        setCandidates(result.error.candidates ?? []); setConfirmDuplicate(true);
        setMessage(result.error.message ?? "Data serupa ditemukan. Periksa sebelum melanjutkan.");
        return;
      }
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Data belum berhasil disimpan.");
      setMessage(`${result.data.participant.registrationCode} berhasil dicatat untuk ${result.data.participant.name}.`);
      setName(""); setWhatsapp(""); setChurch(""); setRegistrationMode(""); setCategory(""); setMupel(""); setParticipantType(""); setRegistrationChannel(""); setCandidates([]); setConfirmDuplicate(false); setRequestId(crypto.randomUUID());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Koneksi bermasalah. Coba lagi.");
    } finally { setBusy(false); }
  }

  return <form className={styles.form} onSubmit={save}>
    <div className={styles.field}><label htmlFor="participant-name">Nama lengkap</label><input id="participant-name" name="name" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
    <div className={styles.field}><label htmlFor="participant-whatsapp">Nomor WhatsApp</label><input id="participant-whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
    <div className={styles.field}><label htmlFor="participant-church">Asal jemaat <span>(opsional)</span></label><input id="participant-church" name="church" maxLength={120} value={church} onChange={(e) => setChurch(e.target.value)} /></div>
    <div className={styles.detailGrid}>
      <div className={styles.field}><label htmlFor="participant-mode">Mode <span>(opsional)</span></label><input id="participant-mode" maxLength={120} value={registrationMode} onChange={(e) => setRegistrationMode(e.target.value)} /></div>
      <div className={styles.field}><label htmlFor="participant-category">Kategori <span>(opsional)</span></label><input id="participant-category" maxLength={120} value={category} onChange={(e) => setCategory(e.target.value)} /></div>
      <div className={styles.field}><label htmlFor="participant-mupel">Asal Mupel <span>(opsional)</span></label><input id="participant-mupel" maxLength={120} value={mupel} onChange={(e) => setMupel(e.target.value)} /></div>
      <div className={styles.field}><label htmlFor="participant-type">Tipe <span>(opsional)</span></label><input id="participant-type" maxLength={120} value={participantType} onChange={(e) => setParticipantType(e.target.value)} /></div>
      <div className={styles.field}><label htmlFor="participant-channel">Daftar <span>(opsional)</span></label><input id="participant-channel" maxLength={120} value={registrationChannel} onChange={(e) => setRegistrationChannel(e.target.value)} /></div>
    </div>
    {candidates.length > 0 && <section className={styles.duplicates} aria-label="Kemungkinan data ganda"><h2>Data serupa</h2>{candidates.map((candidate) => <p key={candidate.id}><strong>{candidate.registrationCode}</strong> · {candidate.name}{candidate.church ? ` · ${candidate.church}` : ""}</p>)}</section>}
    {message && <p className={candidates.length ? styles.warning : styles.status} role="status">{message}</p>}
    {confirmDuplicate && candidates.length > 0 && <p className={styles.confirmText}>Pastikan ini peserta berbeda sebelum melanjutkan.</p>}
    <button className={styles.submit} type="submit" disabled={busy}>{busy ? "Menyimpan…" : confirmDuplicate ? "Tetap daftarkan peserta" : "Simpan pendaftaran"}<span aria-hidden="true">→</span></button>
  </form>;
}
