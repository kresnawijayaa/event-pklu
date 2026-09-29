import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Panduan penggunaan | PKLU GPIB 2026" };

export default function GuidePage() {
  return <div className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.identity}>
        <Link href="/" className={styles.logoLink} aria-label="PKLU, ke beranda"><Image src="/pklu-hut-16.png" width={44} height={44} alt="" priority /></Link>
        <div className={styles.identityCopy}><Link href="/" className={styles.brand}>PKLU <span>2026</span></Link><a href="https://gpib.or.id" target="_blank" rel="noopener noreferrer">GPIB</a></div>
      </div>
      <Link href="/" className={styles.back}>Ke aplikasi</Link>
    </header>
    <main className={styles.main}>
      <div className={styles.intro}>
        <p className={styles.kicker}>Untuk panitia</p>
        <h1>Panduan penggunaan</h1>
        <p>Web ini menyimpan data peserta, menyiapkan pesan WhatsApp, dan mencatat siapa yang sudah hadir. Nomor registrasi dibuat otomatis saat data disimpan. Awal nomornya mengikuti prefix di Pengaturan.</p>
      </div>

      <nav className={styles.contents} aria-label="Isi panduan">
        <a href="#mulai">Masuk</a><a href="#data">Masukkan data</a><a href="#peserta">Peserta dan WhatsApp</a><a href="#checkin">Check-in</a><a href="#ringkasan">Ringkasan</a><a href="#pengaturan">Pengaturan</a>
      </nav>

      <div className={styles.manual}>
      <section id="mulai" className={styles.section}>
        <div className={styles.sectionNumber}>01</div>
        <div><h2>Masuk dengan PIN</h2><p>Buka halaman <Link href="/login">Masuk</Link> dan isi PIN panitia. Setelah berhasil, Anda masuk ke Beranda. Panitia dan Admin bisa memakai Pengaturan. Hanya Admin yang bisa memulihkan data terhapus.</p></div>
      </section>

      <section id="data" className={styles.section}>
        <div className={styles.sectionNumber}>02</div>
        <div><h2>Masukkan data peserta</h2>
          <p>Ada dua cara. Gunakan <Link href="/register">Tambah peserta</Link> untuk satu orang. Isi nama dan WhatsApp; buka Data tambahan hanya bila perlu. Gunakan <Link href="/import">Impor</Link> untuk file Excel atau CSV berisi banyak peserta. Panitia dan Admin bisa memakai keduanya.</p>
          <ul>
            <li>Nama dan nomor WhatsApp wajib diisi. Lengkapi nomor yang masih kosong sebelum impor. Kolom Asal Jemaat, Mode, Kategori, Asal Mupel, Tipe, dan Daftar boleh dikosongkan.</li>
            <li>Unduh template Excel dari halaman Impor jika belum punya format file. Setelah memilih file, pilih sheet yang berisi peserta. Lalu periksa data sebelum mengimpor. Untuk CSV, data langsung diperiksa.</li>
            <li>Baris bertanda Periksa perlu ditinjau sebelum dipilih. Baris Tidak bisa harus diperbaiki di Excel, lalu file diunggah kembali.</li>
            <li>Jika data serupa ditemukan, periksa nama dan nomor WhatsApp sebelum memilih baris itu.</li>
            <li>Jangan membuat nomor registrasi di Excel. Sistem membuatnya saat peserta tersimpan.</li>
          </ul>
        </div>
      </section>

      <section id="peserta" className={styles.section}>
        <div className={styles.sectionNumber}>03</div>
        <div><h2>Periksa peserta dan kirim pesan</h2>
          <p>Di halaman <Link href="/participants">Peserta</Link>, cari nama, nomor registrasi, atau nomor WhatsApp. Nomor dan status hadir terlihat pada tiap baris. Pilih ikon pensil untuk mengubah data.</p>
          <p>Pilih <strong>WhatsApp</strong> pada baris peserta. Nomor tujuan dan pesan sudah disiapkan. Periksa pesan lalu tekan Kirim di WhatsApp. Tautan bisa dibuka lagi kapan saja.</p>
        </div>
      </section>

      <section id="checkin" className={styles.section}>
        <div className={styles.sectionNumber}>04</div>
        <div><h2>Catat kehadiran saat peserta datang</h2>
          <p>Buka <Link href="/check-in">Check-in</Link>. Cari nomor registrasi, nama, atau nomor WhatsApp. Cocokkan data pada hasil pencarian, lalu pilih <strong>Catat hadir</strong>. Setelah berhasil, pilih <strong>Cari peserta berikutnya</strong>. Jika salah mencatat, pilih <strong>Batalkan check-in</strong> pada hasil pencarian atau ikon pembatalan di daftar Peserta.</p>
        </div>
      </section>

      <section id="ringkasan" className={styles.section}>
        <div className={styles.sectionNumber}>05</div>
        <div><h2>Lihat ringkasan</h2>
          <p><Link href="/">Beranda</Link> menampilkan total peserta, yang sudah hadir, dan yang belum hadir. Bagian Langkah berikutnya menunjukkan tugas yang masih perlu ditangani. Admin juga bisa mengunduh CSV dari halaman Peserta.</p>
        </div>
      </section>

      <section id="pengaturan" className={styles.section}>
        <div className={styles.sectionNumber}>06</div>
        <div><h2>Ubah pengaturan acara</h2>
          <p>Panitia dan Admin bisa membuka <Link href="/settings">Pengaturan</Link> untuk mengubah nama acara, tanggal, prefix registrasi, dan template pesan WhatsApp. Periksa isinya, lalu pilih <strong>Simpan pengaturan</strong>.</p>
          <ul>
            <li><strong>Prefix registrasi</strong> adalah awal nomor peserta, misalnya PKLU- atau REG-. Setelah prefix diganti, peserta baru memakai prefix terbaru. Nomor peserta yang sudah dibuat tetap sama.</li>
            <li><strong>Template WhatsApp</strong> dipakai saat membuka pesan berikutnya. Tulis <strong>{"{{nama}}"}</strong> untuk nama peserta dan <strong>{"{{nomor}}"}</strong> untuk nomor registrasi. Token <strong>{"{{jemaat}}"}</strong> dan <strong>{"{{tanggal}}"}</strong> juga tersedia. Periksa Pratinjau pesan sebelum menyimpan.</li>
            <li>Jumlah peserta di Beranda dihitung dari data yang sudah tersimpan. Tidak ada target peserta yang perlu diisi.</li>
          </ul>
        </div>
      </section>

      </div>
      <div className={styles.finish}><strong>Siap mulai?</strong><p>Masukkan data peserta lebih dulu. Setelah itu, gunakan halaman Peserta untuk mengirim pesan dan halaman Check-in saat acara.</p><Link href="/">Ke aplikasi</Link></div>
    </main>
    <footer className={styles.footer}><Image src="/pklu-hut-16.png" width={28} height={28} alt="" />PKLU 2026 · <a href="https://gpib.or.id" target="_blank" rel="noopener noreferrer">GPIB</a></footer>
  </div>;
}
