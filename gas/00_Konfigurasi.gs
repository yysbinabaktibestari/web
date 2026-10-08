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
  CACHE_DETIK: 3600,

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

  BATAS_WAKTU_MS: 5 * 60 * 1000,
  // Sinkron lanjutan otomatis (1 menit kemudian) selama masih ada antrean artikel/video.
  // Akun Gmail punya jatah total trigger ±90 menit/hari; lanjutan berhenti bila pemakaian hari itu > batas ini.
  SINKRON_LANJUTAN_MENIT_HARI: 60,

  // Ukuran maksimum bukti transfer (byte)
  MAKS_BUKTI: 5 * 1024 * 1024
};

var STATUS = { DRAF: 'Draf', TAYANG: 'Tayang', TIDAK: 'Tidak tayang' };

/** Baca / tulis Script Properties. */
/**
 * Script Properties. Bacaan memakai salinan yang diambil sekali (berlaku 15 detik) agar setiap
 * permintaan website cukup satu kali akses ke layanan Properties, bukan puluhan.
 */
var PROP_MEMO_ = null, PROP_MEMO_T_ = 0;
function prop_(kunci, nilai) {
  var p = PropertiesService.getScriptProperties();
  if (nilai === undefined) {
    if (!PROP_MEMO_ || Date.now() - PROP_MEMO_T_ > 15000) { PROP_MEMO_ = p.getProperties(); PROP_MEMO_T_ = Date.now(); }
    return Object.prototype.hasOwnProperty.call(PROP_MEMO_, kunci) ? PROP_MEMO_[kunci] : null;
  }
  if (nilai === null) { p.deleteProperty(kunci); if (PROP_MEMO_) delete PROP_MEMO_[kunci]; return null; }
  p.setProperty(kunci, String(nilai));
  if (PROP_MEMO_) PROP_MEMO_[kunci] = String(nilai);
  return nilai;
}
/** Baca langsung tanpa salinan (untuk nilai yang bisa diubah eksekusi lain, mis. versi cache). */
function propSegar_(kunci) { return PropertiesService.getScriptProperties().getProperty(kunci); }
