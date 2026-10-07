/**
 * INTI: registri modul, router API, cache, dan helper umum.
 * ------------------------------------------------------------------
 * Setiap modul cukup menulis:
 *
 *   var MODUL = MODUL || {};
 *   MODUL.namaModul = { judul, urutan, sheets, publik, publikPost, alat, bootstrap, beranda };
 *
 * Pola `var MODUL = MODUL || {}` membuat urutan file tidak berpengaruh.
 */
var MODUL = MODUL || {};

/** Daftar modul aktif, terurut. */
function daftarModul_() {
  return Object.keys(MODUL)
    .filter(function (id) { return CONFIG.MODUL_NONAKTIF.indexOf(id) < 0; })
    .map(function (id) { var m = MODUL[id]; m.id = id; return m; })
    .sort(function (a, b) { return (a.urutan || 99) - (b.urutan || 99); });
}

function semuaSheetDef_() {
  var out = [];
  daftarModul_().forEach(function (m) {
    (m.sheets || []).forEach(function (s) { s.modul = m.id; out.push(s); });
  });
  return out;
}

function sheetDef_(nama) {
  var d = semuaSheetDef_().filter(function (s) { return s.nama === nama; })[0];
  if (!d) throw new Error('Sheet tidak terdaftar: ' + nama);
  return d;
}

function cariAksi_(nama, metode) {
  var mods = daftarModul_();
  for (var i = 0; i < mods.length; i++) {
    var tabel = metode === 'post' ? mods[i].publikPost : mods[i].publik;
    if (tabel && tabel[nama]) return tabel[nama];
  }
  return null;
}

/* ================================================================
 * ROUTER
 * ============================================================== */

function doGet(e) {
  var p = (e && e.parameter) || {};
  try { pastikanStruktur_(); } catch (x) { console.error('struktur: ' + pesanError_(x)); }
  if (p.admin !== undefined) return halamanAdmin_();
  var aksi = p.action || 'info';
  try {
    if (aksi === 'feed') return responsFeed_(p);
    var a = cariAksi_(aksi, 'get');
    if (!a) throw new Error('Aksi tidak dikenal: ' + aksi);
    var run = typeof a === 'function' ? a : a.run;
    var detik = (typeof a === 'object' && a.cache !== undefined) ? a.cache : CONFIG.CACHE_DETIK;
    var data = detik
      ? dariCache_('get:' + aksi + ':' + kunciParam_(p), detik, function () { return run(p); })
      : run(p);
    if (data && typeof data.__csv === 'string') {
      return ContentService.createTextOutput(data.__csv).setMimeType(ContentService.MimeType.CSV);
    }
    return keluaranJson_({ ok: true, data: data }, p.callback);
  } catch (err) {
    return keluaranJson_({ ok: false, error: pesanError_(err) }, p.callback);
  }
}

function doPost(e) {
  try { pastikanStruktur_(); } catch (x) { console.error('struktur: ' + pesanError_(x)); }
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { body = {}; }
  var aksi = body.action || ((e && e.parameter) || {}).action;
  try {
    var a = cariAksi_(aksi, 'post');
    if (!a) throw new Error('Aksi tidak dikenal: ' + aksi);
    var run = typeof a === 'function' ? a : a.run;
    return keluaranJson_({ ok: true, data: run(body) });
  } catch (err) {
    return keluaranJson_({ ok: false, error: pesanError_(err) });
  }
}

