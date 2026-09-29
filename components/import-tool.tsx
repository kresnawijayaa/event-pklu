"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import styles from "./import-tool.module.css";

type Status = "VALID" | "WARNING" | "ERROR" | "IMPORTED" | "SKIPPED";
type Candidate = { registrationCode: string; name: string; church: string | null };
type Row = {
  line: number; requestId: string; name: string; whatsapp: string; church: string | null;
  registrationMode: string | null; category: string | null; mupel: string | null;
  participantType: string | null; registrationChannel: string | null;
  isVip: boolean; vipInvalid: boolean;
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
  isVip: new Set(["vip", "tamuvip"]),
};

function parseVip(value: string | null) {
  const answer = value?.trim().toLocaleLowerCase("id-ID") ?? "";
  if (!answer || ["tidak", "no", "0", "false"].includes(answer)) return false;
  if (["ya", "yes", "1", "true", "vip"].includes(answer)) return true;
  return null;
}

function headerKey(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: unknown[], choices: Set<string>) {
  return headers.findIndex((header) => choices.has(headerKey(header)));
}

export default function ImportTool() {
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
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
    const headers = ["Nama", "Nomor WhatsApp", "Asal Jemaat", "Mode", "Kategori", "Asal Mupel", "Tipe", "Daftar", "VIP"];
    const widths = [{ wch: 28 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
    const sheet = XLSX.utils.aoa_to_sheet([headers]);
    sheet["!cols"] = widths;
    sheet["!autofilter"] = { ref: "A1:I1" };
    const example = XLSX.utils.aoa_to_sheet([
      ["CONTOH SAJA — JANGAN DIIMPOR"],
      ["Isi data asli di sheet Peserta. Kolom VIP: Ya untuk VIP; Tidak atau kosong untuk peserta biasa."],
      headers,
      ["Contoh Biasa", "081234567890", "GPIB Contoh", "Mandiri", "Umum", "", "Peserta", "Manual", "Tidak"],
      ["Contoh VIP", "081234567891", "GPIB Contoh", "Mandiri", "Tamu", "", "Peserta", "Manual", "Ya"],
    ]);
    example["!cols"] = widths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Peserta");
    XLSX.utils.book_append_sheet(workbook, example, "Contoh");
    XLSX.writeFile(workbook, "template-peserta-pklu.xlsx");
  }

  function resetReview() {
    setError(""); setNotice(""); setRows([]); setValidated(false); setCommitted(false); setProgress(null); setSummary({ imported: 0, skipped: 0, failed: 0 }); setPreviewFilter("all");
  }

  async function validateSheet(workbook: XLSX.WorkBook, sheetName: string, isCsv: boolean) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error("Sheet yang dipilih tidak ditemukan dalam file.");
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
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
      const vipColumn = findColumn(headers, aliases.isVip);
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
        isVip: parseVip(cell(values, vipColumn)) === true,
        vipInvalid: parseVip(cell(values, vipColumn)) === null,
      })).filter((row) => row.name || row.whatsapp || row.church || row.registrationMode || row.category || row.mupel || row.participantType || row.registrationChannel || row.isVip || row.vipInvalid);
      if (!rawRows.length) throw new Error("Tidak ada baris peserta di file.");
      if (rawRows.length > 1_000) throw new Error("File berisi lebih dari 1.000 baris peserta. Pecah file sebelum mengimpor.");
      const response = await fetch("/api/import/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows.map((row) => ({
          requestId: row.requestId, name: row.name, whatsapp: row.whatsapp, church: row.church,
          registrationMode: row.registrationMode, category: row.category, mupel: row.mupel,
          participantType: row.participantType, registrationChannel: row.registrationChannel,
          isVip: row.isVip,
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
          status: row.vipInvalid ? "ERROR" : validation?.status ?? "ERROR",
          message: row.vipInvalid ? "Kolom VIP harus berisi Ya, Tidak, atau kosong." : validation?.message ?? "Hasil validasi tidak tersedia.",
          candidates: validation?.candidates ?? [],
          include: !row.vipInvalid && validation?.status === "VALID",
        };
      }));
      setValidated(true);
      setPreviewFilter(rawRows.some((row) => row.vipInvalid) || result.data.rows.some((row) => row.status !== "VALID") ? "issues" : "all");
      setNotice(`${rawRows.length.toLocaleString("id-ID")} baris diperiksa dari ${isCsv ? "file CSV" : `sheet "${sheetName}"`}. Baris bertanda Periksa perlu dipilih satu per satu.`);
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    resetReview(); workbookRef.current = null; setFileName(""); setSheetNames([]); setSelectedSheet("");
    if (file.size > 15 * 1024 * 1024) { setError("Ukuran file maksimal 15 MB."); event.target.value = ""; return; }
    setBusy(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      if (!workbook.SheetNames.length) throw new Error("Tidak ada sheet dalam file.");
      const isCsv = /\.csv$/i.test(file.name);
      workbookRef.current = workbook;
      setFileName(file.name);
      if (isCsv) {
        await validateSheet(workbook, workbook.SheetNames[0], true);
      } else {
        setSheetNames(workbook.SheetNames);
        if (workbook.SheetNames.length === 1) {
          setSelectedSheet(workbook.SheetNames[0]);
          await validateSheet(workbook, workbook.SheetNames[0], false);
        } else {
          setNotice("Pilih sheet yang berisi data peserta untuk diperiksa.");
        }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "File tidak dapat dibaca."); }
    finally { setBusy(false); event.target.value = ""; }
  }

  async function onSheetChange(event: ChangeEvent<HTMLSelectElement>) {
    const sheetName = event.target.value;
    setSelectedSheet(sheetName); resetReview();
    if (!sheetName) return;
    const workbook = workbookRef.current;
    if (!workbook) { setError("Pilih ulang file Excel."); return; }
    setBusy(true);
    try { await validateSheet(workbook, sheetName, false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Sheet tidak dapat dibaca."); }
    finally { setBusy(false); }
  }

  function toggleRow(requestId: string) {
    setRows((current) => current.map((row) => row.requestId === requestId && row.status !== "ERROR" ? { ...row, include: !row.include } : row));
  }

  function setVip(requestId: string, isVip: boolean) {
    setRows((current) => current.map((row) => row.requestId === requestId ? { ...row, isVip } : row));
  }

  function setAllVip(isVip: boolean) {
    setRows((current) => current.map((row) => row.status === "VALID" || row.status === "WARNING" ? { ...row, isVip } : row));
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
            isVip: row.isVip,
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
  const vipCount = rows.filter((row) => row.isVip && (row.status === "VALID" || row.status === "WARNING")).length;
  const visibleRows = previewFilter === "issues" ? rows.filter((row) => row.status === "WARNING" || row.status === "ERROR") : rows;
  const stage = committed || committing ? 3 : validated ? 2 : 1;

  return <section className={styles.tool}>
    <ol className={styles.steps} aria-label="Tahap impor">
      <li data-active={stage === 1}>1. Pilih file</li><li data-active={stage === 2}>2. Periksa data</li><li data-active={stage === 3}>3. Lihat hasil</li>
    </ol>
    <div className={styles.picker}>
      <label htmlFor="import-file">Pilih file Excel atau CSV</label>
      <input id="import-file" type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} disabled={busy || committing} />
      {fileName && <p className={styles.fileName}>File: {fileName}</p>}
      {sheetNames.length > 0 && <div className={styles.sheetPicker}>
        <label htmlFor="import-sheet">Sheet peserta</label>
        <select id="import-sheet" value={selectedSheet} onChange={onSheetChange} disabled={busy || committing}>
          {sheetNames.length > 1 && <option value="">Pilih sheet</option>}
          {sheetNames.map((sheetName) => <option key={sheetName} value={sheetName}>{sheetName}</option>)}
        </select>
      </div>}
      <button className={styles.template} type="button" onClick={downloadTemplate}>Unduh template Excel</button>
      <p>Pilih sheet Peserta. Nama dan WhatsApp wajib. Isi VIP dengan Ya, Tidak, atau kosong. Nomor registrasi dibuat otomatis. Maksimal 1.000 baris dan 15 MB.</p>
    </div>
    {busy && <p className={styles.status} role="status">Membaca dan memvalidasi file…</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.status} role="status">{notice}</p>}
    {validated && <>
      <div className={styles.counts} aria-label="Ringkasan validasi">
        <span><strong>{validCount}</strong> siap</span><span><strong>{warningCount}</strong> perlu diperiksa</span><span><strong>{errorCount}</strong> tidak bisa diimpor</span>
      </div>
      <p className={styles.reviewHint}>Baris siap dipilih otomatis. Periksa baris bertanda Periksa sebelum mencentangnya. Tanda VIP dari file bisa diubah per baris atau sekaligus. Baris Tidak bisa perlu diperbaiki di file.</p>
      <div className={styles.previewFilters} aria-label="Tampilan pratinjau">
        <button type="button" aria-pressed={previewFilter === "issues"} onClick={() => setPreviewFilter("issues")}>Perlu ditinjau ({warningCount + errorCount})</button>
        <button type="button" aria-pressed={previewFilter === "all"} onClick={() => setPreviewFilter("all")}>Semua baris ({rows.length})</button>
      </div>
      <div className={styles.vipControls} aria-label="Penandaan VIP">
        <span><strong>{vipCount}</strong> baris ditandai VIP</span>
        <button type="button" disabled={committing || committed} onClick={() => setAllVip(true)}>Tandai semua VIP</button>
        <button type="button" disabled={committing || committed || vipCount === 0} onClick={() => setAllVip(false)}>Hapus semua tanda VIP</button>
      </div>
      {progress && <div className={styles.progress} role="status">Mengimpor peserta: {progress.done} dari {progress.total}</div>}
      {(summary.imported + summary.skipped + summary.failed > 0) && <div className={styles.summary} role="status"><strong>{summary.imported}</strong> diimpor · <strong>{summary.skipped}</strong> dilewati · <strong>{summary.failed}</strong> gagal</div>}
      <div className={styles.tableWrap} tabIndex={0} aria-label="Pratinjau peserta untuk diimpor">
        <table>
          <thead><tr><th scope="col">Pilih</th><th scope="col">Baris</th><th scope="col">Peserta</th><th scope="col">VIP</th><th scope="col">Hasil pemeriksaan</th></tr></thead>
          <tbody>{visibleRows.length === 0 && <tr><td colSpan={5}>Tidak ada baris yang perlu ditinjau.</td></tr>}{visibleRows.map((row) => <tr key={row.requestId}>
            <td><input type="checkbox" aria-label={`Pilih baris ${row.line}`} checked={row.include} disabled={committing || committed || row.status === "ERROR" || row.status === "IMPORTED" || row.status === "SKIPPED"} onChange={() => toggleRow(row.requestId)} /></td>
            <td>{row.line}</td>
            <td><strong className={styles.personName}>{row.name || "Nama kosong"}</strong><span className={styles.personPhone}>{row.whatsapp || "Nomor kosong"}</span></td>
            <td><label className={styles.vipCell}><input type="checkbox" aria-label={`Tamu VIP ${row.name || `baris ${row.line}`}`} checked={row.isVip} disabled={committing || committed || row.status === "ERROR" || row.status === "IMPORTED" || row.status === "SKIPPED"} onChange={(event) => setVip(row.requestId, event.target.checked)} /><span>VIP</span></label></td>
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
