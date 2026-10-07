/**
 * DATA: akses Google Sheet & Drive.
 * ------------------------------------------------------------------
 * Definisi kolom (dipakai juga oleh panel admin):
 *   { k:'judul', l:'Judul', t:'text', wajib:true, opsi:[...], bawaan:'...',
 *     ref:{sheet:'Kategori', nilai:'slug', label:'nama'},
 *     ro:true (hanya-baca di admin), privat:true (tidak pernah keluar ke publik),
 *     daftar:false (tidak tampil di tabel admin), bantuan:'teks bantuan' }
 * Tipe: id, text, textarea, number, date, datetime, bool, select, ref, url, image, wa, email
 */

function buku_() {
  var id = prop_('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var aktif = SpreadsheetApp.getActive();
  if (!aktif) throw new Error('Spreadsheet belum terhubung. Jalankan setup() dari editor Apps Script.');
  return aktif;
}

function sheet_(nama) {
  var sh = buku_().getSheetByName(nama);
  if (!sh) throw new Error('Sheet "' + nama + '" belum ada. Jalankan setup().');
  return sh;
}

function tipeKolom_(def) {
  var t = {};
  def.kolom.forEach(function (c) { t[c.k] = c.t; });
  return t;
}

/** Nilai sel → nilai JSON yang rapi. */
function normalNilai_(v, t) {
  if (typeof v === 'string' && v.charAt(0) === "'") v = v.slice(1); // nilai di memori sebelum ditulis
  if (t === 'bool') return v === true || /^(true|ya|1)$/i.test(String(v));
  if (t === 'number') return (v === '' || v === null || isNaN(Number(v))) ? null : Number(v);
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return t === 'date' ? fmt_(v, 'yyyy-MM-dd') : iso_(v);
  }
  return v === null || v === undefined ? '' : String(v);
}

/** Nilai JSON → nilai sel. */
function keSel_(v, t) {
  if (v === undefined || v === null) return '';
  if (t === 'bool') return v === true || /^(true|on|ya|1)$/i.test(String(v));
  if (t === 'number') return (v === '' || isNaN(Number(v))) ? '' : Number(v);
  if ((t === 'date' || t === 'datetime') && v !== '') {
    if (v instanceof Date) return v;
    var s = String(v);
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var d = new Date(s);
    return isNaN(d.getTime()) ? s : d;
  }
  if (v instanceof Date) return v;
  var str = typeof v === 'string' ? v : String(v);
  // Cegah formula injection & angka yang kehilangan nol di depan (no. WA, rekening)
  if (/^[=+\-@]/.test(str) || /^0\d/.test(str) || (t === 'wa' && str)) return "'" + str;
  return str;
}

/** Baca seluruh sheet sebagai array objek. */
function bacaTabel_(nama) {
  var def = sheetDef_(nama);
  var tipe = tipeKolom_(def);
  var v = sheet_(nama).getDataRange().getValues();
  var header = v.shift() || [];
  var out = [];
  v.forEach(function (r) {
    if (r.join('') === '') return;
    var o = {};
    header.forEach(function (h, j) { if (h) o[h] = normalNilai_(r[j], tipe[h]); });
    out.push(o);
  });
  return out;
}

/** Hapus kolom privat sebelum dikirim ke publik. */
function publikSaja_(nama, rows) {
  var privat = sheetDef_(nama).kolom.filter(function (c) { return c.privat; }).map(function (c) { return c.k; });
  if (!privat.length) return rows;
  return rows.map(function (r) {
    var o = {};
    Object.keys(r).forEach(function (k) { if (privat.indexOf(k) < 0) o[k] = r[k]; });
    return o;
  });
}

/** Tambah satu baris di akhir sheet (cepat, tanpa memuat seluruh sheet). */
function tambahBaris_(nama, obj) {
  var def = sheetDef_(nama);
  var tipe = tipeKolom_(def);
  var sh = sheet_(nama);
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (header.indexOf('id') >= 0 && !obj.id) obj.id = id_();
  var row = header.map(function (h) { return h && obj.hasOwnProperty(h) ? keSel_(obj[h], tipe[h]) : ''; });
  sh.appendRow(row);
  return obj;
}

/* ================================================================
 * Tabel: muat sekali, ubah di memori, tulis sekali.
 * ============================================================== */

