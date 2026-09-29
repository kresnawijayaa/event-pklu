"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import styles from "./import-tool.module.css";

type Status = "VALID" | "WARNING" | "ERROR" | "IMPORTED" | "SKIPPED";
type Candidate = { registrationCode: string; name: string; church: string | null };
type Row = {
  line: number; requestId: string; name: string; whatsapp: string; church: string | null;
  registrationMode: string | null; category: string | null; mupel: string | null;
  participantType: string | null; registrationChannel: string | null;
  status?: Status; message?: string; candidates?: Candidate[]; include: boolean;
};
type Outcome = { requestId: string; status: "IMPORTED" | "SKIPPED" | "FAILED"; registrationCode?: string; message?: string };
const statusLabel: Record<Status, string> = { VALID: "Siap", WARNING: "Periksa", ERROR: "Tidak bisa", IMPORTED: "Tersimpan", SKIPPED: "Dilewati" };

const aliases = {
  name: new Set(["nama", "namalengkap", "name"]),
  whatsapp: new Set(["whatsapp", "nomorwhatsapp", "wa", "nowhatsapp", "nohp", "nomorhp", "phone"]),
  church: new Set(["asaljemaat", "jemaat", "church"]),
  registrationMode: new Set(["mode"]),
  category: new Set(["kategori", "category"]),
  mupel: new Set(["asalmupel", "mupel"]),
  participantType: new Set(["tipe", "tipepeserta", "participanttype"]),
  registrationChannel: new Set(["daftar", "caradaftar", "registrationchannel"]),
};

function headerKey(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: unknown[], choices: Set<string>) {
  return headers.findIndex((header) => choices.has(headerKey(header)));
}

