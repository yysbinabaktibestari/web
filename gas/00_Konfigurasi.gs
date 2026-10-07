/**
 * KONFIGURASI UTAMA
 * ------------------------------------------------------------------
 * Ubah nilai di bawah sesuai kebutuhan. ID folder Drive, ID spreadsheet
 * dan password admin disimpan otomatis oleh setup() di Script Properties.
 */
var CONFIG = {
  // Alamat website di GitHub Pages (dipakai untuk tautan di RSS / JSON Feed)
  SITE_URL: 'https://USERNAME.github.io/REPO/',

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
  BATAS_WAKTU_MS: 4.5 * 60 * 1000,

  // Ukuran maksimum bukti transfer (byte)
  MAKS_BUKTI: 5 * 1024 * 1024
};

var STATUS = { DRAF: 'Draf', TAYANG: 'Tayang', TIDAK: 'Tidak tayang' };

/** Baca / tulis Script Properties. */
function prop(kunci, nilai) {
  var p = PropertiesService.getScriptProperties();
  if (nilai === undefined) return p.getProperty(kunci);
  if (nilai === null) { p.deleteProperty(kunci); return null; }
  p.setProperty(kunci, String(nilai));
  return nilai;
}
