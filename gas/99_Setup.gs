/**
 * SETUP & PEMELIHARAAN
 * ------------------------------------------------------------------
 * 1. setup() dijalankan otomatis oleh perbaruiSistem (Pemuat.gs). Akun
 *    Superadmin pertama ("admin") + password awal muncul di Log eksekusi.
 * 2. Aman dijalankan lagi kapan saja — sheet & kolom baru dibuat tanpa
 *    menyentuh data lama (biasanya tidak perlu: struktur menyesuaikan otomatis).
 * 3. Lupa password / terkunci: menu Sheet "Yayasan › Reset password admin",
 *    atau isi RESET_SANDI di Pemuat.gs lalu jalankan resetPasswordAdmin.
 */

function setup() {
  hanyaPemilik_();
  var ss = SpreadsheetApp.getActive();
  if (!ss && !prop_('SPREADSHEET_ID')) {
    throw new Error('Buka Apps Script dari Google Sheet (Ekstensi › Apps Script), lalu jalankan setup() lagi.');
  }
  if (ss) prop_('SPREADSHEET_ID', ss.getId());

  semuaSheetDef_().forEach(pastikanSheet_);
  var awal = buku_().getSheetByName('Sheet1') || buku_().getSheetByName('Lembar1');
  if (awal && awal.getLastRow() === 0 && buku_().getSheets().length > 1) buku_().deleteSheet(awal);

  ['FOLDER_INDUK', 'FOLDER_DOCS', 'FOLDER_GAMBAR', 'FOLDER_CACHE', 'FOLDER_BUKTI'].forEach(folder_);

  var akun = pastikanSuperadmin_(true);
  migrasi_();
  prop_('STRUKTUR', sidikStruktur_());

  pasangTrigger_();
  naikkanVersiCache();
  var pesan = 'Setup selesai: sheet, folder Drive, trigger & akun admin siap.' + (akun ? '\n' + akun : '');
  var kurang = '';
  try {
    var izin = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    if (izin.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) kurang = izin.getAuthorizationUrl() || '';
  } catch (e) { /* abaikan */ }
  if (kurang) {
    prop_('YT_IZIN_URL', kurang);
    pesan += '\nPERHATIAN: sebagian izin belum dicentang (layar izin Google kini memakai kotak centang per izin, mis. YouTube). ' +
      'Buka tautan ini dengan akun Google pemilik, pilih "Pilih semua", lalu Lanjutkan:\n' + kurang + '\nSesudahnya jalankan perbaruiSistem sekali lagi.';
  } else {
    try { if (typeof cekYoutube_ === 'function') pesan += '\n' + cekYoutube_(); } catch (e) { /* abaikan */ }
  }
  Logger.log(pesan);
  return pesan;
}

/**
 * Darurat: reset password (atau buat akun Superadmin) dari editor.
 * Isi USERNAME & BARU, jalankan, lalu kosongkan kembali BARU.
 */
