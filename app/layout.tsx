import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PKLU GPIB 2026 | Registrasi dan Check-in",
  description: "Akses panitia untuk registrasi dan check-in PKLU GPIB 2026.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
