/**
 * ADMIN: login berpassword + API CRUD generik untuk semua sheet modul.
 * ------------------------------------------------------------------
 * Panel admin (Admin.html) dibuka di URL web app + "?admin".
 * Semua tabel, formulir, dan tombol aksi dibangun otomatis dari definisi
 * sheet & alat di tiap modul — modul baru langsung muncul di panel.
 */

function halamanAdmin_() {
  return HtmlService.createHtmlOutputFromFile('Admin')
    .setTitle('Panel Admin – ' + namaSitus_())
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function adminMasuk(sandi) {
  var c = CacheService.getScriptCache();
  var gagal = Number(c.get('adm:gagal') || 0);
  if (gagal >= 5) throw new Error('Terlalu banyak percobaan. Coba lagi 15 menit lagi.');
  var hash = prop('ADMIN_HASH');
  if (!hash) throw new Error('Password admin belum diatur. Jalankan setup() di editor.');
  if (sha256_(String(sandi || '')) !== hash) {
    c.put('adm:gagal', String(gagal + 1), 900);
    throw new Error('Password salah.');
  }
  c.remove('adm:gagal');
  var token = Utilities.getUuid();
  c.put('adm:t:' + token, '1', 21600);
  return { token: token, nama: namaSitus_() };
}

function adminKeluar(token) {
  if (token) CacheService.getScriptCache().remove('adm:t:' + token);
  return true;
}

/** Satu pintu untuk semua pemanggilan admin dari Admin.html. */
function adminPanggil(token, metode, args) {
  var c = CacheService.getScriptCache();
  if (!token || !c.get('adm:t:' + token)) throw new Error('SESI_HABIS');
  c.put('adm:t:' + token, '1', 21600); // perpanjang sesi
  var f = ADMIN_API[metode];
  if (!f) throw new Error('Metode admin tidak dikenal: ' + metode);
  return f.apply(null, args || []);
}

var ADMIN_API = {

  /** Struktur seluruh modul untuk membangun panel. */
  skema: function () {
    var opsiRef = {};
    function ambilOpsi(ref) {
      var key = ref.sheet + '|' + ref.nilai + '|' + ref.label;
      if (!opsiRef[key]) {
        try {
          opsiRef[key] = bacaTabel(ref.sheet).map(function (r) {
            return { v: String(r[ref.nilai]), l: String(r[ref.label] || r[ref.nilai]) };
          });
        } catch (x) { opsiRef[key] = []; }
      }
      return opsiRef[key];
    }
    return {
      situs: {
        nama: namaSitus_(),
        url: CONFIG.SITE_URL,
        api: ScriptApp.getService().getUrl(),
        sheet: buku_().getUrl ? buku_().getUrl() : '',
        offset: fmt_(new Date(), 'XXX')
      },
      modul: daftarModul().filter(function (m) { return (m.sheets || []).length; }).map(function (m) {
        return {
          id: m.id,
          judul: m.judul || m.id,
          sheets: m.sheets.map(function (s) {
            return {
              nama: s.nama,
              judul: s.judul || s.nama,
              keterangan: s.keterangan || '',
              kunci: s.kunci || 'id',
              bisaTambah: s.bisaTambah !== false,
              bisaHapus: s.bisaHapus !== false,
              kolom: s.kolom.map(function (c) {
                var o = {};
                Object.keys(c).forEach(function (k) { if (typeof c[k] !== 'function') o[k] = c[k]; });
                if (c.ref) o.opsiRef = ambilOpsi(c.ref);
                return o;
              }),
              alat: (m.alat || []).filter(function (a) { return a.sheet === s.nama; }).map(function (a) {
                return { id: a.id, label: a.label, perluPilih: !!a.perluPilih, konfirmasi: a.konfirmasi || '',
                  gaya: a.gaya || '',
                  input: (a.input || []).map(function (c) {
                    var o = {};
                    Object.keys(c).forEach(function (k) { o[k] = c[k]; });
                    if (c.ref) o.opsiRef = ambilOpsi(c.ref);
                    return o;
                  }) };
              })
            };
          })
        };
      })
    };
  },

  daftar: function (nama, opsi) {
    opsi = opsi || {};
    var def = sheetDef(nama);
    var rows = bacaTabel(nama);
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
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var def = sheetDef(nama);
      var kunci = def.kunci || 'id';
      var tb = new Tabel(nama);
      if (kunciLama && data[kunci] && String(kunciLama) !== String(data[kunci])) {
        tb.gantiKunci(kunciLama, data[kunci]);
      }
      var lama = data[kunci] ? tb.ambil(data[kunci]) : null;
      if (!lama && def.bisaTambah === false) throw new Error('Data di sheet ini tidak bisa ditambah manual.');
      var obj = {};
      def.kolom.forEach(function (c) {
        if (c.t === 'id') return;
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
      return tb.ambil(key);
    } finally {
      lock.releaseLock();
    }
  },

  hapus: function (nama, kunciList) {
    var def = sheetDef(nama);
    if (def.bisaHapus === false) throw new Error('Data di sheet ini tidak bisa dihapus.');
    if (!kunciList || !kunciList.length) return { terhapus: 0 };
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var n = hapusBaris_(nama, kunciList);
      naikkanVersiCache();
      return { terhapus: n };
    } finally {
      lock.releaseLock();
    }
  },

  /** Ekspor ke Excel (.xlsx) → base64 untuk diunduh browser. */
  ekspor: function (nama, q) {
    var def = sheetDef(nama);
    var rows = ADMIN_API.daftar(nama, { q: q, per: 500000 }).baris;
    var kolom = def.kolom;
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
    if (a.perluPilih && (!kunciList || !kunciList.length)) throw new Error('Pilih minimal satu baris dulu.');
    var hasil = a.run(kunciList || [], input || {}) || {};
    naikkanVersiCache();
    return hasil;
  }
};

/** Ubah satu kolom untuk banyak baris sekaligus (dipakai alat modul). */
function ubahKolom_(nama, kunciList, kolom, nilai) {
  var tb = new Tabel(nama);
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