function Tabel_(nama) {
  this.nama = nama;
  this.def = sheetDef_(nama);
  this.kunci = this.def.kunci || 'id';
  this.tipe = tipeKolom_(this.def);
  this.sh = sheet_(nama);
  var v = this.sh.getDataRange().getValues();
  this.header = v.shift() || [];
  this.panjangAwal = v.length;
  this.data = v;
  this.ubah = {};
  this.ik = this.header.indexOf(this.kunci);
  if (this.ik < 0) throw new Error('Kolom kunci "' + this.kunci + '" tidak ada di sheet ' + nama);
  this.indeks = {};
  for (var i = 0; i < v.length; i++) {
    var key = String(v[i][this.ik]);
    if (key) this.indeks[key] = i;
  }
}

Tabel_.prototype._obj = function (r) {
  var o = {}, self = this;
  this.header.forEach(function (h, j) { if (h) o[h] = normalNilai_(r[j], self.tipe[h]); });
  return o;
};

Tabel_.prototype.objek = function () {
  var self = this;
  return this.data.filter(function (r) { return String(r[self.ik]) !== ''; })
    .map(function (r) { return self._obj(r); });
};

Tabel_.prototype.ambil = function (key) {
  var i = this.indeks[String(key)];
  return i === undefined ? null : this._obj(this.data[i]);
};

/** Tambah atau perbarui berdasarkan kolom kunci. Mengembalikan kunci. */
Tabel_.prototype.set = function (obj) {
  var self = this;
  var key = obj[this.kunci];
  if (key === undefined || key === null || key === '') { key = id_(); obj[this.kunci] = key; }
  var i = this.indeks[String(key)];
  var row = i === undefined ? this.header.map(function () { return ''; }) : this.data[i].slice();
  this.header.forEach(function (h, j) {
    if (h && Object.prototype.hasOwnProperty.call(obj, h)) row[j] = keSel_(obj[h], self.tipe[h]);
  });
  if (i === undefined) {
    this.data.push(row);
    i = this.data.length - 1;
    this.indeks[String(key)] = i;
  } else {
    this.data[i] = row;
  }
  this.ubah[i] = true;
  return key;
};

Tabel_.prototype.simpan = function () {
  var self = this, w = this.header.length;
  var diubah = Object.keys(this.ubah).map(Number).filter(function (i) { return i < self.panjangAwal; });
  if (diubah.length > 25) {
    if (this.panjangAwal) this.sh.getRange(2, 1, this.panjangAwal, w).setValues(this.data.slice(0, this.panjangAwal));
  } else {
    diubah.forEach(function (i) { self.sh.getRange(i + 2, 1, 1, w).setValues([self.data[i]]); });
  }
  if (this.data.length > this.panjangAwal) {
    var baru = this.data.slice(this.panjangAwal);
    this.sh.getRange(this.panjangAwal + 2, 1, baru.length, w).setValues(baru);
  }
  this.panjangAwal = this.data.length;
  this.ubah = {};
};

/** Ganti nilai kunci sebuah baris (mis. slug kategori diubah). */
Tabel_.prototype.gantiKunci = function (lama, baru) {
  var i = this.indeks[String(lama)];
  if (i === undefined) return;
  if (this.indeks[String(baru)] !== undefined) throw new Error('"' + baru + '" sudah dipakai.');
  this.data[i][this.ik] = baru;
  delete this.indeks[String(lama)];
  this.indeks[String(baru)] = i;
  this.ubah[i] = true;
};

/** Hapus baris berdasarkan daftar kunci. Mengembalikan jumlah terhapus. */
function hapusBaris_(nama, kunciList) {
  var def = sheetDef_(nama);
  var sh = sheet_(nama);
  var v = sh.getDataRange().getValues();
  var ik = v[0].indexOf(def.kunci || 'id');
  var target = {};
  kunciList.forEach(function (k) { target[String(k)] = 1; });
  var baris = [];
  for (var i = 1; i < v.length; i++) if (target[String(v[i][ik])]) baris.push(i + 1);
  baris.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  return baris.length;
}

