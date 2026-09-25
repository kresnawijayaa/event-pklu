import type { Metadata } from "next";
import CheckInSearch from "@/components/check-in-search";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Check-in | PKLU GPIB 2026" };

export default function CheckInPage() {
  return <div className={styles.page}>
    <h1>Check-in</h1>
    <CheckInSearch />
  </div>;
}
