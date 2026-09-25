"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { AccessRole } from "@/lib/auth/types";
import ParticipantEditor from "@/components/participant-editor";
import WhatsAppActions from "@/components/whatsapp-actions";
import styles from "./participant-list.module.css";

type Participant = {
  id: string; registrationCode: string; name: string; whatsappE164: string; church: string | null;
  registrationMode: string | null; category: string | null; mupel: string | null;
  participantType: string | null; registrationChannel: string | null;
  checkedInAt: string | null; whatsappOpenedAt: string | null; whatsappConfirmedAt: string | null;
  deletedAt: string | null;
};
type ListResult = { ok: boolean; data?: { participants: Participant[]; nextCursor: string | null; event: { whatsappTemplate: string; eventDate: string } }; error?: { message?: string } };

export default function ParticipantList({ role, deleted = false }: { role: AccessRole; deleted?: boolean }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState("all");
  const [whatsapp, setWhatsapp] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [items, setItems] = useState<Participant[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [event, setEvent] = useState<{ whatsappTemplate: string; eventDate: string } | null>(null);
  const requestSequence = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (q: string, pageCursor: string | null, attendanceFilter: string, whatsappFilter: string) => {
    const requestId = ++requestSequence.current;
    const params = new URLSearchParams({ q, limit: "50", attendance: attendanceFilter, whatsapp: whatsappFilter });
    if (deleted) params.set("deleted", "true");
    if (pageCursor) params.set("cursor", pageCursor);
    try {
      const response = await fetch(`/api/participants?${params}`, { cache: "no-store" });
      const result = await response.json() as ListResult;
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Daftar belum dapat dimuat.");
      if (requestId !== requestSequence.current) return;
      setItems(result.data.participants); setNextCursor(result.data.nextCursor); setEvent(result.data.event);
    } catch (e) {
      if (requestId === requestSequence.current) {
        setItems([]); setNextCursor(null);
        setError(e instanceof Error ? e.message : "Koneksi bermasalah.");
      }
    } finally { if (requestId === requestSequence.current) setBusy(false); }
  }, [deleted]);

  // Initial list read synchronizes this screen with the server API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(search, pageCursors[pageIndex] ?? null, attendance, whatsapp); }, [load, search, pageCursors, pageIndex, attendance, whatsapp]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setExpandedId(null); setEditingId(null);
    setPageCursors([null]); setPageIndex(0); setSearch(query.trim());
  }

  async function remove(item: Participant) {
    if (!window.confirm(`Hapus ${item.name}? Data dapat dipulihkan Admin.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/participants/${item.id}`, { method: "DELETE" });
      const result = await response.json() as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Data belum dapat dihapus.");
      setExpandedId(null);
      await load(search, pageCursors[pageIndex] ?? null, attendance, whatsapp);
    } catch (e) { setError(e instanceof Error ? e.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  async function restore(item: Participant) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/participants/${item.id}/restore`, { method: "POST" });
      const result = await response.json() as { ok: boolean; error?: { message?: string } };
      if (!response.ok || !result.ok) throw new Error(result.error?.message ?? "Data belum dapat dipulihkan.");
      setExpandedId(null);
      await load(search, pageCursors[pageIndex] ?? null, attendance, whatsapp);
    } catch (e) { setError(e instanceof Error ? e.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  return <section className={styles.section} aria-label="Daftar peserta">
    <form className={styles.search} onSubmit={submit} role="search">
      <label htmlFor="participant-search">Cari peserta</label>
      <div><input id="participant-search" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit">Cari</button></div>
    </form>
    <button className={styles.filterToggle} type="button" aria-expanded={filtersOpen} aria-controls="participant-filters" onClick={() => setFiltersOpen((open) => !open)}>
      Filter{attendance !== "all" || whatsapp !== "all" ? " aktif" : ""}
      <span className={styles.filterChevron} aria-hidden="true" />
    </button>
    <div id="participant-filters" className={styles.filters} data-open={filtersOpen} aria-label="Filter peserta">
      <label htmlFor="attendance-filter">Kehadiran
        <select id="attendance-filter" value={attendance} onChange={(event) => { setAttendance(event.target.value); setPageCursors([null]); setPageIndex(0); setExpandedId(null); setEditingId(null); setBusy(true); setError(""); }}>
          <option value="all">Semua</option><option value="present">Sudah hadir</option><option value="absent">Belum hadir</option>
        </select>
      </label>
      {!deleted && <label htmlFor="whatsapp-filter">WhatsApp
        <select id="whatsapp-filter" value={whatsapp} onChange={(event) => { setWhatsapp(event.target.value); setPageCursors([null]); setPageIndex(0); setExpandedId(null); setEditingId(null); setBusy(true); setError(""); }}>
          <option value="all">Semua</option><option value="not_opened">Belum dibuka</option><option value="opened">Dibuka, belum dikonfirmasi</option><option value="confirmed">Terkonfirmasi</option>
        </select>
      </label>}
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {busy && <p className={styles.status} role="status">Memuat daftar…</p>}
    {!busy && !error && items.length === 0 && <p className={styles.empty}>Belum ada peserta yang cocok.</p>}
    {items.length > 0 && <div className={styles.list} ref={listRef}>
      {items.map((item) => {
        const expanded = expandedId === item.id;
        return <article className={styles.row} key={item.id}>
          <button className={styles.rowToggle} type="button" aria-expanded={expanded} onClick={() => { setExpandedId(expanded ? null : item.id); setEditingId(null); }}>
            <span className={styles.person}>
              <span className={styles.code}>{item.registrationCode}</span>
              <span className={styles.name}>{item.name}</span>
              {item.church && <span className={styles.church}>{item.church}</span>}
            </span>
            <span className={styles.statuses}>
              <span className={item.checkedInAt ? styles.present : styles.absent}>{item.checkedInAt ? "Hadir" : "Belum hadir"}</span>
              {!deleted && <span>{item.whatsappConfirmedAt ? "WA terkonfirmasi" : item.whatsappOpenedAt ? "WA dibuka" : "WA belum dibuka"}</span>}
            </span>
            <span className={styles.chevron} aria-hidden="true" />
          </button>
          {expanded && <div className={styles.rowDetails}>
            <div className={styles.contact}>
              <span>Nomor WhatsApp</span><strong>{item.whatsappE164}</strong>
              {deleted && <span>Terhapus {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) : ""}</span>}
            </div>
            {(item.registrationMode || item.category || item.mupel || item.participantType || item.registrationChannel) && <div className={styles.metadata}>
              {item.registrationMode && <span>Mode: {item.registrationMode}</span>}
              {item.category && <span>Kategori: {item.category}</span>}
              {item.mupel && <span>Mupel: {item.mupel}</span>}
              {item.participantType && <span>Tipe: {item.participantType}</span>}
              {item.registrationChannel && <span>Daftar: {item.registrationChannel}</span>}
            </div>}
            {!deleted && event && <WhatsAppActions participant={item} template={event.whatsappTemplate} eventDate={event.eventDate} onStatusChange={(openedAt, confirmedAt) => setItems((current) => current.map((person) => person.id === item.id ? { ...person, whatsappOpenedAt: openedAt, whatsappConfirmedAt: confirmedAt } : person))} />}
            <div className={styles.rowActions}>
              {deleted ? role === "ADMIN" && <button type="button" disabled={busy} onClick={() => restore(item)}>Pulihkan</button> : <>
                <button type="button" disabled={busy} onClick={() => setEditingId(editingId === item.id ? null : item.id)}>{editingId === item.id ? "Tutup edit" : "Edit data"}</button>
                {role === "ADMIN" && <button type="button" className={styles.deleteButton} disabled={busy} onClick={() => remove(item)}>Hapus</button>}
              </>}
            </div>
            {editingId === item.id && <ParticipantEditor participant={item} onCancel={() => setEditingId(null)} onSaved={() => { setEditingId(null); setBusy(true); void load(search, pageCursors[pageIndex] ?? null, attendance, whatsapp); }} />}
          </div>}
        </article>;
      })}
    </div>}
    <div className={styles.actions}>
      <span>{items.length ? `${items.length} peserta · halaman ${pageIndex + 1}` : "0 peserta"}</span>
      {!deleted && role === "ADMIN" && <a href="/api/export/participants">Unduh CSV</a>}
    </div>
    {(pageIndex > 0 || nextCursor) && <div className={styles.pagination} aria-label="Navigasi halaman peserta">
      <button type="button" disabled={busy || pageIndex === 0} onClick={() => { listRef.current?.scrollIntoView(); setBusy(true); setError(""); setExpandedId(null); setEditingId(null); setPageIndex((index) => index - 1); }}>Sebelumnya</button>
      <button type="button" disabled={busy || !nextCursor} onClick={() => { if (!nextCursor) return; listRef.current?.scrollIntoView(); setBusy(true); setError(""); setExpandedId(null); setEditingId(null); setPageCursors((current) => [...current.slice(0, pageIndex + 1), nextCursor]); setPageIndex((index) => index + 1); }}>Berikutnya</button>
    </div>}
    <p className={styles.add}>{deleted ? <Link href="/participants">Kembali ke peserta aktif <span aria-hidden="true">→</span></Link> : <><Link href="/register">Daftarkan peserta <span aria-hidden="true">→</span></Link>{role === "ADMIN" && <Link href="/participants/deleted">Lihat data terhapus</Link>}</>}</p>
  </section>;
}