/** Buat / lengkapi sheet sesuai definisi (kolom baru ditambah di kanan, data lama aman). */
function pastikanSheet_(def) {
  var b = buku_();
  var sh = b.getSheetByName(def.nama);
  var baru = !sh;
  if (!sh) sh = b.insertSheet(def.nama);
  var lastCol = sh.getLastColumn();
  var header = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  def.kolom.forEach(function (c) { if (header.indexOf(c.k) < 0) header.push(c.k); });
  sh.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setBackground('#18548C').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  if (!baru && def.lengkapiIsiAwal && def.isiAwal && def.kunci) {
    var ik = header.indexOf(def.kunci);
    var adaKunci = sh.getLastRow() > 1 ? sh.getRange(2, ik + 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var tipe0 = tipeKolom_(def);
    var kurang = def.isiAwal.filter(function (o) { return adaKunci.indexOf(String(o[def.kunci])) < 0; }).map(function (o) {
      return header.map(function (h) { return o.hasOwnProperty(h) ? keSel_(o[h], tipe0[h]) : ''; });
    });
    if (kurang.length) sh.getRange(sh.getLastRow() + 1, 1, kurang.length, header.length).setValues(kurang);
  }
  if (baru && def.isiAwal && def.isiAwal.length) {
    var tipe = tipeKolom_(def);
    var rows = def.isiAwal.map(function (o) {
      if (header.indexOf('id') >= 0 && !o.id) o.id = id_();
      return header.map(function (h) { return o.hasOwnProperty(h) ? keSel_(o[h], tipe[h]) : ''; });
    });
    sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  return sh;
}

/* ================================================================
 * DRIVE
 * ============================================================== */

var NAMA_FOLDER = {
  FOLDER_INDUK: 'Website Yayasan – Data',
  FOLDER_DOCS: 'Artikel (Google Docs)',
  FOLDER_GAMBAR: 'Gambar Artikel (publik)',
  FOLDER_CACHE: 'Cache Konten',
  FOLDER_BUKTI: 'Bukti Transfer (privat)'
};

/** Ambil folder kerja; dibuat otomatis bila belum ada. */
function folder_(kunci) {
  var id = prop_(kunci);
  if (id) { try { return DriveApp.getFolderById(id); } catch (x) { /* dibuat ulang */ } }
  var induk;
  if (kunci === 'FOLDER_INDUK') {
    induk = DriveApp.createFolder(NAMA_FOLDER.FOLDER_INDUK);
    prop_(kunci, induk.getId());
    return induk;
  }
  var f = folder_('FOLDER_INDUK').createFolder(NAMA_FOLDER[kunci] || kunci);
  if (kunci === 'FOLDER_GAMBAR') {
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) { /* domain membatasi */ }
  }
  prop_(kunci, f.getId());
  return f;
}

function cariFileCache_(nama) {
  var it = folder_('FOLDER_CACHE').getFilesByName(nama);
  return it.hasNext() ? it.next() : null;
}

/** Simpan teks ke folder cache. `tanda` disimpan di deskripsi file untuk cek kebaruan. */
function simpanFileCache_(nama, isi, tanda) {
  var f = cariFileCache_(nama);
  if (f) f.setContent(isi);
  else f = folder_('FOLDER_CACHE').createFile(nama, isi, MimeType.PLAIN_TEXT);
  f.setDescription(String(tanda || ''));
  return f.getId();
}

function bacaFileCache_(fileId) {
  if (!fileId) return '';
  var k = 'fc:' + fileId;
  var hit = cacheBaca_(k);
  if (hit !== null) return hit;
  try {
    var s = DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8');
    cacheTulis_(k, s, 21600);
    return s;
  } catch (x) { return ''; }
}

/** Simpan gambar ke folder publik; nama berbasis hash sehingga tidak duplikat. */
function simpanGambar_(blob, awalan) {
  var bytes = blob.getBytes();
  var tipe = blob.getContentType() || 'image/png';
  var ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' })[tipe] || '.png';
  var nama = String(awalan || 'img').slice(0, 16) + '-' + md5Bytes_(bytes).slice(0, 16) + ext;
  var folder = folder_('FOLDER_GAMBAR');
  var it = folder.getFilesByName(nama);
  var f;
  if (it.hasNext()) f = it.next();
  else {
    f = folder.createFile(blob.setName(nama));
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) { /* abaikan */ }
  }
  return 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1600';
}
