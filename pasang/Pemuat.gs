/**
 * PEMUAT SISTEM WEBSITE YAYASAN
 * ==================================================================
 * Ini satu-satunya file kode di proyek Apps Script (selain appsscript.json).
 * Seluruh sistem diambil dari folder gas/ di repo GitHub, disimpan di
 * Script Properties, lalu dijalankan dari sana. Jadi:
 *   • Update = unggah ke GitHub, lalu klik "Perbarui sistem" di panel admin
 *     (atau menu Sheet "Yayasan › Perbarui sistem dari GitHub").
 *   • Tidak perlu Apps Script API, Google Cloud, atau deploy versi baru.
 *
 * PEMASANGAN (sekali saja)
 *   1. Di editor Apps Script, hapus semua file kode lain. Sisakan appsscript.json.
 *   2. Isi appsscript.json dengan pasang/appsscript.json, lalu buat file
 *      Pemuat.gs berisi file ini. Simpan.
 *   3. Pilih fungsi perbaruiSistem › Jalankan › izinkan akses.
 *   4. Terapkan › Kelola deployment › ✎ › Versi: Versi baru ›
 *      Jalankan sebagai: Saya · Yang memiliki akses: Siapa saja › Terapkan.
 *
 * File ini tidak perlu diubah lagi. Bila sebuah update bermasalah,
 * jalankan kembalikanVersiSebelumnya.
 */

var PEMUAT = {
  REPO: 'yysbinabaktibestari/web',   // pemilik/nama repo GitHub (harus publik)
  CABANG: 'main',
  FOLDER: 'gas'
};

// Lupa password admin? Isi lalu jalankan resetPasswordAdmin, kemudian kosongkan lagi.
// (Bisa juga lewat menu Sheet "Yayasan › Reset password admin".)
var RESET_USERNAME = 'admin';
var RESET_SANDI = '';


/* ===== Dijalankan pemilik dari editor atau menu Sheet ===== */

/** Tarik kode terbaru dari GitHub, pasang, lalu siapkan sheet/trigger/akun admin. */
function perbaruiSistem() {
  pmPemilik_();
  var lama = ['CONFIG', 'MODUL', 'ADMIN_API', 'halamanAdmin_', 'pembaruanDariGitHub_', 'PEMBARU_BAWAAN']
    .filter(function (n) { return typeof GLOBAL_PEMUAT_[n] !== 'undefined'; });
  if (!SISTEM_DIMUAT_ && lama.length) {
    throw new Error('Masih ada file kode lama di proyek ini. Hapus semua file selain Pemuat.gs dan ' +
      'appsscript.json (klik ⋮ di samping nama file › Hapus), simpan, lalu jalankan perbaruiSistem lagi.');
  }
  var h = pmPasang_();
  var pesan = [h.pesan];
  try {
    var s = pmTeruskan_('setup', []);
    pesan.push(s || 'Sheet, folder, trigger & akun admin sudah disiapkan.');
  } catch (e) {
    pesan.push('Setup belum berhasil: ' + pmPesan_(e) + ' — jalankan fungsi setup.');
  }
  var url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { /* belum di-deploy */ }
  pesan.push(url ? 'Web app: ' + url + '\nPanel admin: ' + url + '?admin'
    : 'Langkah terakhir (sekali saja): Terapkan › Deployment baru › Aplikasi web · Jalankan sebagai: Saya · Akses: Siapa saja.');
  pmLapor_(pesan.join('\n\n'));
  return h;
}

/** Bila update terakhir bermasalah: kembali ke kode sebelumnya. */
function kembalikanVersiSebelumnya() {
  pmPemilik_();
  var sp = PropertiesService.getScriptProperties(), p = sp.getProperties();
  var aktif = pmInfo_(p.PEMUAT_AKTIF), sebelum = pmInfo_(p.PEMUAT_SEBELUM);
  if (!sebelum) throw new Error('Tidak ada versi sebelumnya yang tersimpan.');
  var t = { PEMUAT_AKTIF: JSON.stringify(sebelum), CACHE_VER: pmVerBaru_(p) };
  if (aktif) t.PEMUAT_SEBELUM = JSON.stringify(aktif);
  sp.setProperties(t);
  pmHapusCache_();
  pmLapor_('Sistem dikembalikan ke ' + pmLabel_(sebelum) + '. Berlaku langsung.');
}


/* ===== Titik masuk — diteruskan ke kode sistem ===== */

