"use client";

import { useState, type FormEvent } from "react";
import { registrationCode } from "@/lib/participants/registration";
import styles from "./participant-editor.module.css";

type Candidate = { id: string; registrationCode: string; name: string; church: string | null };
type Props = { participant: { id: string; sequenceNumber: number; registrationCode: string; isVip: boolean; name: string; whatsappE164: string; church: string | null;
  registrationMode: string | null; category: string | null; mupel: string | null;
  participantType: string | null; registrationChannel: string | null;
}; registrationPrefix: string; registrationPadding: number; onCancel: () => void; onSaved: () => void };

export default function ParticipantEditor({ participant, registrationPrefix, registrationPadding, onCancel, onSaved }: Props) {
  const [name, setName] = useState(participant.name);
  const [whatsapp, setWhatsapp] = useState(participant.whatsappE164);
  const [church, setChurch] = useState(participant.church ?? "");
  const [registrationMode, setRegistrationMode] = useState(participant.registrationMode ?? "");
  const [category, setCategory] = useState(participant.category ?? "");
  const [mupel, setMupel] = useState(participant.mupel ?? "");
  const [participantType, setParticipantType] = useState(participant.participantType ?? "");
  const [registrationChannel, setRegistrationChannel] = useState(participant.registrationChannel ?? "");
  const [isVip, setIsVip] = useState(participant.isVip);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const vipChanged = isVip !== participant.isVip;
  const nextCode = vipChanged ? registrationCode(registrationPrefix, registrationPadding, participant.sequenceNumber, isVip) : participant.registrationCode;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (vipChanged && !window.confirm(`Ubah nomor registrasi ${participant.name} dari ${participant.registrationCode} menjadi ${nextCode}? Nomor lama tidak berlaku. Jika sudah dikirim lewat WhatsApp, kirim nomor baru.`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/participants/${participant.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp, church: church || null,
          registrationMode, category, mupel, participantType, registrationChannel, confirmDuplicate,
          isVip, confirmVipChange: vipChanged, expectedCurrentCode: participant.registrationCode, expectedNewCode: nextCode }),
      });
      const result = await response.json() as { ok: boolean; error?: { code?: string; message?: string; candidates?: Candidate[] } };
      if (response.status === 409 && result.error?.code === "DUPLICATE_WARNING") {
        setCandidates(result.error.candidates ?? []); setConfirmDuplicate(true);
        setMessage(result.error.message ?? "Data serupa ditemukan. Periksa sebelum melanjutkan."); return;
      }
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Perubahan belum tersimpan.");
      onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  return <form className={styles.form} onSubmit={submit}>
    <label>Nama<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></label>
    <label>WhatsApp<input required type="tel" inputMode="tel" maxLength={40} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></label>
    <label>Asal jemaat<input maxLength={120} value={church} onChange={(e) => setChurch(e.target.value)} /></label>
    <label>Mode<input maxLength={120} value={registrationMode} onChange={(e) => setRegistrationMode(e.target.value)} /></label>
    <label>Kategori<input maxLength={120} value={category} onChange={(e) => setCategory(e.target.value)} /></label>
    <label>Asal Mupel<input maxLength={120} value={mupel} onChange={(e) => setMupel(e.target.value)} /></label>
    <label>Tipe<input maxLength={120} value={participantType} onChange={(e) => setParticipantType(e.target.value)} /></label>
    <label>Daftar<input maxLength={120} value={registrationChannel} onChange={(e) => setRegistrationChannel(e.target.value)} /></label>
    <label className={styles.vipOption}><input type="checkbox" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} /><span>Tamu VIP</span></label>
    {vipChanged && <p className={styles.codeChange} aria-live="polite">Nomor registrasi akan berubah dari <strong>{participant.registrationCode}</strong> menjadi <strong>{nextCode}</strong>. Nomor lama tidak berlaku.</p>}
    {candidates.length > 0 && <div className={styles.matches}><strong>Data serupa</strong>{candidates.map((candidate) => <p key={candidate.id}>{candidate.registrationCode} · {candidate.name}{candidate.church ? ` · ${candidate.church}` : ""}</p>)}</div>}
    {message && <p className={styles.message} role="status">{message}</p>}
    <div className={styles.actions}><button type="button" className={styles.cancel} onClick={onCancel}>Batal</button><button type="submit" disabled={busy}>{busy ? "Menyimpan…" : confirmDuplicate && candidates.length ? "Tetap simpan" : "Simpan perubahan"}</button></div>
  </form>;
}
