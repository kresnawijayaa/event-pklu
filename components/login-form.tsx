"use client";

import { FormEvent, useState } from "react";
import styles from "./login-form.module.css";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: { message?: string } };

export default function LoginForm() {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!/^\d{4}(?:\d{2})?$/.test(pin)) {
      setMessage("PIN harus berisi 4 atau 6 digit angka.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }),
      });
      const body = await response.json() as ApiResult<{ role: "STAFF" | "ADMIN" }>;
      if (!response.ok || !body.ok) throw new Error(body.ok ? "PIN belum dapat diverifikasi." : body.error?.message || "PIN belum dapat diverifikasi.");
      window.location.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Koneksi bermasalah. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={styles.label} htmlFor="pin">PIN panitia</label>
      <input
        className={styles.input}
        id="pin"
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        maxLength={6}
        value={pin}
        onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 6)); if (message) setMessage(""); }}
        aria-describedby={message ? "pin-error" : "pin-hint"}
        aria-invalid={Boolean(message)}
        disabled={submitting}
      />
      <p className={styles.hint} id="pin-hint">Panitia memakai 4 digit. Admin memakai 6 digit.</p>
      {message && <p className={styles.error} id="pin-error" role="alert">{message}</p>}
      <button className={styles.submitButton} type="submit" disabled={submitting || pin.length < 4}>
        {submitting ? "Memeriksa…" : "Masuk"}<span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
