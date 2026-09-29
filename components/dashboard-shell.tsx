"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, ClipboardCheck, FileUp, House, Settings2, UserRoundPlus, UsersRound } from "lucide-react";
import type { AccessRole } from "@/lib/auth/types";
import DashboardBackground from "./dashboard-background";
import styles from "./dashboard-shell.module.css";

export default function DashboardShell({ role, children }: { role: AccessRole; children: React.ReactNode }) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) window.location.replace("/login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.frame}>
      <DashboardBackground />
      <header className={styles.topbar}>
        <div className={styles.identity}>
          <Link className={styles.brand} href="/" aria-label="PKLU, ke beranda">PKLU<span>2026</span></Link>
          <a className={styles.churchLink} href="https://gpib.or.id" target="_blank" rel="noopener noreferrer">GPIB</a>
        </div>
        <nav className={styles.desktopNav} aria-label="Menu utama">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Beranda</Link>
          <Link href="/participants" aria-current={pathname === "/participants" ? "page" : undefined}>Peserta</Link>
          <Link href="/register" aria-current={pathname === "/register" ? "page" : undefined}>Tambah peserta</Link>
          <Link href="/check-in" aria-current={pathname === "/check-in" ? "page" : undefined}>Check-in</Link>
          <Link href="/import" aria-current={pathname === "/import" ? "page" : undefined}>Impor</Link>
          <Link href="/settings" aria-current={pathname === "/settings" ? "page" : undefined}>Pengaturan</Link>
        </nav>
        <div className={styles.account}>
          <span className={styles.role}>{role === "ADMIN" ? "Admin" : "Panitia"}</span>
          <Link className={styles.helpLink} href="/panduan" aria-label="Buka panduan penggunaan" aria-current={pathname === "/panduan" ? "page" : undefined}><CircleHelp aria-hidden="true" /><span>Panduan</span></Link>
          <button type="button" onClick={logout} disabled={busy}>{busy ? "Keluar…" : "Keluar"}</button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <nav className={`${styles.mobileNav} ${styles.sixItemMobileNav}`} aria-label="Menu utama">
        <Link href="/" aria-label="Ringkasan" aria-current={pathname === "/" ? "page" : undefined}><House aria-hidden="true" />Beranda</Link>
        <Link href="/participants" aria-current={pathname === "/participants" ? "page" : undefined}><UsersRound aria-hidden="true" />Peserta</Link>
        <Link href="/register" aria-label="Registrasi peserta" aria-current={pathname === "/register" ? "page" : undefined}><UserRoundPlus aria-hidden="true" />Tambah</Link>
        <Link href="/check-in" aria-current={pathname === "/check-in" ? "page" : undefined}><ClipboardCheck aria-hidden="true" />Check-in</Link>
        <Link href="/import" aria-current={pathname === "/import" ? "page" : undefined}><FileUp aria-hidden="true" />Impor</Link>
        <Link href="/settings" aria-label="Pengaturan" aria-current={pathname === "/settings" ? "page" : undefined}><Settings2 aria-hidden="true" />Atur</Link>
      </nav>
      <footer className={styles.footer}>PKLU 2026 <span>·</span> <a href="https://gpib.or.id" target="_blank" rel="noopener noreferrer">GPIB</a></footer>
    </div>
  );
}
