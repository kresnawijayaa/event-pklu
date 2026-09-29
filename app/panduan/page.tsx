import Link from "next/link";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Panduan penggunaan | PKLU GPIB 2026" };

export default function GuidePage() {
  return <div className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.identity}><Link href="/" className={styles.brand}>PKLU <span>2026</span></Link><a href="https://gpib.or.id" target="_blank" rel="noopener noreferrer">GPIB</a></div>
      <Link href="/" className={styles.back}>Ke aplikasi</Link>
    </header>
    <main className={styles.main}>
      <div className={styles.intro}>
        <p className={styles.kicker}>Untuk panitia</p>
        <h1>Panduan penggunaan</h1>
        <p>Web ini menyimpan data peserta, menyiapkan pesan WhatsApp, dan mencatat siapa yang sudah hadir. Nomor peserta seperti <strong>PKLU-001</strong> dibuat otomatis saat data disimpan.</p>
      </div>

      <nav className={styles.contents} aria-label="Isi panduan">
        <a href="#mulai">Masuk</a><a href="#data">Masukkan data</a><a href="#peserta">Peserta dan WhatsApp</a><a href="#checkin">Check-in</a><a href="#ringkasan">Ringkasan</a>
      </nav>

      <div className={styles.manual}>
      <section id="mulai" className={styles.section}>
        <div className={styles.sectionNumber}>01</div>
        <div><h2>Masuk dengan PIN</h2><p>Buka halaman <Link href="/login">Masuk</Link> dan isi PIN panitia. Setelah berhasil, Anda masuk ke Beranda. PIN Admin membuka fitur tambahan seperti Pengaturan dan pemulihan data terhapus.</p></div>
      </section>

      <section id="data" className={styles.section}>
        <div className={styles.sectionNumber}>02</div>
        <div><h2>Masukkan data peserta</h2>
          <p>Ada dua cara. Gunakan <Link href="/register">Tambah peserta</Link> untuk satu orang. Isi nama dan WhatsApp; buka Data tambahan hanya bila perlu. Gunakan <Link href="/import">Impor</Link> untuk file Excel atau CSV berisi banyak peserta. Panitia dan Admin bisa memakai keduanya.</p>
          <ul>
            <li>Nama dan nomor WhatsApp wajib diisi. Lengkapi nomor yang masih kosong sebelum impor. Kolom Asal Jemaat, Mode, Kategori, Asal Mupel, Tipe, dan Daftar boleh dikosongkan.</li>
            <li>Unduh template Excel dari halaman Impor jika belum punya format file. Isi data pada sheet pertama, lalu ikuti tahap Pilih file, Periksa data, dan Lihat hasil.</li>
            <li>Baris bertanda Periksa perlu ditinjau sebelum dipilih. Baris Tidak bisa harus diperbaiki di Excel, lalu file diunggah kembali.</li>
            <li>Jika data serupa ditemukan, periksa nama dan nomor WhatsApp sebelum memilih baris itu.</li>
            <li>Jangan membuat nomor registrasi di Excel. Sistem membuat kode <strong>PKLU-...</strong> saat peserta tersimpan.</li>
          </ul>
        </div>
      </section>

      <section id="peserta" className={styles.section}>
        <div className={styles.sectionNumber}>03</div>
        <div><h2>Periksa peserta dan kirim pesan</h2>
          <p>Di halaman <Link href="/participants">Peserta</Link>, cari nama, kode PKLU, atau nomor WhatsApp. Buka baris peserta untuk melihat nomor dan data lain. Gunakan <strong>Edit data</strong> bila ada yang perlu diperbaiki.</p>
          <p>Pilih <strong>Buka WhatsApp</strong>. Nomor tujuan dan pesan sudah disiapkan. Periksa lalu tekan Kirim di WhatsApp. Setelah terkirim, kembali ke web dan pilih <strong>Konfirmasi terkirim</strong>. Membuka WhatsApp saja belum berarti pesan sudah dikirim.</p>
        </div>
      </section>

      <section id="checkin" className={styles.section}>
        <div className={styles.sectionNumber}>04</div>
        <div><h2>Catat kehadiran saat peserta datang</h2>
          <p>Buka <Link href="/check-in">Check-in</Link>. Cari kode PKLU, nama, atau nomor WhatsApp. Cocokkan nama, kode, dan nomor pada hasil pencarian, lalu pilih <strong>Catat hadir</strong>. Setelah berhasil, pilih <strong>Cari peserta berikutnya</strong>. Jika peserta sudah tercatat hadir, waktunya tetap memakai check-in pertama.</p>
        </div>
      </section>

      <section id="ringkasan" className={styles.section}>
        <div className={styles.sectionNumber}>05</div>
        <div><h2>Lihat ringkasan</h2>
          <p><Link href="/">Beranda</Link> menampilkan total peserta, yang sudah hadir, yang belum hadir, dan WhatsApp yang sudah dikonfirmasi. Bagian Langkah berikutnya menunjukkan tugas yang masih perlu ditangani. Admin juga bisa mengunduh CSV dari halaman Peserta serta mengatur acara dan pesan WhatsApp.</p>
        </div>
      </section>

      </div>
      <div className={styles.finish}><strong>Siap mulai?</strong><p>Masukkan data peserta lebih dulu. Setelah itu, gunakan halaman Peserta untuk mengirim pesan dan halaman Check-in saat acara.</p><Link href="/">Ke aplikasi</Link></div>
    </main>
    <footer className={styles.footer}>PKLU 2026 · <a href="https://gpib.or.id" target="_blank" rel="noopener noreferrer">GPIB</a></footer>
  </div>;
}
