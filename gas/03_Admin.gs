/**
 * ADMIN: login per akun + hak akses per peran + log aktivitas,
 * dan API CRUD generik untuk semua sheet modul.
 * ------------------------------------------------------------------
 * Panel admin (Admin.html) dibuka di URL web app + "?admin".
 * Tabel, formulir, dan tombol aksi dibangun otomatis dari definisi
 * sheet & alat di tiap modul — modul baru langsung muncul di panel.
 * Akun & peran dikelola di modul "akses" (04_AksesAdmin.gs).
 *
 * KEAMANAN: hanya fungsi tanpa akhiran "_" yang bisa dipanggil dari browser
 * (google.script.run). Di file ini: adminMasuk, adminKeluar, adminPanggil.
 */

/** Akun yang sedang memanggil (diisi adminPanggil untuk satu eksekusi). */
var ADMIN_AKTIF = null;

function halamanAdmin_() {
  // Saat dijalankan lewat Pemuat.gs, Admin.html ikut tersimpan sebagai teks (BERKAS_HTML_).
  var html = (typeof BERKAS_HTML_ !== 'undefined' && BERKAS_HTML_.Admin)
    ? HtmlService.createHtmlOutput(BERKAS_HTML_.Admin) : HtmlService.createHtmlOutputFromFile('Admin');
  return html
    .setTitle('Panel Admin – ' + namaSitus_())
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function adminMasuk(username, sandi) {
  pastikanStruktur_();
  var c = CacheService.getScriptCache();
  var uname = String(username || '').trim().toLowerCase();
  var kunciGagal = 'adm:gagal:' + md5_(uname);
  var gagal = Number(c.get(kunciGagal) || 0);
  if (gagal >= 5) throw new Error('Terlalu banyak percobaan untuk akun ini. Coba lagi 15 menit lagi.');
  var tb = new Tabel_('Admin');
  var u = tb.objek().filter(function (x) { return String(x.username).toLowerCase() === uname; })[0];
  var ok = u && u.aktif !== false && cocokSandi_(u, String(sandi || ''));
  if (!ok) {
    c.put(kunciGagal, String(gagal + 1), 900);
    catatLog_('gagal masuk', 'Admin', uname, '', { nama: '', username: uname });
    throw new Error('Username atau password salah.');
  }
  c.remove(kunciGagal);
  var ubah = { id: u.id, terakhir_masuk: new Date() };
  if (String(u.hash).indexOf('legacy:') === 0) { // migrasi dari password tunggal versi lama
    var garam = Utilities.getUuid();
    ubah.garam = garam;
    ubah.hash = hashSandi_(sandi, garam);
  }
  tb.set(ubah);
  tb.simpan();
  var token = Utilities.getUuid();
  c.put('adm:t:' + token, JSON.stringify({ id: u.id }), 21600);
  catatLog_('masuk', 'Admin', u.username, '', u);
  return { token: token, nama: namaSitus_(), wajibGanti: !!u.wajib_ganti };
}

function adminKeluar(token) {
  if (token) CacheService.getScriptCache().remove('adm:t:' + token);
  return true;
}

/** Satu pintu untuk semua pemanggilan admin dari Admin.html. */
function adminPanggil(token, metode, args) {
  var c = CacheService.getScriptCache();
  var sesi = token && c.get('adm:t:' + token);
  if (!sesi) throw new Error('SESI_HABIS');
  var akun = akunAdmin_(JSON.parse(sesi).id);
  if (!akun || !akun.aktif) { c.remove('adm:t:' + token); throw new Error('SESI_HABIS'); }
  c.put('adm:t:' + token, sesi, 21600); // perpanjang sesi
  ADMIN_AKTIF = akun;
  var f = ADMIN_API[metode];
  if (!f) throw new Error('Metode admin tidak dikenal: ' + metode);
  return f.apply(null, args || []);
}

/* ================================================================
 * Akun, sandi, hak akses, log
 * ============================================================== */

function hashSandi_(sandi, garam) {
  var h = garam + '|' + sandi;
  for (var i = 0; i < 50; i++) h = sha256_(h + '|' + garam);
  return h;
}

function cocokSandi_(u, sandi) {
  if (!u.hash) return false;
  if (String(u.hash).indexOf('legacy:') === 0) return sha256_(sandi) === String(u.hash).slice(7);
  return hashSandi_(sandi, u.garam) === u.hash;
}

function validSandi_(s) {
  if (String(s || '').length < 8) throw new Error('Password minimal 8 karakter.');
}

/** Profil akun + hak akses dari peran. */
function akunAdmin_(id) {
  var u = bacaTabel_('Admin').filter(function (x) { return x.id === id; })[0];
  if (!u) return null;
  var p = bacaTabel_('Peran').filter(function (x) { return x.nama === u.peran; })[0] || {};
  var akses = String(p.akses || '').trim();
  var semua = akses === '*';
  return {
    id: u.id, nama: u.nama, username: u.username, peran: u.peran, aktif: u.aktif !== false,
    wajibGanti: !!u.wajib_ganti, super: semua,
    akses: semua ? [] : akses.split(/[,\n]/).map(function (x) { return x.trim(); }).filter(Boolean),
    bolehHapus: semua || p.boleh_hapus === true,
    bolehEkspor: semua || p.boleh_ekspor === true
  };
}

function bolehSheet_(akun, nama) {
  if (!akun) return false;
  var def = sheetDef_(nama);
  var m = MODUL[def.modul] || {};
  if (m.zona === 'sistem') return akun.super;
  return akun.super || akun.akses.indexOf(nama) >= 0;
}

function wajibAkses_(nama) {
  if (!bolehSheet_(ADMIN_AKTIF, nama)) throw new Error('Akun Anda tidak punya akses ke "' + nama + '".');
}

function catatLog_(aksi, sheet, kunci, ringkasan, akun) {
  try {
    var a = akun || ADMIN_AKTIF || {};
    tambahBaris_('LogAktivitas', {
      waktu: new Date(), username: a.username || '', nama: a.nama || '', aksi: aksi, sheet: sheet || '',
      kunci: String([].concat(kunci || []).join(', ')).slice(0, 300), ringkasan: String(ringkasan || '').slice(0, 300)
    });
  } catch (e) { /* log tidak boleh menggagalkan aksi */ }
}

/** Kolom yang tidak pernah dikirim ke panel (hash password, dst). */
function kolomRahasia_(def) {
  return def.kolom.filter(function (c) { return c.rahasia; }).map(function (c) { return c.k; });
}
function buangRahasia_(def, rows) {
  var r = kolomRahasia_(def);
  if (!r.length) return rows;
  return rows.map(function (o) { var x = {}; Object.keys(o).forEach(function (k) { if (r.indexOf(k) < 0) x[k] = o[k]; }); return x; });
}

/* ================================================================
 * API PANEL
 * ============================================================== */

var ADMIN_API = {

  /** Struktur modul yang boleh diakses akun ini. */
  skema: function () {
    var akun = ADMIN_AKTIF;
    var opsiRef = {};
    function ambilOpsi(ref) {
      var key = ref.sheet + '|' + ref.nilai + '|' + ref.label;
      if (!opsiRef[key]) {
        try {
          opsiRef[key] = bacaTabel_(ref.sheet).map(function (r) {
            return { v: String(r[ref.nilai]), l: String(r[ref.label] || r[ref.nilai]) };
          });
        } catch (x) { opsiRef[key] = []; }
      }
      return opsiRef[key];
    }
    function salinKolom(c) {
      var o = {};
      Object.keys(c).forEach(function (k) { if (typeof c[k] !== 'function') o[k] = c[k]; });
      if (c.ref) o.opsiRef = ambilOpsi(c.ref);
      return o;
    }
    var semuaNama = semuaSheetDef_().map(function (s) { return s.nama; });
    return {
      situs: {
        nama: namaSitus_(),
        url: CONFIG.SITE_URL,
        api: ScriptApp.getService().getUrl(),
        sheet: akun.super && buku_().getUrl ? buku_().getUrl() : '',
        offset: fmt_(new Date(), 'XXX')
      },
      saya: { nama: akun.nama, username: akun.username, peran: akun.peran, super: akun.super, wajibGanti: akun.wajibGanti },
      sistem: akun.super ? infoSistem_() : null,
      modul: daftarModul_().map(function (m) {
        var sheets = (m.sheets || []).filter(function (s) { return bolehSheet_(akun, s.nama); });
        return {
          id: m.id,
          judul: m.judul || m.id,
          zona: m.zona || 'konten',
          sheets: sheets.map(function (s) {
            var ket = s.keterangan || '';
            if (s.nama === 'Peran') ket += ' Nama sheet yang bisa dipakai: ' + semuaNama.join(', ') + '.';
            return {
              nama: s.nama,
              judul: s.judul || s.nama,
              keterangan: ket,
              kunci: s.kunci || 'id',
              bisaTambah: s.bisaTambah !== false,
              bisaHapus: s.bisaHapus !== false && akun.bolehHapus,
              bisaEkspor: akun.bolehEkspor,
              filterCepat: s.filterCepat || [],
              kolom: s.kolom.filter(function (c) { return !c.rahasia; }).map(salinKolom),
              alat: (m.alat || []).filter(function (a) { return a.sheet === s.nama; }).map(function (a) {
                return { id: a.id, label: a.label, perluPilih: !!a.perluPilih, konfirmasi: a.konfirmasi || '',
                  gaya: a.gaya || '', input: (a.input || []).map(salinKolom) };
              })
            };
          })
        };
      }).filter(function (m) { return m.sheets.length; })
    };
  },

  daftar: function (nama, opsi) {
    wajibAkses_(nama);
    opsi = opsi || {};
    var def = sheetDef_(nama);
    var rows = buangRahasia_(def, bacaTabel_(nama));
    var f = opsi.filter || {};
    Object.keys(f).forEach(function (k) {
      if (f[k] !== '' && f[k] != null) rows = rows.filter(function (r) { return String(r[k]) === String(f[k]); });
    });
    var q = String(opsi.q || '').toLowerCase().trim();
    if (q) rows = rows.filter(function (r) {
      return Object.keys(r).some(function (k) { return String(r[k]).toLowerCase().indexOf(q) >= 0; });
    });
    var urut = def.urut || (def.kolom.some(function (c) { return c.k === 'urutan'; }) ? { k: 'urutan', arah: 'asc' } : null);
    if (urut) {
      rows.sort(function (a, b) {
        var x = a[urut.k], y = b[urut.k];
        if (x === y) return 0;
        if (x === '' || x === null) return 1;
        if (y === '' || y === null) return -1;
        var r = x > y ? 1 : -1;
        return urut.arah === 'desc' ? -r : r;
      });
    } else {
      rows.reverse(); // data terbaru (baris bawah) tampil di atas
    }
    var per = Math.min(Number(opsi.per) || 50, 1000000);
    var hal = Math.max(1, Number(opsi.halaman) || 1);
    return { baris: rows.slice((hal - 1) * per, hal * per), total: rows.length, halaman: hal, per: per };
  },

  simpan: function (nama, data, kunciLama) {
    wajibAkses_(nama);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var def = sheetDef_(nama);
      var kunci = def.kunci || 'id';
      var tb = new Tabel_(nama);
      if (kunciLama && data[kunci] && String(kunciLama) !== String(data[kunci])) {
        tb.gantiKunci(kunciLama, data[kunci]);
      }
      var lama = data[kunci] ? tb.ambil(data[kunci]) : null;
      if (!lama && def.bisaTambah === false) throw new Error('Data di sheet ini tidak bisa ditambah lewat formulir.');
      var obj = {};
      def.kolom.forEach(function (c) {
        if (c.t === 'id' || c.rahasia) return;
        if (c.ro && lama) return;
        if (Object.prototype.hasOwnProperty.call(data, c.k)) obj[c.k] = data[c.k];
        else if (!lama && c.bawaan !== undefined) obj[c.k] = c.bawaan;
      });
      if (def.kolom.some(function (c) { return c.k === 'slug'; })) {
        var dasar = obj.slug || (lama && lama.slug) || obj.judul || obj.nama || (lama && (lama.judul || lama.nama));
        if (dasar) obj.slug = slugUnik_(obj.slug || (lama && lama.slug) || dasar, tb, lama ? lama[kunci] : null);
      }
      if (lama) obj[kunci] = lama[kunci];
      else if (data[kunci] && kunci !== 'slug') obj[kunci] = data[kunci];
      def.kolom.forEach(function (c) {
        if (!c.wajib) return;
        var v = obj.hasOwnProperty(c.k) ? obj[c.k] : (lama ? lama[c.k] : '');
        if (v === '' || v === null || v === undefined) throw new Error('Kolom "' + (c.l || c.k) + '" wajib diisi.');
      });
      var m = MODUL[def.modul];
      if (m && m.sebelumSimpan) m.sebelumSimpan(nama, obj, lama);
      var key = tb.set(obj);
      tb.simpan();
      naikkanVersiCache();
      catatLog_(lama ? 'ubah' : 'tambah', nama, key, obj.judul || obj.nama || obj.tema || obj.label || '');
      return buangRahasia_(def, [tb.ambil(key)])[0];
    } finally {
      lock.releaseLock();
    }
  },

  hapus: function (nama, kunciList) {
    wajibAkses_(nama);
    var def = sheetDef_(nama);
    if (def.bisaHapus === false || !ADMIN_AKTIF.bolehHapus) throw new Error('Akun Anda tidak boleh menghapus data di sheet ini.');
    if (!kunciList || !kunciList.length) return { terhapus: 0 };
    var m = MODUL[def.modul];
    if (m && m.sebelumHapus) m.sebelumHapus(nama, kunciList);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var n = hapusBaris_(nama, kunciList);
      naikkanVersiCache();
      catatLog_('hapus', nama, kunciList, n + ' baris');
      return { terhapus: n };
    } finally {
      lock.releaseLock();
    }
  },

  /** Ekspor ke Excel (.xlsx) → base64 untuk diunduh browser. */
  ekspor: function (nama, q, filter) {
    wajibAkses_(nama);
    if (!ADMIN_AKTIF.bolehEkspor) throw new Error('Akun Anda tidak boleh mengunduh data.');
    var def = sheetDef_(nama);
    var rows = ADMIN_API.daftar(nama, { q: q, filter: filter, per: 1000000 }).baris;
    var kolom = def.kolom.filter(function (c) { return !c.rahasia; });
    var data = [kolom.map(function (c) { return c.l || c.k; })].concat(rows.map(function (r) {
      return kolom.map(function (c) {
        var v = r[c.k];
        if ((c.t === 'date' || c.t === 'datetime') && v) { var d = keSel_(v, c.t); return d instanceof Date ? d : v; }
        if (c.t === 'bool') return v ? 'Ya' : 'Tidak';
        return v === null || v === undefined ? '' : v;
      });
    }));
    var tmp = SpreadsheetApp.create('ekspor-' + nama + '-' + Date.now());
    try {
      var sh = tmp.getSheets()[0];
      sh.setName(nama);
      kolom.forEach(function (c, j) {
        if (['number', 'date', 'datetime'].indexOf(c.t) < 0) sh.getRange(1, j + 1, data.length, 1).setNumberFormat('@');
        if (c.t === 'datetime') sh.getRange(2, j + 1, Math.max(1, data.length - 1), 1).setNumberFormat('yyyy-mm-dd hh:mm');
        if (c.t === 'date') sh.getRange(2, j + 1, Math.max(1, data.length - 1), 1).setNumberFormat('yyyy-mm-dd');
      });
      sh.getRange(1, 1, data.length, kolom.length).setValues(data);
      sh.getRange(1, 1, 1, kolom.length).setFontWeight('bold').setBackground('#18548C').setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
      sh.autoResizeColumns(1, kolom.length);
      SpreadsheetApp.flush();
      var res = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + tmp.getId() + '/export?format=xlsx', {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
      });
      catatLog_('unduh excel', nama, '', rows.length + ' baris' + (q ? ', cari "' + q + '"' : ''));
      return {
        nama: nama + '-' + fmt_(new Date(), 'yyyyMMdd-HHmm') + '.xlsx',
        base64: Utilities.base64Encode(res.getBlob().getBytes())
      };
    } finally {
      DriveApp.getFileById(tmp.getId()).setTrashed(true);
    }
  },

  /** Jalankan tombol aksi khusus milik modul. */
  alat: function (modulId, alatId, kunciList, input) {
    var m = MODUL[modulId];
    var a = m && (m.alat || []).filter(function (x) { return x.id === alatId; })[0];
    if (!a) throw new Error('Aksi tidak ditemukan.');
    wajibAkses_(a.sheet);
    if (a.perluPilih && (!kunciList || !kunciList.length)) throw new Error('Pilih minimal satu baris dulu.');
    var hasil = a.run(kunciList || [], input || {}) || {};
    naikkanVersiCache();
    catatLog_(String(a.label).replace(/^\+\s*/, ''), a.sheet, kunciList, hasil.pesan || '');
    return hasil;
  },

  /** Superadmin: tarik kode terbaru dari GitHub (lihat 98_Pembaru.gs & pasang/Pemuat.gs). */
  perbaruiSistem: function () {
    if (!ADMIN_AKTIF.super) throw new Error('Hanya Superadmin yang bisa memperbarui sistem.');
    var h = pembaruanSistem_();
    catatLog_('perbarui sistem', '', '', h.pesan);
    return h;
  },

  /** Setiap admin boleh mengganti password-nya sendiri. */
  gantiSandiSaya: function (lama, baru) {
    validSandi_(baru);
    var tb = new Tabel_('Admin');
    var u = tb.ambil(ADMIN_AKTIF.id);
    if (!u || !cocokSandi_(u, String(lama || ''))) throw new Error('Password lama salah.');
    if (lama === baru) throw new Error('Password baru harus berbeda.');
    var garam = Utilities.getUuid();
    tb.set({ id: u.id, garam: garam, hash: hashSandi_(baru, garam), wajib_ganti: false });
    tb.simpan();
    catatLog_('ganti password', 'Admin', u.username, '');
    return { pesan: 'Password berhasil diganti.' };
  }
};

/** Ubah satu kolom untuk banyak baris sekaligus (dipakai alat modul). */
function ubahKolom_(nama, kunciList, kolom, nilai) {
  var tb = new Tabel_(nama);
  var n = 0;
  kunciList.forEach(function (k) {
    if (!tb.ambil(k)) return;
    var o = {};
    o[tb.kunci] = k;
    o[kolom] = nilai;
    tb.set(o);
    n++;
  });
  tb.simpan();
  return n;
}