function doGet(e) { return pmWeb_('doGet', arguments); }
function doPost(e) { return pmWeb_('doPost', arguments); }
function adminMasuk() { return pmTeruskan_('adminMasuk', arguments); }
function adminKeluar() { return pmTeruskan_('adminKeluar', arguments); }
function adminPanggil() { return pmTeruskan_('adminPanggil', arguments); }
function setup() { return pmTeruskan_('setup', arguments); }
function resetPasswordAdmin() { return pmTeruskan_('resetPasswordAdmin', arguments); }
function sinkronSemua() { return pmTeruskan_('sinkronSemua', arguments); }
function naikkanVersiCache() { return pmTeruskan_('naikkanVersiCache', arguments); }
function tampilkanUrlAdmin() { return pmTeruskan_('tampilkanUrlAdmin', arguments); }
function tugasPerJam() { if (pmMuat_()) return pmTeruskan_('tugasPerJam', arguments); }
function onEdit(e) { try { if (pmMuat_()) return pmTeruskan_('onEdit', arguments); } catch (x) { console.error(x); } }
function onOpen(e) {
  try { if (pmMuat_()) return pmTeruskan_('onOpen', arguments); } catch (x) { console.error(x); }
  try {
    SpreadsheetApp.getUi().createMenu('Yayasan')
      .addItem('Perbarui sistem dari GitHub', 'perbaruiSistem')
      .addItem('Kembalikan versi sebelumnya', 'kembalikanVersiSebelumnya')
      .addToUi();
  } catch (x) { /* bukan dari Sheet */ }
}


/* ===== Mesin pemuat (jangan diubah) ===== */

var GLOBAL_PEMUAT_ = typeof globalThis !== 'undefined' ? globalThis : this;
var SISTEM_DIMUAT_ = false;
var PM_POTONG = 8000;   // batas nilai Script Properties ±9 KB
var PM_PINTU = ['doGet', 'doPost', 'adminMasuk', 'adminKeluar', 'adminPanggil', 'setup', 'resetPasswordAdmin',
  'sinkronSemua', 'naikkanVersiCache', 'tampilkanUrlAdmin', 'tugasPerJam', 'onEdit', 'onOpen'];
var PM_ASLI = {};
PM_PINTU.forEach(function (n) { PM_ASLI[n] = GLOBAL_PEMUAT_[n]; });

/** Muat kode sistem (sekali per eksekusi). false = belum terpasang. */
function pmMuat_() {
  if (SISTEM_DIMUAT_) return true;
  var p = PropertiesService.getScriptProperties().getProperties();
  var info = pmInfo_(p.PEMUAT_AKTIF);
  if (!info) return false;
  var b64 = '';
  for (var i = 0; i < info.n; i++) {
    var bagian = p['PEMUAT_' + info.id + '_' + i];
    if (bagian == null) throw new Error('Kode sistem tersimpan tidak lengkap. Jalankan perbaruiSistem lagi.');
    b64 += bagian;
  }
  var kode = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip')).getDataAsString('UTF-8');
  (0, eval)(kode + '\n//# sourceURL=sistem-yayasan.js');
  SISTEM_DIMUAT_ = true;
  return true;
}

function pmTeruskan_(nama, args) {
  if (!pmMuat_()) throw new Error('Sistem belum terpasang. Di editor Apps Script, pilih fungsi perbaruiSistem lalu klik Jalankan.');
  var f = GLOBAL_PEMUAT_[nama];
  if (typeof f !== 'function' || f === PM_ASLI[nama]) throw new Error('Fungsi "' + nama + '" tidak ada di kode sistem.');
  return f.apply(GLOBAL_PEMUAT_, Array.prototype.slice.call(args));
}

/** doGet/doPost: galat pemuatan tetap dijawab JSON agar website menampilkan pesan yang rapi. */
function pmWeb_(nama, args) {
  try { return pmTeruskan_(nama, args); } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: pmPesan_(e) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** Unduh repo → rakit → uji → simpan. Dipakai perbaruiSistem dan tombol panel admin. */
function pmPasang_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Pembaruan lain sedang berjalan. Coba lagi sebentar.');
  try {
    var u = pmUnduh_();
    var kode = pmRakit_(u.berkas);
    pmUji_(kode);
    var md5 = pmMd5_(kode);
    var sp = PropertiesService.getScriptProperties(), p = sp.getProperties();
    var lama = pmInfo_(p.PEMUAT_AKTIF);
    if (lama && lama.md5 === md5) {
      return { baru: false, info: lama, pesan: 'Sistem sudah versi terbaru (' + pmLabel_(lama) + '). Tidak ada yang berubah.' };
    }
    var b64 = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(kode, 'text/plain', 'sistem.js')).getBytes());
    var id = 'k' + md5.slice(0, 10), t = {}, n = 0;
    for (var i = 0; i < b64.length; i += PM_POTONG) t['PEMUAT_' + id + '_' + (n++)] = b64.slice(i, i + PM_POTONG);
    var info = { id: id, n: n, md5: md5, versi: u.versi, berkas: u.jumlah, waktu: new Date().toISOString() };
    t.PEMUAT_AKTIF = JSON.stringify(info);
    if (lama) t.PEMUAT_SEBELUM = JSON.stringify(lama);
    t.CACHE_VER = pmVerBaru_(p);
    sp.setProperties(t);
    // buang kode versi yang lebih lama (simpan: aktif + sebelumnya)
    Object.keys(p).forEach(function (k) {
      var m = k.match(/^PEMUAT_(k[0-9a-f]+)_\d+$/);
      if (m && m[1] !== id && !(lama && m[1] === lama.id)) sp.deleteProperty(k);
    });
    pmHapusCache_();
    return { baru: true, info: info,
      pesan: (lama ? 'Sistem diperbarui ke ' : 'Sistem terpasang: ') + pmLabel_(info) + '. Berlaku langsung, tanpa deploy ulang.' };
  } finally {
    lock.releaseLock();
  }
}

