"use client";

import { useState } from "react";
import { createWhatsAppUrl, renderWhatsAppMessage } from "@/lib/whatsapp";
import styles from "./whatsapp-actions.module.css";

type Props = {
  participant: { id: string; name: string; registrationCode: string; whatsappE164: string; church: string | null; whatsappOpenedAt: string | null; whatsappConfirmedAt: string | null };
  template: string;
  eventDate: string;
  onStatusChange?: (openedAt: string | null, confirmedAt: string | null) => void;
};

export default function WhatsAppActions({ participant, template, eventDate, onStatusChange }: Props) {
  const [openedAt, setOpenedAt] = useState(participant.whatsappOpenedAt);
  const [confirmedAt, setConfirmedAt] = useState(participant.whatsappConfirmedAt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const text = renderWhatsAppMessage(template, {
    name: participant.name, registrationCode: participant.registrationCode,
    church: participant.church, eventDate,
  });
  const href = createWhatsAppUrl(participant.whatsappE164, text);

  function markOpened() {
    if (openedAt) return;
    const now = new Date().toISOString();
    setOpenedAt(now);
    onStatusChange?.(now, confirmedAt);
    void fetch(`/api/participants/${participant.id}/whatsapp-opened`, { method: "POST", keepalive: true })
      .then((response) => {
        if (!response.ok) {
          setOpenedAt(null); onStatusChange?.(null, confirmedAt);
          setMessage("Status buka WhatsApp belum tersimpan.");
        }
      })
      .catch(() => {
        setOpenedAt(null); onStatusChange?.(null, confirmedAt);
        setMessage("Status buka WhatsApp belum tersimpan.");
      });
  }

  async function confirmSent() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/participants/${participant.id}/whatsapp-confirmed`, { method: "POST" });
      const result = await response.json() as { ok: boolean; data?: { whatsappOpenedAt: string | null; whatsappConfirmedAt: string | null }; error?: { message?: string } };
      if (!response.ok || !result.ok || !result.data) throw new Error(result.error?.message ?? "Konfirmasi belum tersimpan.");
      setOpenedAt(result.data.whatsappOpenedAt); setConfirmedAt(result.data.whatsappConfirmedAt);
      onStatusChange?.(result.data.whatsappOpenedAt, result.data.whatsappConfirmedAt);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  return <div className={styles.actions}>
    <a className={styles.open} href={href} target="_blank" rel="noopener noreferrer" onClick={markOpened}>Buka WhatsApp <span aria-hidden="true">↗</span></a>
    {confirmedAt ? <span className={styles.confirmed} role="status">Terkonfirmasi</span> : <button className={styles.confirm} type="button" onClick={confirmSent} disabled={busy}>{busy ? "Menyimpan…" : "Konfirmasi terkirim"}</button>}
    {message && <span className={styles.message} role="status">{message}</span>}
    {openedAt && !confirmedAt && <span className={styles.opened}>Tautan dibuka · belum dikonfirmasi</span>}
  </div>;
}