function keluaranJson_(obj, callback) {
  var s = JSON.stringify(obj);
  if (callback && /^[\w.$]{1,60}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + s + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function kunciParam_(p) {
  return Object.keys(p).filter(function (k) { return k !== 'callback' && k !== '_'; })
    .sort().map(function (k) { return k + '=' + p[k]; }).join('&');
}

function pesanError_(err) { return String((err && err.message) || err); }

/* ================================================================
 * CACHE (berversi + dipotong otomatis bila > 100 KB)
 * ============================================================== */

function versiCache_() {
  var c = CacheService.getScriptCache();
  var v = c.get('__ver');
  if (!v) { v = prop_('CACHE_VER') || '1'; c.put('__ver', v, 21600); }
  return v;
}

/** Panggil setelah data berubah agar semua cache publik segar. */
function naikkanVersiCache() {
  var v = String(Number(prop_('CACHE_VER') || '1') + 1);
  prop_('CACHE_VER', v);
  CacheService.getScriptCache().put('__ver', v, 21600);
  return v;
}

function dariCache_(kunci, detik, fn) {
  var k = 'v' + versiCache_() + ':' + kunci;
  var hit = cacheBaca_(k);
  if (hit !== null) { try { return JSON.parse(hit); } catch (x) { /* abaikan */ } }
  var data = fn();
  cacheTulis_(k, JSON.stringify(data), detik);
  return data;
}

var POTONGAN_CACHE = 30000; // karakter (aman untuk UTF-8 < 100 KB)

function cacheTulis_(kunci, s, detik) {
  var c = CacheService.getScriptCache();
  var hk = kunciPendek_(kunci);
  try {
    if (s.length <= POTONGAN_CACHE) { c.put(hk, s, detik); return; }
    var n = Math.ceil(s.length / POTONGAN_CACHE);
    if (n > 30) return; // terlalu besar, jangan di-cache
    var obj = {};
    for (var i = 0; i < n; i++) obj[hk + ':' + i] = s.substr(i * POTONGAN_CACHE, POTONGAN_CACHE);
    obj[hk] = '__potong:' + n;
    c.putAll(obj, detik);
  } catch (x) { /* cache penuh: abaikan */ }
}

function cacheBaca_(kunci) {
  var c = CacheService.getScriptCache();
  var hk = kunciPendek_(kunci);
  var v = c.get(hk);
  if (v === null) return null;
  if (v.indexOf('__potong:') !== 0) return v;
  var n = Number(v.split(':')[1]);
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(hk + ':' + i);
  var all = c.getAll(keys);
  var out = '';
  for (var j = 0; j < n; j++) {
    if (all[keys[j]] == null) return null;
    out += all[keys[j]];
  }
  return out;
}

function kunciPendek_(k) { return k.length < 200 ? k : 'h:' + md5_(k); }

/* ================================================================
 * HELPER UMUM
 * ============================================================== */

function hex_(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function md5_(s) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(s), Utilities.Charset.UTF_8));
}
function md5Bytes_(bytes) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, bytes));
}
function sha256_(s) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8));
}