function pmUnduh_() {
  var url = 'https://codeload.github.com/' + PEMUAT.REPO + '/zip/refs/heads/' + PEMUAT.CABANG;
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() !== 200) {
    throw new Error('Repo GitHub tidak bisa diunduh (HTTP ' + r.getResponseCode() + '). Pastikan repo "' + PEMUAT.REPO +
      '" publik dan cabang "' + PEMUAT.CABANG + '" ada.');
  }
  var pola = new RegExp('^[^/]+/' + PEMUAT.FOLDER + '/([^/]+)\\.(gs|html)$');
  var berkas = [], versi = '';
  Utilities.unzip(r.getBlob().setContentType('application/zip')).forEach(function (b) {
    var nama = String(b.getName()), m = nama.match(pola);
    if (m) berkas.push({ nama: m[1], jenis: m[2], isi: b.getDataAsString('UTF-8') });
    else if (/^[^/]+\/assets\/js\/config\.js$/.test(nama)) {
      var v = b.getDataAsString('UTF-8').match(/VERSI\s*:\s*['"]([^'"]+)/);
      if (v) versi = v[1];
    }
  });
  if (!berkas.some(function (b) { return b.nama === '01_Inti'; })) {
    throw new Error('Folder ' + PEMUAT.FOLDER + '/ di repo GitHub tidak berisi kode sistem (01_Inti.gs tidak ditemukan).');
  }
  return { berkas: berkas, versi: versi, jumlah: berkas.length };
}

/** Gabungkan semua .gs (urut nama) + .html (sebagai teks BERKAS_HTML_) menjadi satu kode. */
function pmRakit_(berkas) {
  var html = {}, js = [];
  berkas.slice().sort(function (a, b) { return a.nama < b.nama ? -1 : a.nama > b.nama ? 1 : 0; }).forEach(function (b) {
    if (b.jenis === 'html') html[b.nama] = b.isi;
    else if (String(b.isi).trim()) js.push('// ===== ' + b.nama + '.gs =====\n' + b.isi);
  });
  return 'var BERKAS_HTML_ = ' + JSON.stringify(html) + ';\n\n' + js.join('\n;\n\n') + '\n';
}

/** Jalankan kode baru di ruang terpisah: menangkap galat sintaks/muat & fungsi yang hilang. */
function pmUji_(kode) {
  var cek;
  try {
    cek = new Function('__G', kode + '\n;return [' + PM_PINTU.map(function (n) {
      return '(typeof ' + n + ' === "function" && ' + n + ' !== __G.' + n + ')';
    }).join(',') + '];')(GLOBAL_PEMUAT_);
  } catch (e) {
    throw new Error('Kode di GitHub bermasalah, pembaruan dibatalkan (sistem lama tetap berjalan): ' + pmPesan_(e));
  }
  var kurang = PM_PINTU.filter(function (n, i) { return !cek[i]; });
  if (kurang.length) throw new Error('Kode di GitHub tidak lengkap (tidak ada: ' + kurang.join(', ') + '). Pembaruan dibatalkan.');
}

/** Info versi terpasang, untuk panel admin. */
function pmInfoAktif_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  var a = pmInfo_(p.PEMUAT_AKTIF);
  return a ? { versi: a.versi || '', waktu: a.waktu, berkas: a.berkas, label: pmLabel_(a), adaSebelumnya: !!pmInfo_(p.PEMUAT_SEBELUM) } : null;
}

function pmInfo_(s) { try { var o = s ? JSON.parse(s) : null; return o && o.id && o.n ? o : null; } catch (e) { return null; } }
function pmLabel_(i) {
  var w = '';
  try { w = Utilities.formatDate(new Date(i.waktu), 'Asia/Jakarta', 'd MMM yyyy HH:mm'); } catch (e) { /* abaikan */ }
  return (i.versi ? 'versi ' + i.versi : 'kode ' + i.id) + (w ? ', ' + w : '');
}
function pmVerBaru_(p) { return String((Number(p.CACHE_VER) || 1) + 1); }
function pmHapusCache_() { try { CacheService.getScriptCache().remove('__ver'); } catch (e) { /* abaikan */ } }
function pmMd5_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function pmPesan_(e) { return String(e && e.message ? e.message : e); }
function pmPemilik_() {
  var aktif = '', efektif = '';
  try { aktif = Session.getActiveUser().getEmail(); efektif = Session.getEffectiveUser().getEmail(); } catch (e) { /* abaikan */ }
  if (!aktif || aktif !== efektif) throw new Error('Fungsi ini hanya bisa dijalankan pemilik dari editor Apps Script atau menu Sheet.');
}
function pmLapor_(pesan) {
  Logger.log(pesan);
  try { SpreadsheetApp.getUi().alert(pesan); } catch (e) { /* dijalankan dari editor: lihat Log eksekusi */ }
}
