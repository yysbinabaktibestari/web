/**
 * KONFIGURASI UTAMA
 * ------------------------------------------------------------------
 * Ubah nilai di bawah sesuai kebutuhan LANGSUNG DI GITHUB (file ini),
 * lalu klik "Perbarui sistem" di panel admin. ID folder Drive & spreadsheet
 * disimpan otomatis oleh setup() di Script Properties.
 * Alamat repo sumber update diatur di Pemuat.gs (proyek Apps Script).
 */
var CONFIG = {
  // Alamat website di GitHub Pages (dipakai untuk tautan di RSS / JSON Feed)
  SITE_URL: 'https://yysbinabaktibestari.github.io/web/',

  ZONA_WAKTU: 'Asia/Jakarta',

  // Lama cache data publik (detik). Setiap simpan dari admin otomatis menyegarkan cache.
  CACHE_DETIK: 300,

  // ---- Kontributor & mirroring ----
  // Status kontributor baru (termasuk yang mendaftar sendiri lewat website)
  KONTRIBUTOR_STATUS_DEFAULT: 'Tayang',
  // Status artikel kontributor yang baru tersinkron
  ARTIKEL_KONTRIBUTOR_STATUS_DEFAULT: 'Tayang',
  // Formulir "Jadi Kontributor" di website
  PENDAFTARAN_KONTRIBUTOR_TERBUKA: true,

  // Hapus nomor urut di depan nama file kontributor, mis. "01. Judul" / "3 - Judul" / "(2) Judul"
  BERSIHKAN_NOMOR_JUDUL: true,

  // ---- Urutan artikel ----
  // Pemerataan: artikel dalam N hari terakhir disusun bergiliran antar kontributor/penulis
  // agar daftar tidak didominasi satu penulis. Artikel lebih lama tetap urut tanggal.
  PEMERATAAN_ARTIKEL: true,
  PEMERATAAN_HARI: 30,

  // ---- Artikel ----
  // Slug kategori yang tampil sebagai "Info Yayasan" di beranda
  KATEGORI_PENGUMUMAN: 'pengumuman',
  // (opsional) ID Google Doc template untuk tombol "Buat Google Doc"
  TEMPLATE_DOC_ID: '',

  // ---- Feed ----
  FEED_JUMLAH: 30,

  // Modul yang dimatikan tanpa menghapus file-nya, mis. ['donasi']
  MODUL_NONAKTIF: [],

  // Batas waktu proses latar agar tidak melewati batas 6 menit Apps Script
  // ---- Keuangan: kode akun (sheet Kategori kas) untuk donasi yang dikonfirmasi lewat website ----
  KAS_AKUN_DONASI: 'DON',
  KAS_AKUN_DONASI_PROGRAM: 'DON-PRG',

  BATAS_WAKTU_MS: 4.5 * 60 * 1000,

  // Ukuran maksimum bukti transfer (byte)
  MAKS_BUKTI: 5 * 1024 * 1024
};

var STATUS = { DRAF: 'Draf', TAYANG: 'Tayang', TIDAK: 'Tidak tayang' };

/** Baca / tulis Script Properties. */
function prop_(kunci, nilai) {
  var p = PropertiesService.getScriptProperties();
  if (nilai === undefined) return p.getProperty(kunci);
  if (nilai === null) { p.deleteProperty(kunci); return null; }
  p.setProperty(kunci, String(nilai));
  return nilai;
}