function id_() {
  return Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slug_(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || id_();
}

/** Slug unik di dalam Tabel (kolom slug). */
function slugUnik_(teks, tabel, kecualiKunci) {
  var dasar = slug_(teks), s = dasar, n = 2;
  var dipakai = {};
  tabel.objek().forEach(function (o) {
    if (o[tabel.kunci] !== kecualiKunci && o.slug) dipakai[o.slug] = 1;
  });
  while (dipakai[s]) s = dasar + '-' + (n++);
  return s;
}

function fmt_(d, pola) { return Utilities.formatDate(d, CONFIG.ZONA_WAKTU, pola); }
function iso_(d) { return fmt_(d, "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function hariIni_() { return fmt_(new Date(), 'yyyy-MM-dd'); }

function potong_(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

/** Ambil ID dari URL Google Drive / Docs, atau kembalikan apa adanya bila sudah berupa ID. */
function idDrive_(url) {
  if (!url) return '';
  var m = String(url).match(/\/(?:d|folders)\/([a-zA-Z0-9_-]{10,})/) ||
          String(url).match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(url) ? url : '';
}

/* ---------- Gambar dari link berbagi ---------- */

/** Pengaturan yang berisi gambar (diubah jadi URL gambar langsung saat dibaca publik). */
var KUNCI_GAMBAR_ = ['logo', 'foto_hero', 'qris'];

/** ID file Drive dari link berbagi gambar (file/d/…, open?id=…, uc?id=…, thumbnail?id=…). */
function idDriveGambar_(u) {
  var s = String(u || '').trim();
  if (!/^https?:\/\/(drive|docs)\.google\.com\//i.test(s)) return '';
  var m = s.match(/\/file\/d\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : '';
}

/**
 * Link berbagi → URL yang bisa dipakai di <img>.
 * Drive "…/file/d/ID/view" → thumbnail Drive; GitHub "…/blob/…" → raw; Dropbox dl=0 → raw=1;
 * imgur.com/ID → i.imgur.com/ID.png. URL lain dikembalikan apa adanya.
 */
function urlGambar_(u) {
  var s = String(u || '').trim();
  if (!s || /drive\.google\.com\/thumbnail\?/.test(s)) return s;
  var id = idDriveGambar_(s);
  if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1200';
  var m = s.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  if (m) return 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/' + m[3];
  m = s.match(/^https?:\/\/(?:www\.)?imgur\.com\/([A-Za-z0-9]{5,8})$/);
  if (m) return 'https://i.imgur.com/' + m[1] + '.png';
  if (/^https?:\/\/(www\.)?dropbox\.com\//.test(s)) return s.replace(/([?&])dl=0\b/, '$1raw=1');
  return s;
}

/**
 * Gambar dari Drive hanya tampil di website bila file dibagikan "Siapa saja yang memiliki link".
 * Fungsi ini mengaturnya otomatis (sekali per file). paksa=true: dari formulir admin —
 * galat dilaporkan agar admin tahu kenapa gambar tidak akan tampil.
 */
function publikkanGambar_(u, paksa) {
  var id = idDriveGambar_(u);
  if (!id) return;
  var tanda = 'PUB_' + id;
  if (!paksa && prop_(tanda)) return;
  try {
    var f = DriveApp.getFileById(id);
    var a = f.getSharingAccess();
    if (a !== DriveApp.Access.ANYONE_WITH_LINK && a !== DriveApp.Access.ANYONE) {
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    prop_(tanda, '1');
  } catch (e) {
    prop_(tanda, 'x');
    if (paksa) {
      throw new Error('Gambar dari Google Drive belum bisa ditampilkan: akun sistem tidak bisa membagikan file itu. ' +
        'Buka file di Drive › Bagikan › Akses umum: "Siapa saja yang memiliki link", lalu simpan lagi.');
    }
  }
}

/** Normalisasi nomor WA Indonesia → 62xxxxxxxxxx. Kosong bila tidak valid. */
function normalWa_(s) {
  var d = String(s || '').replace(/[^\d]/g, '');
  if (d.indexOf('0') === 0) d = '62' + d.slice(1);
  else if (d.indexOf('8') === 0) d = '62' + d;
  return /^628\d{7,12}$/.test(d) ? d : '';
}

function validEmail_(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '')); }
function validUrl_(s) { return /^https?:\/\/[^\s]+$/i.test(String(s || '')); }

/** Batasi frekuensi aksi publik per kunci. Melempar error bila terlalu sering. */
function batasiFrekuensi_(kunci, detik, pesan) {
  var c = CacheService.getScriptCache();
  var k = 'rl:' + md5_(kunci);
  if (c.get(k)) throw new Error(pesan || 'Terlalu sering. Coba lagi sebentar lagi.');
  c.put(k, '1', detik);
}

/** Pengaturan situs sebagai objek {kunci: nilai}. Kunci berawalan "_" bersifat privat. */
function pengaturan_(semua) {
  var o = {};
  bacaTabel_('Pengaturan').forEach(function (r) {
    if (!r.kunci) return;
    if (!semua && String(r.kunci).charAt(0) === '_') return;
    o[r.kunci] = r.nilai;
  });
  if (!semua) {
    KUNCI_GAMBAR_.forEach(function (k) {
      if (!o[k]) return;
      try { publikkanGambar_(o[k]); } catch (e) { /* abaikan */ }
      o[k] = urlGambar_(o[k]);
    });
  }
  return o;
}

function namaSitus_() {
  try { return pengaturan_().nama_yayasan || 'Yayasan'; } catch (x) { return 'Yayasan'; }
}