function resetPasswordAdmin() {
  hanyaPemilik_();
  var USERNAME = String((typeof RESET_USERNAME !== 'undefined' && RESET_USERNAME) || 'admin').trim();
  var BARU = String((typeof RESET_SANDI !== 'undefined' && RESET_SANDI) || '');
  var dariVariabel = !!BARU, ui = null;
  if (!BARU) {
    try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }   // dari editor: tidak ada UI
    if (ui) {
      var r1 = ui.prompt('Reset password admin', 'Username yang direset (kosongkan = admin):', ui.ButtonSet.OK_CANCEL);
      if (r1.getSelectedButton() !== ui.Button.OK) return;
      USERNAME = r1.getResponseText().trim() || 'admin';
      var r2 = ui.prompt('Reset password admin', 'Password baru untuk "' + USERNAME + '" (minimal 8 karakter):', ui.ButtonSet.OK_CANCEL);
      if (r2.getSelectedButton() !== ui.Button.OK) return;
      BARU = r2.getResponseText();
    }
  }
  if (BARU.length < 8) {
    throw new Error('Password baru minimal 8 karakter. Pakai menu Sheet "Yayasan › Reset password admin", ' +
      'atau isi RESET_SANDI di Pemuat.gs lalu jalankan resetPasswordAdmin lagi.');
  }
  var tb = new Tabel_('Admin');
  var u = tb.objek().filter(function (x) { return String(x.username).toLowerCase() === USERNAME.toLowerCase(); })[0];
  var garam = Utilities.getUuid();
  var data = { garam: garam, hash: hashSandi_(BARU, garam), aktif: true, wajib_ganti: true };
  if (u) data.id = u.id;
  else { data.nama = USERNAME; data.username = USERNAME.toLowerCase(); data.peran = 'Superadmin'; data.dibuat = new Date(); }
  tb.set(data);
  tb.simpan();
  var pesan = 'Password "' + USERNAME + '" sudah direset dan wajib diganti saat login.' +
    (dariVariabel ? ' Kosongkan lagi RESET_SANDI di Pemuat.gs.' : '');
  Logger.log(pesan);
  if (ui) ui.alert(pesan);
  return pesan;
}

/**
 * Akun Superadmin pertama. Bila ada password versi lama (ADMIN_HASH), akun "admin"
 * memakai password itu. Bila tidak, password acak dibuat (hanya dari setup, karena
 * password perlu dibaca di Log Eksekusi).
 */
function pastikanSuperadmin_(bolehAcak) {
  var tb = new Tabel_('Admin');
  if (tb.objek().length) { prop_('ADMIN_HASH', null); return ''; }
  var lama = prop_('ADMIN_HASH');
  var akun = { nama: 'Superadmin', username: 'admin', peran: 'Superadmin', aktif: true, dibuat: new Date() }, pesan;
  if (lama) {
    akun.hash = 'legacy:' + lama;
    pesan = 'Login admin: username "admin" dengan password admin yang lama.';
  } else if (bolehAcak) {
    var sandi = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    akun.garam = Utilities.getUuid();
    akun.hash = hashSandi_(sandi, akun.garam);
    akun.wajib_ganti = true;
    pesan = 'AKUN SUPERADMIN → username: admin · password awal: ' + sandi + ' (wajib diganti saat login pertama).';
  } else {
    return '';
  }
  tb.set(akun);
  tb.simpan();
  prop_('ADMIN_HASH', null);
  Logger.log(pesan);
  return pesan;
}

/** Sidik struktur semua sheet: berubah bila ada modul/kolom baru. */
function sidikStruktur_() {
  return md5_(JSON.stringify(semuaSheetDef_().map(function (s) { return [s.nama, s.kolom.map(function (c) { return c.k; })]; })));
}

/**
 * Dipanggil di awal setiap permintaan. Bila kode baru menambah sheet/kolom,
 * struktur Google Sheet disesuaikan otomatis (sekali), tanpa perlu menjalankan setup().
 */
function pastikanStruktur_(tunggu) {
  if (!prop_('SPREADSHEET_ID')) return; // setup() belum pernah dijalankan
  var sidik = sidikStruktur_();
  if (prop_('STRUKTUR') === sidik) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(tunggu === undefined ? 20000 : tunggu)) return;
  try {
    if (prop_('STRUKTUR') === sidik) return;
    semuaSheetDef_().forEach(pastikanSheet_);
    pastikanSuperadmin_(false);
    migrasi_();
    prop_('STRUKTUR', sidik);
    naikkanVersiCache();
  } finally {
    lock.releaseLock();
  }
}

