/**
 * SETUP & PEMELIHARAAN
 * ------------------------------------------------------------------
 * 1. Jalankan setup() sekali dari editor (izinkan akses yang diminta).
 *    Password admin awal muncul di Log Eksekusi.
 * 2. Jalankan lagi kapan saja setelah menambah modul / kolom baru —
 *    sheet & kolom baru dibuat tanpa menyentuh data lama.
 */

function setup() {
  var ss = SpreadsheetApp.getActive();
  if (!ss && !prop('SPREADSHEET_ID')) {
    throw new Error('Buka Apps Script dari Google Sheet (Ekstensi › Apps Script), lalu jalankan setup() lagi.');
  }
  if (ss) prop('SPREADSHEET_ID', ss.getId());

  semuaSheetDef().forEach(pastikanSheet_);
  var awal = buku_().getSheetByName('Sheet1') || buku_().getSheetByName('Lembar1');
  if (awal && awal.getLastRow() === 0 && buku_().getSheets().length > 1) buku_().deleteSheet(awal);

  ['FOLDER_INDUK', 'FOLDER_DOCS', 'FOLDER_GAMBAR', 'FOLDER_CACHE', 'FOLDER_BUKTI'].forEach(folder_);

  if (!prop('ADMIN_HASH')) {
    var sandi = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    prop('ADMIN_HASH', sha256_(sandi));
    Logger.log('PASSWORD ADMIN AWAL: ' + sandi + '  (ganti dengan gantiPasswordAdmin)');
  }

  pasangTrigger_();
  naikkanVersiCache();
  Logger.log('Setup selesai. Langkah berikutnya: Terapkan › Deployment baru › Aplikasi web ' +
    '(Jalankan sebagai: Saya, Akses: Siapa saja). Panel admin = URL web app + "?admin".');
}

/** Ganti password admin: isi BARU lalu jalankan fungsi ini sekali. */
function gantiPasswordAdmin() {
  var BARU = 'ganti-dengan-password-baru';
  if (BARU.length < 8 || BARU === 'ganti-dengan-password-baru') throw new Error('Isi variabel BARU (minimal 8 karakter) terlebih dulu.');
  prop('ADMIN_HASH', sha256_(BARU));
  Logger.log('Password admin diganti.');
}

function pasangTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'tugasPerJam') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tugasPerJam').timeBased().everyHours(1).create();
}

/** Dijalankan otomatis tiap jam. Tambahkan tugas latar modul baru di sini. */
function tugasPerJam() {
  daftarModul().forEach(function (m) {
    if (typeof m.tugasPerJam === 'function') {
      try { m.tugasPerJam(); } catch (e) { console.error('tugasPerJam ' + m.id + ': ' + pesanError_(e)); }
    }
  });
}

/** Menu di Google Sheet. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Yayasan')
    .addItem('Setup / perbarui struktur', 'setup')
    .addItem('Sinkron kontributor sekarang', 'sinkronSemua')
    .addItem('Segarkan cache website', 'naikkanVersiCache')
    .addItem('Tampilkan URL panel admin', 'tampilkanUrlAdmin')
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