export default function ImportTool() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [validated, setValidated] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState({ imported: 0, skipped: 0, failed: 0 });
  const [previewFilter, setPreviewFilter] = useState<"issues" | "all">("all");

  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([["Nama", "Nomor WhatsApp", "Asal Jemaat", "Mode", "Kategori", "Asal Mupel", "Tipe", "Daftar"]]);
    sheet["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Peserta");
    XLSX.writeFile(workbook, "template-peserta-pklu.xlsx");
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setNotice(""); setRows([]); setValidated(false); setCommitted(false); setProgress(null); setSummary({ imported: 0, skipped: 0, failed: 0 }); setPreviewFilter("all");
    if (file.size > 15 * 1024 * 1024) { setError("Ukuran file maksimal 15 MB."); event.target.value = ""; return; }
    setBusy(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstName = workbook.SheetNames[0];
      if (!firstName) throw new Error("Sheet pertama tidak ditemukan.");
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstName], { header: 1, raw: false, defval: "" });
      if (matrix.length < 2) throw new Error("File harus memiliki baris header dan setidaknya satu peserta.");
      const headers = matrix[0];
      const nameColumn = findColumn(headers, aliases.name);
      const whatsappColumn = findColumn(headers, aliases.whatsapp);
      const churchColumn = findColumn(headers, aliases.church);
      const modeColumn = findColumn(headers, aliases.registrationMode);
      const categoryColumn = findColumn(headers, aliases.category);
      const mupelColumn = findColumn(headers, aliases.mupel);
      const typeColumn = findColumn(headers, aliases.participantType);
      const channelColumn = findColumn(headers, aliases.registrationChannel);
      if (nameColumn < 0 || whatsappColumn < 0) throw new Error("Kolom Nama dan Nomor WhatsApp belum ditemukan di baris pertama. Gunakan template Excel yang tersedia.");
      const cell = (values: unknown[], column: number) => column >= 0 ? String(values[column] ?? "").trim() || null : null;
      const rawRows = matrix.slice(1).map((values, index) => ({
        line: index + 2,
        requestId: crypto.randomUUID(),
        name: String(values[nameColumn] ?? "").trim(),
        whatsapp: String(values[whatsappColumn] ?? "").trim(),
        church: cell(values, churchColumn),
        registrationMode: cell(values, modeColumn), category: cell(values, categoryColumn),
        mupel: cell(values, mupelColumn), participantType: cell(values, typeColumn),
        registrationChannel: cell(values, channelColumn),
      })).filter((row) => row.name || row.whatsapp || row.church || row.registrationMode || row.category || row.mupel || row.participantType || row.registrationChannel);
      if (!rawRows.length) throw new Error("Tidak ada baris peserta di file.");
      if (rawRows.length > 1_000) throw new Error("File berisi lebih dari 1.000 baris peserta. Pecah file sebelum mengimpor.");
      const response = await fetch("/api/import/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows.map((row) => ({
          requestId: row.requestId, name: row.name, whatsapp: row.whatsapp, church: row.church,
          registrationMode: row.registrationMode, category: row.category, mupel: row.mupel,
          participantType: row.participantType, registrationChannel: row.registrationChannel,
        })) }),
      });
      const result = await response.json() as { ok: boolean; data?: { rows: Array<{ index: number; requestId: string; status: "VALID" | "WARNING" | "ERROR"; message: string; normalized?: Partial<Row>; candidates: Candidate[] }> }; error?: { message?: string } };
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Validasi belum berhasil.");
      const validations = new Map(result.data.rows.map((row) => [row.requestId, row]));
      setRows(rawRows.map((row) => {
        const validation = validations.get(row.requestId);
        return {
          ...row,
          name: validation?.normalized?.name ?? row.name,
          whatsapp: validation?.normalized?.whatsapp ?? row.whatsapp,
          church: validation?.normalized?.church ?? row.church,
          registrationMode: validation?.normalized?.registrationMode ?? row.registrationMode,
          category: validation?.normalized?.category ?? row.category,
          mupel: validation?.normalized?.mupel ?? row.mupel,
          participantType: validation?.normalized?.participantType ?? row.participantType,
          registrationChannel: validation?.normalized?.registrationChannel ?? row.registrationChannel,
          status: validation?.status ?? "ERROR",
          message: validation?.message ?? "Hasil validasi tidak tersedia.",
          candidates: validation?.candidates ?? [],
          include: validation?.status === "VALID",
        };
      }));
      setValidated(true);
      setPreviewFilter(result.data.rows.some((row) => row.status !== "VALID") ? "issues" : "all");
      setNotice(`${rawRows.length.toLocaleString("id-ID")} baris diperiksa. Baris bertanda Periksa perlu dipilih satu per satu.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "File tidak dapat dibaca."); }
    finally { setBusy(false); event.target.value = ""; }
  }

  function toggleRow(requestId: string) {
    setRows((current) => current.map((row) => row.requestId === requestId && row.status !== "ERROR" ? { ...row, include: !row.include } : row));
  }

  async function commit() {
    const selected = rows.filter((row) => row.include && (row.status === "VALID" || row.status === "WARNING"));
    if (!selected.length) { setError("Pilih setidaknya satu peserta yang siap diimpor."); return; }
    setCommitting(true); setError(""); setNotice(""); setSummary({ imported: 0, skipped: 0, failed: 0 });
    setProgress({ done: 0, total: selected.length });
    let totals = { imported: 0, skipped: 0, failed: 0 };
    try {
      for (let offset = 0; offset < selected.length; offset += 100) {
        const batch = selected.slice(offset, offset + 100);
        const response = await fetch("/api/import/commit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch.map((row) => ({
            requestId: row.requestId, name: row.name, whatsapp: row.whatsapp, church: row.church,
            registrationMode: row.registrationMode, category: row.category, mupel: row.mupel,
            participantType: row.participantType, registrationChannel: row.registrationChannel,
            confirmDuplicate: row.status === "WARNING" && row.include,
          })) }),
        });
        const result = await response.json() as { ok: boolean; data?: { imported: number; skipped: number; failed: number; results: Outcome[] }; error?: { message?: string } };
        if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Sebagian peserta belum tersimpan. Coba lagi.");
        totals = { imported: totals.imported + result.data.imported, skipped: totals.skipped + result.data.skipped, failed: totals.failed + result.data.failed };
        const outcomeMap = new Map(result.data.results.map((outcome) => [outcome.requestId, outcome]));
        setRows((current) => current.map((row) => {
          const outcome = outcomeMap.get(row.requestId);
          if (!outcome) return row;
          return { ...row, status: outcome.status === "FAILED" ? "ERROR" : outcome.status, message: outcome.message ?? (outcome.registrationCode ? `${outcome.registrationCode} tersimpan.` : "Sudah pernah diimpor."), include: false };
        }));
        setSummary(totals); setProgress({ done: Math.min(offset + batch.length, selected.length), total: selected.length });
      }
      setCommitted(true);
      setPreviewFilter("all");
      setNotice("Impor selesai. Periksa ringkasan hasil di bawah.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Proses impor terhenti."); }
    finally { setCommitting(false); }
  }

  const validCount = rows.filter((row) => row.status === "VALID").length;
  const warningCount = rows.filter((row) => row.status === "WARNING").length;
  const errorCount = rows.filter((row) => row.status === "ERROR").length;
  const selectedCount = rows.filter((row) => row.include).length;
  const visibleRows = previewFilter === "issues" ? rows.filter((row) => row.status === "WARNING" || row.status === "ERROR") : rows;
  const stage = committed || committing ? 3 : validated ? 2 : 1;

  return <section className={styles.tool}>
    <ol className={styles.steps} aria-label="Tahap impor">
      <li data-active={stage === 1}>1. Pilih file</li><li data-active={stage === 2}>2. Periksa data</li><li data-active={stage === 3}>3. Lihat hasil</li>
    </ol>
    <div className={styles.picker}>
      <label htmlFor="import-file">Pilih file Excel atau CSV</label>
      <input id="import-file" type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} disabled={busy || committing} />
      <button className={styles.template} type="button" onClick={downloadTemplate}>Unduh template Excel</button>
      <p>Sheet pertama dibaca. Nama dan WhatsApp wajib. Nomor registrasi dibuat otomatis. Maksimal 1.000 baris dan 15 MB. Kolom lain boleh dikosongkan.</p>
    </div>
    {busy && <p className={styles.status} role="status">Membaca dan memvalidasi file…</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.status} role="status">{notice}</p>}
    {validated && <>
      <div className={styles.counts} aria-label="Ringkasan validasi">
        <span><strong>{validCount}</strong> siap</span><span><strong>{warningCount}</strong> perlu diperiksa</span><span><strong>{errorCount}</strong> tidak bisa diimpor</span>
      </div>
      <p className={styles.reviewHint}>Baris siap dipilih otomatis. Periksa baris bertanda Periksa sebelum mencentangnya. Baris Tidak bisa perlu diperbaiki di file.</p>
      <div className={styles.previewFilters} aria-label="Tampilan pratinjau">
        <button type="button" aria-pressed={previewFilter === "issues"} onClick={() => setPreviewFilter("issues")}>Perlu ditinjau ({warningCount + errorCount})</button>
        <button type="button" aria-pressed={previewFilter === "all"} onClick={() => setPreviewFilter("all")}>Semua baris ({rows.length})</button>
      </div>
      {progress && <div className={styles.progress} role="status">Mengimpor peserta: {progress.done} dari {progress.total}</div>}
      {(summary.imported + summary.skipped + summary.failed > 0) && <div className={styles.summary} role="status"><strong>{summary.imported}</strong> diimpor · <strong>{summary.skipped}</strong> dilewati · <strong>{summary.failed}</strong> gagal</div>}
      <div className={styles.tableWrap} tabIndex={0} aria-label="Pratinjau peserta untuk diimpor">
        <table>
          <thead><tr><th scope="col">Pilih</th><th scope="col">Baris</th><th scope="col">Peserta</th><th scope="col">Hasil pemeriksaan</th></tr></thead>
          <tbody>{visibleRows.length === 0 && <tr><td colSpan={4}>Tidak ada baris yang perlu ditinjau.</td></tr>}{visibleRows.map((row) => <tr key={row.requestId}>
            <td><input type="checkbox" aria-label={`Pilih baris ${row.line}`} checked={row.include} disabled={committing || committed || row.status === "ERROR" || row.status === "IMPORTED" || row.status === "SKIPPED"} onChange={() => toggleRow(row.requestId)} /></td>
            <td>{row.line}</td>
            <td><strong className={styles.personName}>{row.name || "Nama kosong"}</strong><span className={styles.personPhone}>{row.whatsapp || "Nomor kosong"}</span></td>
            <td><span className={styles[row.status?.toLowerCase() ?? "error"]}>{statusLabel[row.status ?? "ERROR"]}</span><span className={styles.rowMessage}>{row.message}</span>
              {row.candidates?.map((candidate) => <small className={styles.candidate} key={candidate.registrationCode}>{candidate.registrationCode} · {candidate.name}{candidate.church ? ` · ${candidate.church}` : ""}</small>)}
              {(row.church || row.registrationMode || row.category || row.mupel || row.participantType || row.registrationChannel) && <details className={styles.rowDetails}><summary>Data lain</summary>
                {row.church && <span>Asal jemaat: {row.church}</span>}{row.registrationMode && <span>Mode: {row.registrationMode}</span>}{row.category && <span>Kategori: {row.category}</span>}{row.mupel && <span>Asal Mupel: {row.mupel}</span>}{row.participantType && <span>Tipe: {row.participantType}</span>}{row.registrationChannel && <span>Daftar: {row.registrationChannel}</span>}
              </details>}
            </td>
          </tr>)}</tbody>
        </table>
      </div>
      {!committed && <button className={styles.commit} type="button" disabled={committing || !selectedCount} onClick={commit}>{committing ? "Mengimpor…" : `Impor ${selectedCount.toLocaleString("id-ID")} baris terpilih`}</button>}
      {committed && <Link className={styles.viewParticipants} href="/participants">Lihat daftar peserta</Link>}
    </>}
  </section>;
}