/** Migrasi data sekali jalan antar versi. */
function migrasi_() {
  if (!prop_('MIGRASI_CONTOH_1')) { bersihkanContoh_(); prop_('MIGRASI_CONTOH_1', '1'); }
  if (!prop_('MIGRASI_PLAYLIST_1')) { tambahAksesPeran_('SumberVideo', 'PlaylistVideo'); prop_('MIGRASI_PLAYLIST_1', '1'); }
  if (!prop_('MIGRASI_KAS_1')) {
    tambahAksesPeran_('Konfirmasi', 'Kas'); tambahAksesPeran_('Konfirmasi', 'KategoriKas');
    try { sinkronDonasiKeKas_(); } catch (e) { console.error('migrasi kas: ' + pesanError_(e)); }
    prop_('MIGRASI_KAS_1', '1');
  }
}

/** Peran yang sudah boleh membuka sheet `ada` otomatis boleh membuka sheet baru `baru`. */
function tambahAksesPeran_(ada, baru) {
  var tb = new Tabel_('Peran'), ubah = false;
  tb.objek().forEach(function (p) {
    var daftar = String(p.akses || '').split(',').map(function (x) { return x.trim(); });
    if (daftar.indexOf(ada) >= 0 && daftar.indexOf(baru) < 0) {
      tb.set({ nama: p.nama, akses: daftar.concat(baru).join(', ') });
      ubah = true;
    }
  });
  if (ubah) tb.simpan();
}

/** Hapus isi contoh bawaan versi awal (teks berkurung [ ] dan tautan sosmed kosong) yang belum diubah. */
function bersihkanContoh_() {
  var kurung = /^\s*\[[^\]]*\]\s*$/;
  function semuaKurung(v) {
    var baris = String(v || '').split(/\n+/).filter(function (x) { return x.trim(); });
    return baris.length > 0 && baris.every(function (x) { return kurung.test(x); });
  }
  var tp = new Tabel_('Pengaturan');
  tp.objek().forEach(function (r) {
    if (semuaKurung(r.nilai) || (r.kunci === 'tagline' && r.nilai === 'Yayasan Pendidikan & Sosial')) tp.set({ kunci: r.kunci, nilai: '' });
  });
  tp.simpan();
  var hapusJika = {
    Tautan: function (r) { return ['https://instagram.com/', 'https://youtube.com/', 'https://wa.me/'].indexOf(String(r.url)) >= 0; },
    Pengurus: function (r) { return kurung.test(r.nama); },
    Bidang: function (r) { return semuaKurung(r.deskripsi); }
  };
  Object.keys(hapusJika).forEach(function (nama) {
    var ids = bacaTabel_(nama).filter(hapusJika[nama]).map(function (r) { return r.id; });
    if (ids.length) hapusBaris_(nama, ids);
  });
}

/** Tolak pemanggilan dari browser: fungsi ini hanya untuk pemilik di editor/menu. */
function hanyaPemilik_() {
  var aktif = '', efektif = '';
  try { aktif = Session.getActiveUser().getEmail(); efektif = Session.getEffectiveUser().getEmail(); } catch (e) { /* abaikan */ }
  if (!aktif || aktif !== efektif) throw new Error('Fungsi ini hanya bisa dijalankan pemilik dari editor Apps Script atau menu Sheet.');
}

function pasangTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'tugasPerJam') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tugasPerJam').timeBased().everyHours(1).create();
}

/** Dijalankan otomatis tiap jam. Tugas latar tiap modul ditulis di properti `tugasPerJam` modul itu. */
function tugasPerJam() {
  var segera = prop_('SEGERA');
  if (segera) { prop_('SEGERA', null); hapusTriggerSekali_(); }     // putaran lanjutan / permintaan dari panel
  else { try { batasiFrekuensi_('tugasPerJam', 600); } catch (e) { return; } }
  var mulai = Date.now();
  prop_('TUGAS_TERAKHIR', String(mulai));
  try { pastikanStruktur_(20000); } catch (e) { console.error('struktur: ' + pesanError_(e)); }
  // Putaran lanjutan dibuat lebih pendek agar panel admin tidak lama menunggu giliran
  if (segera) CONFIG.BATAS_WAKTU_MS = Math.min(CONFIG.BATAS_WAKTU_MS, 3 * 60 * 1000);
  var verAwal = prop_('CACHE_VER');
  daftarModul_().forEach(function (m) {
    if (typeof m.tugasPerJam === 'function') {
      try { m.tugasPerJam(); } catch (e) { console.error('tugasPerJam ' + m.id + ': ' + pesanError_(e)); }
    }
  });
  // Tiap jam: segarkan cache (tulisan terjadwal, perubahan langsung di Sheet); lalu siapkan cache halaman utama
  if (!segera && prop_('CACHE_VER') === verAwal) naikkanVersiCache();
  if (prop_('CACHE_VER') !== verAwal) hangatkanCache_();
  catatPemakaian_(Date.now() - mulai);
}

