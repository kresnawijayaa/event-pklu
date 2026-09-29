"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { AccessRole } from "@/lib/auth/types";
import ParticipantEditor from "@/components/participant-editor";
import WhatsAppActions from "@/components/whatsapp-actions";
import styles from "./participant-list.module.css";

type Participant = {
  id: string; registrationCode: string; name: string; whatsappE164: string; church: string | null;
  registrationMode: string | null; category: string | null; mupel: string | null;
  participantType: string | null; registrationChannel: string | null;
  checkedInAt: string | null; deletedAt: string | null;
};
type ListResult = { ok: boolean; data?: { participants: Participant[]; nextCursor: string | null; event: { whatsappTemplate: string; eventDate: string } }; error?: { message?: string } };

export default function ParticipantList({ role, deleted = false }: { role: AccessRole; deleted?: boolean }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [items, setItems] = useState<Participant[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [event, setEvent] = useState<{ whatsappTemplate: string; eventDate: string } | null>(null);
  const requestSequence = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const hasActiveSearch = Boolean(search) || attendance !== "all";

  const load = useCallback(async (q: string, pageCursor: string | null, attendanceFilter: string) => {
    const requestId = ++requestSequence.current;
    const params = new URLSearchParams({ q, limit: "50", attendance: attendanceFilter });
    if (deleted) params.set("deleted", "true");
    if (pageCursor) params.set("cursor", pageCursor);
    try {
      const response = await fetch(`/api/participants?${params}`, { cache: "no-store" });
      const result = await response.json() as ListResult;
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Daftar belum dapat dimuat.");
      if (requestId !== requestSequence.current) return;
      setItems(result.data.participants); setNextCursor(result.data.nextCursor); setEvent(result.data.event);
    } catch (cause) {
      if (requestId === requestSequence.current) {
        setItems([]); setNextCursor(null);
        setError(cause instanceof Error ? cause.message : "Koneksi bermasalah.");
      }
    } finally { if (requestId === requestSequence.current) setBusy(false); }
  }, [deleted]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(search, pageCursors[pageIndex] ?? null, attendance); }, [load, search, pageCursors, pageIndex, attendance]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setEditingId(null);
    setPageCursors([null]); setPageIndex(0); setSearch(query.trim());
  }

  async function remove(item: Participant) {
    if (!window.confirm(`Hapus ${item.name}? Data dapat dipulihkan Admin.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/participants/${item.id}`, { method: "DELETE" });
      const result = await response.json() as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Data belum dapat dihapus.");
      setEditingId(null);
      await load(search, pageCursors[pageIndex] ?? null, attendance);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  async function restore(item: Participant) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/participants/${item.id}/restore`, { method: "POST" });
      const result = await response.json() as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Data belum dapat dipulihkan.");
      await load(search, pageCursors[pageIndex] ?? null, attendance);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  async function cancelCheckIn(item: Participant) {
    if (!window.confirm(`Batalkan check-in ${item.name}?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/participants/${item.id}/check-in/cancel`, { method: "POST" });
      const result = await response.json() as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Check-in belum dapat dibatalkan.");
      await load(search, pageCursors[pageIndex] ?? null, attendance);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  return <section className={styles.section} aria-label="Daftar peserta">
    <div className={styles.toolbar}>
      <form className={styles.search} onSubmit={submit} role="search">
        <label htmlFor="participant-search">Cari peserta <span>Nama, nomor registrasi, atau nomor WhatsApp</span></label>
        <div><input id="participant-search" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit">Cari</button></div>
      </form>
      <button className={styles.filterToggle} type="button" aria-expanded={filtersOpen} aria-controls="participant-filters" onClick={() => setFiltersOpen((open) => !open)}>Filter kehadiran{attendance !== "all" ? " aktif" : ""}</button>
      <div id="participant-filters" className={styles.filters} data-open={filtersOpen}>
        <label htmlFor="attendance-filter">Kehadiran
          <select id="attendance-filter" value={attendance} onChange={(event) => { setAttendance(event.target.value); setPageCursors([null]); setPageIndex(0); setEditingId(null); setBusy(true); setError(""); }}>
            <option value="all">Semua</option><option value="present">Sudah hadir</option><option value="absent">Belum hadir</option>
          </select>
        </label>
      </div>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {busy && <p className={styles.status} role="status">Memuat daftar…</p>}
    {!busy && !error && items.length === 0 && (hasActiveSearch
      ? <div className={styles.empty}>Tidak ada peserta yang cocok. Coba nama, nomor registrasi, atau nomor WhatsApp lain. <button type="button" onClick={() => { setQuery(""); setSearch(""); setAttendance("all"); setPageCursors([null]); setPageIndex(0); setBusy(true); }}>Hapus pencarian dan filter</button></div>
      : deleted ? <p className={styles.empty}>Belum ada peserta terhapus.</p>
        : <p className={styles.empty}>Belum ada peserta. <Link href="/register">Tambah peserta</Link> atau <Link href="/import">impor file Excel</Link>.</p>)}
    {items.length > 0 && <div className={styles.list} ref={listRef}>
      {items.map((item) => <article className={styles.row} key={item.id}>
        <div className={styles.rowMain}>
          <div className={styles.identity}>
            <div className={styles.primary}><strong className={styles.code}>{item.registrationCode}</strong><strong className={styles.name}>{item.name}</strong>{item.church && <span className={styles.church}>{item.church}</span>}</div>
            <div className={styles.secondary}><span>{item.whatsappE164}</span>{deleted && item.deletedAt && <span>Terhapus {new Date(item.deletedAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</span>}</div>
          </div>
          <div className={styles.rowSide}>
            {!deleted && <span className={item.checkedInAt ? styles.present : styles.absent}>{item.checkedInAt ? "Hadir" : "Belum hadir"}</span>}
            <div className={styles.quickActions}>
              {deleted ? role === "ADMIN" && <button className={styles.restoreButton} type="button" disabled={busy} onClick={() => restore(item)}>Pulihkan</button> : <>
                {event && <WhatsAppActions participant={item} template={event.whatsappTemplate} eventDate={event.eventDate} />}
                <button className={styles.iconButton} type="button" disabled={busy} aria-label={`${editingId === item.id ? "Tutup edit" : "Edit data"} ${item.name}`} title={editingId === item.id ? "Tutup edit" : "Edit data"} aria-expanded={editingId === item.id} onClick={() => setEditingId(editingId === item.id ? null : item.id)}><Pencil aria-hidden="true" /></button>
                {item.checkedInAt && <button className={styles.iconButton} type="button" disabled={busy} aria-label={`Batalkan check-in ${item.name}`} title="Batalkan check-in" onClick={() => cancelCheckIn(item)}><RotateCcw aria-hidden="true" /></button>}
                {role === "ADMIN" && <button className={`${styles.iconButton} ${styles.deleteButton}`} type="button" disabled={busy} aria-label={`Hapus ${item.name}`} title="Hapus peserta" onClick={() => remove(item)}><Trash2 aria-hidden="true" /></button>}
              </>}
            </div>
          </div>
        </div>
        {editingId === item.id && <div className={styles.editorPanel} id={`participant-editor-${item.id}`}><ParticipantEditor participant={item} onCancel={() => setEditingId(null)} onSaved={() => { setEditingId(null); setBusy(true); void load(search, pageCursors[pageIndex] ?? null, attendance); }} /></div>}
      </article>)}
    </div>}
    <div className={styles.actions}>
      <span>{items.length ? `${items.length} peserta · halaman ${pageIndex + 1}` : "0 peserta"}</span>
      {!deleted && role === "ADMIN" && <a href="/api/export/participants">Unduh CSV</a>}
    </div>
    {(pageIndex > 0 || nextCursor) && <div className={styles.pagination} aria-label="Navigasi halaman peserta">
      <button type="button" disabled={busy || pageIndex === 0} onClick={() => { listRef.current?.scrollIntoView(); setBusy(true); setError(""); setEditingId(null); setPageIndex((index) => index - 1); }}>Sebelumnya</button>
      <button type="button" disabled={busy || !nextCursor} onClick={() => { if (!nextCursor) return; listRef.current?.scrollIntoView(); setBusy(true); setError(""); setEditingId(null); setPageCursors((current) => [...current.slice(0, pageIndex + 1), nextCursor]); setPageIndex((index) => index + 1); }}>Berikutnya</button>
    </div>}
    <p className={styles.add}>{deleted ? <Link href="/participants">Kembali ke peserta aktif</Link> : <><Link href="/register">Tambah peserta</Link>{role === "ADMIN" && <Link href="/participants/deleted">Lihat data terhapus</Link>}</>}</p>
  </section>;
}
