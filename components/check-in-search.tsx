"use client";

import { useState, type FormEvent } from "react";
import styles from "./check-in-search.module.css";

type Participant = { id: string; registrationCode: string; name: string; whatsappE164: string; church: string | null;
  registrationMode: string | null; category: string | null; mupel: string | null;
  participantType: string | null; registrationChannel: string | null; checkedInAt: string | null };
type SearchResult = { ok: boolean; data?: { participants: Participant[] }; error?: { message?: string } };

function formatTime(date: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(date));
}

export default function CheckInSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Participant[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setSearched(true);
    try {
      const params = new URLSearchParams({ q: query.trim(), limit: "10" });
      const response = await fetch(`/api/participants?${params}`, { cache: "no-store" });
      const result = await response.json() as SearchResult;
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Pencarian belum berhasil.");
      setItems(result.data.participants);
      if (!result.data.participants.length) setMessage("Peserta tidak ditemukan.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  async function checkIn(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/participants/${id}/check-in`, { method: "POST" });
      const result = await response.json() as { ok: boolean; data?: { participant: Participant; alreadyCheckedIn: boolean }; error?: { message?: string } };
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Check-in belum berhasil.");
      setItems((current) => current.map((item) => item.id === id ? { ...item, checkedInAt: result.data!.participant.checkedInAt } : item));
      setMessage(result.data.alreadyCheckedIn ? "Check-in sudah tercatat sebelumnya. Waktu pertama tetap dipakai." : "Kehadiran berhasil dicatat.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  return <section className={styles.section}>
    <form className={styles.search} onSubmit={search} role="search">
      <label htmlFor="check-in-query">Kode atau nama peserta</label>
      <div><input id="check-in-query" value={query} onChange={(event) => setQuery(event.target.value)} required /><button type="submit" disabled={busy}>{busy ? "Mencari…" : "Cari peserta"}</button></div>
    </form>
    {message && <p className={styles.message} role="status">{message}</p>}
    {searched && items.length > 0 && <div className={styles.results}>
      {items.map((item) => <article className={styles.result} key={item.id}>
        <div><span className={styles.code}>{item.registrationCode}</span><h2>{item.name}</h2>{item.church && <p>{item.church}</p>}
          <div className={styles.detail}>
            {item.participantType && <span>Tipe: {item.participantType}</span>}
            {item.category && <span>Kategori: {item.category}</span>}
            {item.mupel && <span>Mupel: {item.mupel}</span>}
            {item.registrationMode && <span>Mode: {item.registrationMode}</span>}
            {item.registrationChannel && <span>Daftar: {item.registrationChannel}</span>}
          </div>
          {item.checkedInAt ? <p className={styles.timestamp}>Hadir · {formatTime(item.checkedInAt)} WIB</p> : <p className={styles.waiting}>Belum check-in</p>}
        </div>
        <button type="button" onClick={() => checkIn(item.id)} disabled={busy || Boolean(item.checkedInAt)}>{item.checkedInAt ? "Sudah hadir" : "Catat hadir"}</button>
      </article>)}
    </div>}
  </section>;
}