/* ---------- Sinkron lanjutan (berantai) ---------- */

/** Menit trigger yang terpakai hari ini (jatah akun Gmail ±90 menit/hari). */
function pemakaianHariIni_() {
  var p = String(prop_('PEMAKAIAN') || '').split('|');
  return p[0] === hariIni_() ? Number(p[1]) || 0 : 0;
}
function catatPemakaian_(ms) {
  prop_('PEMAKAIAN', hariIni_() + '|' + Math.round((pemakaianHariIni_() + ms / 60000) * 10) / 10);
}

/**
 * Jalankan tugasPerJam sekali lagi ±1 menit dari sekarang (lewat trigger, memakai izin pemilik).
 * Dipakai bila antrean belum habis atau tombol panel butuh izin yang belum dimiliki web app.
 * false bila jatah harian hampir habis.
 */
function jadwalkanSegera_(alasan) {
  if (pemakaianHariIni_() > (CONFIG.SINKRON_LANJUTAN_MENIT_HARI || 60)) return false;
  var id = prop_('SEGERA_ID');
  var ada = id && ScriptApp.getProjectTriggers().some(function (t) { return t.getUniqueId && t.getUniqueId() === id; });
  if (!ada) {
    var t = ScriptApp.newTrigger('tugasPerJam').timeBased().after(60 * 1000).create();
    prop_('SEGERA_ID', t.getUniqueId());
    prop_('SEGERA_WAKTU', String(Date.now()));
  }
  prop_('SEGERA', alasan || '1');
  return true;
}
function hapusTriggerSekali_() {
  var id = prop_('SEGERA_ID');
  prop_('SEGERA_ID', null);
  if (!id) return;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getUniqueId && t.getUniqueId() === id) ScriptApp.deleteTrigger(t); });
}
/** true bila putaran latar yang dijadwalkan >5 menit lalu ternyata tidak pernah berjalan (biasanya izin belum diberikan). */
function latarMacet_() {
  var dijadwal = Number(prop_('SEGERA_WAKTU') || 0), jalan = Number(prop_('TUGAS_TERAKHIR') || 0);
  return !!(prop_('SEGERA') && dijadwal && jalan < dijadwal && Date.now() - dijadwal > 5 * 60 * 1000);
}

/** Menu di Google Sheet. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Yayasan')
    .addItem('Tampilkan URL panel admin', 'tampilkanUrlAdmin')
    .addItem('Sinkron kontributor sekarang', 'sinkronSemua')
    .addItem('Segarkan cache website', 'naikkanVersiCache')
    .addSeparator()
    .addItem('Perbarui sistem dari GitHub', 'perbaruiSistem')
    .addItem('Kembalikan versi sebelumnya', 'kembalikanVersiSebelumnya')
    .addItem('Setup / perbarui struktur', 'setup')
    .addItem('Reset password admin', 'resetPasswordAdmin')
    .addToUi();
}

/** Edit langsung di sheet → cache website ikut segar. */
function onEdit() {
  try { naikkanVersiCache(); } catch (e) { /* abaikan */ }
}

function tampilkanUrlAdmin() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'Panel admin:\n' + url + '?admin\n\nAPI:\n' + url + '?action=info'
    : 'Web app belum di-deploy. Terapkan › Deployment baru › Aplikasi web.');
}
