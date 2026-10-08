/**
 * MODUL KEUANGAN: buku kas tunggal + jalur sinkron dengan sistem/laporan lain.
 * ------------------------------------------------------------------
 * Prinsip (agar laporan website & laporan lain selalu cocok):
 *   1. SATU buku kas (sheet Kas). Semua uang masuk/keluar tercatat di sini,
 *      dari mana pun asalnya: input bendahara, donasi website, modul lain, atau
 *      sistem luar lewat API. Laporan apa pun dihitung dari buku ini.
 *   2. Setiap entri punya `sumber` + `ref_sumber` (ID di sistem asalnya).
 *      Pasangan itu unik → kirim ulang data yang sama tidak membuat entri ganda.
 *   3. Entri tidak pernah dihapus; dibatalkan dengan status "Batal" agar
 *      pembatalan ikut tersinkron ke sistem lain.
 *   4. Setiap perubahan mencatat `diubah` & menaikkan `versi`; sistem lain cukup
 *      menarik "yang berubah sejak kursor terakhir".
 *   5. Periode yang sudah dilaporkan bisa dikunci (tutup buku) sehingga angka
 *      lama tidak berubah diam-diam.
 *
 * Modul lain yang menghasilkan/membelanjakan uang cukup memanggil:
 *   postingKas_('nama-modul', idDiModulItu, { tanggal, jenis, jumlah, akun, program, keterangan, pihak })
 *   batalKas_('nama-modul', idDiModulItu)
 * Endpoint: ?action=kas_ekspor / kas_akun (GET, berkunci), kas_impor (POST, berkunci),
 *           ?action=laporan_kas (publik, bila Pengaturan "laporan_keuangan" = ya).
 */
var MODUL = MODUL || {};

var JENIS_KAS = ['Masuk', 'Keluar'];
var STATUS_KAS = ['Final', 'Draf', 'Batal'];

MODUL.keuangan = {
  judul: 'Keuangan',
  urutan: 45,

  sheets: [
    {
      nama: 'Kas',
      judul: 'Buku kas',
      keterangan: 'Satu buku untuk semua uang masuk & keluar. Entri tidak dihapus — ubah status ke "Batal". ' +
        'Entri dari donasi website / sistem lain diubah di sumbernya.',
      bisaHapus: false,
      urut: { k: 'tanggal', arah: 'desc' },
      filterCepat: [
        { label: 'Masuk', k: 'jenis', v: 'Masuk' },
        { label: 'Keluar', k: 'jenis', v: 'Keluar' },
        { label: 'Draf', k: 'status', v: 'Draf' },
        { label: 'Batal', k: 'status', v: 'Batal' }
      ],
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'tanggal', l: 'Tanggal', t: 'date', wajib: true },
        { k: 'jenis', l: 'Jenis', t: 'select', opsi: JENIS_KAS, wajib: true, bawaan: 'Keluar' },
        { k: 'jumlah', l: 'Jumlah (Rp)', t: 'number', wajib: true },
        { k: 'akun', l: 'Kategori / akun', t: 'ref', ref: { sheet: 'KategoriKas', nilai: 'kode', label: 'nama' }, wajib: true },
        { k: 'program', l: 'Program / dana terikat', t: 'ref', ref: { sheet: 'Program', nilai: 'id', label: 'nama' } },
        { k: 'rekening', l: 'Rekening / kas', t: 'ref', ref: { sheet: 'Rekening', nilai: 'id', label: 'bank' } },
        { k: 'keterangan', l: 'Keterangan', t: 'text' },
        { k: 'pihak', l: 'Donatur / penerima', t: 'text', privat: true, daftar: false },
        { k: 'bukti', l: 'Bukti (URL)', t: 'url', privat: true, daftar: false },
        { k: 'status', l: 'Status', t: 'select', opsi: STATUS_KAS, bawaan: 'Final' },
        { k: 'sumber', l: 'Sumber', t: 'text', ro: true },
        { k: 'ref_sumber', l: 'ID di sumber', t: 'text', ro: true, daftar: false },
        { k: 'dicatat_oleh', l: 'Dicatat oleh', t: 'text', ro: true, daftar: false },
        { k: 'diubah', l: 'Diubah', t: 'datetime', ro: true, daftar: false },
        { k: 'versi', l: 'Versi', t: 'number', ro: true, daftar: false }
      ]
    },
    {
      nama: 'KategoriKas',
      judul: 'Kategori kas / akun',
      keterangan: 'Kode dipakai bersama oleh semua sistem yang sinkron — jangan diubah setelah dipakai. "Publik" = tampil terpisah di laporan publik.',
      kunci: 'kode',
      urut: { k: 'urutan', arah: 'asc' },
      kolom: [
        { k: 'kode', l: 'Kode', t: 'text', wajib: true, bantuan: 'Singkat & tetap, mis. DON, OPS, PRG' },
        { k: 'nama', l: 'Nama', t: 'text', wajib: true },
        { k: 'jenis', l: 'Untuk', t: 'select', opsi: ['Masuk', 'Keluar', 'Keduanya'], bawaan: 'Keduanya' },
        { k: 'kelompok', l: 'Kelompok', t: 'text', bantuan: 'mis. Donasi, Program, Operasional' },
        { k: 'publik', l: 'Publik', t: 'bool', bawaan: true },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 }
      ],
      isiAwal: [
        { kode: 'DON', nama: 'Donasi umum', jenis: 'Masuk', kelompok: 'Donasi', publik: true, urutan: 1 },
        { kode: 'DON-PRG', nama: 'Donasi program', jenis: 'Masuk', kelompok: 'Donasi', publik: true, urutan: 2 },
        { kode: 'PND', nama: 'Pendapatan lain', jenis: 'Masuk', kelompok: 'Pendapatan', publik: true, urutan: 3 },
        { kode: 'PRG', nama: 'Penyaluran program', jenis: 'Keluar', kelompok: 'Program', publik: true, urutan: 10 },
        { kode: 'OPS', nama: 'Operasional', jenis: 'Keluar', kelompok: 'Operasional', publik: true, urutan: 11 },
        { kode: 'LAIN', nama: 'Lain-lain', jenis: 'Keduanya', kelompok: 'Lainnya', publik: true, urutan: 20 }
      ]
    }
  ],

  publik: {
    /** Ringkasan arus kas (tanpa nama). ?action=laporan_kas&tahun=2026 | bulan=2026-10 | dari=…&sampai=… */
    laporan_kas: function (p) {
      if (!/^(ya|true|1|aktif)$/i.test(String(pengaturan_().laporan_keuangan || ''))) {
        throw new Error('Laporan keuangan belum dipublikasikan.');
      }
      return laporanKas_(periodeKas_(p), { publik: true });
    },

    /** Tarik buku kas untuk sistem lain (berkunci). Tidak di-cache. */
    kas_ekspor: {
      cache: 0,
      run: function (p) {
        var k = kunciApi_(p.kunci, 'kas:baca');
        var rinci = k.izin.indexOf('kas:rinci') >= 0;
        if (p.format === 'csv') return { __csv: csvKas_(eksporKas_(p, rinci, 5000).items) };
        return eksporKas_(p, rinci, Math.min(Math.max(Number(p.batas) || 500, 1), 2000));
      }
    },

    /** Daftar kode akun, program & rekening untuk pemetaan di sistem lain (berkunci). */
    kas_akun: {
      cache: 0,
      run: function (p) {
        kunciApi_(p.kunci, 'kas:baca');
        return {
          akun: bacaTabel_('KategoriKas').map(function (a) { return { kode: a.kode, nama: a.nama, jenis: a.jenis, kelompok: a.kelompok }; }),
          program: bacaTabel_('Program').map(function (x) { return { id: x.id, nama: x.nama, aktif: x.aktif !== false }; }),
          rekening: bacaTabel_('Rekening').map(function (r) { return { id: r.id, bank: r.bank, atas_nama: r.atas_nama }; }),
          kunci_periode: kunciPeriodeKas_() || null
        };
      }
    }
  },

  publikPost: {
    /** Kirim entri dari sistem lain (berkunci, idempoten per ref_sumber). */
    kas_impor: function (b) {
      var k = kunciApi_(b.kunci, 'kas:tulis');
      var items = Array.isArray(b.items) ? b.items : [];
      if (!items.length) throw new Error('items kosong.');
      if (items.length > 500) throw new Error('Maksimal 500 entri per kiriman.');
      var lepas = kunciTulis_();
      try {
        var tb = new Tabel_('Kas');
        var hasil = items.map(function (it) {
          var ref = String((it && (it.ref_sumber || it.ref)) || '').trim();
          try {
            if (!ref) throw new Error('ref_sumber wajib diisi.');
            var r = upsertKas_(tb, k.sumber, ref, it, 'api:' + k.nama);
            return { ref_sumber: ref, id: r.id, hasil: r.hasil, versi: r.versi };
          } catch (e) {
            return { ref_sumber: ref, hasil: 'galat', pesan: pesanError_(e) };
          }
        });
        tb.simpan();
        var hit = { baru: 0, ubah: 0, sama: 0, galat: 0 };
        hasil.forEach(function (h) { hit[h.hasil] = (hit[h.hasil] || 0) + 1; });
        if (hit.baru || hit.ubah) naikkanVersiCache();
        catatLog_('impor kas', 'Kas', '', k.nama + ': ' + JSON.stringify(hit), { username: 'api:' + k.sumber, nama: k.nama });
        return { ringkas: hit, hasil: hasil };
      } finally {
        lepas();
      }
    }
  },

  tugasPerJam: function () { try { sinkronDonasiKeKas_(); } catch (e) { console.error('donasi→kas: ' + pesanError_(e)); } },

  sebelumSimpan: function (nama, obj, lama) {
    if (nama !== 'Kas') return;
    if (lama && lama.sumber && lama.sumber !== 'manual') {
      throw new Error('Entri ini berasal dari "' + lama.sumber + '". Ubah di sumbernya agar laporan tetap cocok.');
    }
    var data = normalKas_(Object.assign({}, lama || {}, obj));
    cekKunciPeriode_(data.tanggal, lama && lama.tanggal);
    Object.keys(data).forEach(function (k) { obj[k] = data[k]; });
    obj.sumber = 'manual';
    if (!lama) obj.ref_sumber = '';
    obj.dicatat_oleh = (ADMIN_AKTIF && ADMIN_AKTIF.username) || '';
    obj.diubah = new Date();
    obj.versi = (lama && Number(lama.versi) || 0) + 1;
  },

  alat: [
    {
      id: 'ringkasan_kas', sheet: 'Kas', label: 'Ringkasan per bulan',
      input: [{ k: 'tahun', l: 'Tahun', t: 'number', wajib: true, bawaan: new Date().getFullYear() }],
      run: function (ids, inp) {
        var l = laporanKas_(periodeKas_({ tahun: inp.tahun }), { publik: false });
        var saldo = l.saldo_awal;
        return {
          pesan: 'Tahun ' + inp.tahun + ' · saldo awal ' + rupiah_(l.saldo_awal) + ' · masuk ' + rupiah_(l.masuk) +
            ' · keluar ' + rupiah_(l.keluar) + ' · saldo akhir ' + rupiah_(l.saldo_akhir) +
            (l.kunci_periode ? ' · dikunci s.d. ' + l.kunci_periode : ''),
          tabel: l.per_bulan.map(function (b) {
            saldo += b.masuk - b.keluar;
            return { bulan: b.bulan, masuk: rupiah_(b.masuk), keluar: rupiah_(b.keluar), saldo: rupiah_(saldo) };
          })
        };
      }
    },
    {
      id: 'kunci_periode', sheet: 'Kas', label: 'Kunci periode (tutup buku)',
      input: [{ k: 'sampai', l: 'Kunci semua entri sampai tanggal', t: 'date', wajib: true,
        bantuan: 'Entri bertanggal ini atau sebelumnya tidak bisa ditambah/diubah dari mana pun. Membuka kunci (tanggal mundur) hanya oleh Superadmin.' }],
      run: function (ids, inp) {
        var baru = String(inp.sampai || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(baru)) throw new Error('Tanggal tidak valid.');
        var lama = kunciPeriodeKas_();
        if (lama && baru < lama && !(ADMIN_AKTIF && ADMIN_AKTIF.super)) throw new Error('Membuka kunci periode hanya oleh Superadmin.');
        var tp = new Tabel_('Pengaturan');
        tp.set({ kunci: '_kas_kunci_sampai', nilai: baru, keterangan: 'Tutup buku: entri kas sampai tanggal ini terkunci' });
        tp.simpan();
        return { pesan: 'Buku kas dikunci sampai ' + baru + (lama ? ' (sebelumnya ' + lama + ').' : '.') };
      }
    },
    {
      id: 'sinkron_donasi_kas', sheet: 'Kas', label: 'Sinkron donasi website',
      run: function () { var h = sinkronDonasiKeKas_(); return { pesan: h.pesan }; }
    }
  ]
};

/* ================================================================
 * Inti buku kas
 * ============================================================== */

/** Validasi & normalisasi satu entri. Melempar galat yang jelas. */
function normalKas_(it) {
  var tgl = it.tanggal instanceof Date ? fmt_(it.tanggal, 'yyyy-MM-dd') : String(it.tanggal || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl) || isNaN(new Date(tgl).getTime())) throw new Error('Tanggal tidak valid (format YYYY-MM-DD).');
  var jenis = String(it.jenis || '');
  jenis = /^masuk$/i.test(jenis) ? 'Masuk' : /^keluar$/i.test(jenis) ? 'Keluar' : '';
  if (!jenis) throw new Error('Jenis harus Masuk atau Keluar.');
  var jumlah = Math.round(angkaRupiah_(it.jumlah));
  if (!isFinite(jumlah) || jumlah <= 0) throw new Error('Jumlah harus lebih dari 0.');
  var akun = String(it.akun || '').trim();
  var a = akunKas_()[akun];
  if (!a) throw new Error('Kode akun "' + akun + '" tidak ada di Kategori kas.');
  if (a.jenis && a.jenis !== 'Keduanya' && a.jenis !== jenis) throw new Error('Akun ' + akun + ' hanya untuk kas ' + a.jenis + '.');
  var status = STATUS_KAS.indexOf(String(it.status || 'Final')) >= 0 ? String(it.status || 'Final') : 'Final';
  return {
    tanggal: tgl, jenis: jenis, jumlah: jumlah, akun: akun,
    program: String(it.program || '').trim(), rekening: String(it.rekening || '').trim(),
    keterangan: String(it.keterangan || '').slice(0, 500), pihak: String(it.pihak || '').slice(0, 160),
    bukti: String(it.bukti || '').slice(0, 500), status: status
  };
}

var KOLOM_BANDING_KAS_ = ['tanggal', 'jenis', 'jumlah', 'akun', 'program', 'rekening', 'keterangan', 'pihak', 'bukti', 'status'];

/**
 * Tambah/perbarui entri milik `sumber` dengan ID `ref` (idempoten).
 * hasil: 'baru' | 'ubah' | 'sama'.
 */
function upsertKas_(tb, sumber, ref, it, oleh) {
  var idx = indeksKas_(tb), kunci = sumber + '|' + ref;
  var lama = idx[kunci] ? tb.ambil(idx[kunci]) : null;
  var data = normalKas_(it);
  if (lama && KOLOM_BANDING_KAS_.every(function (k) { return String(lama[k] == null ? '' : lama[k]) === String(data[k]); })) {
    return { id: lama.id, hasil: 'sama', versi: Number(lama.versi) || 1 };
  }
  cekKunciPeriode_(data.tanggal, lama && lama.tanggal);
  data.sumber = sumber;
  data.ref_sumber = String(ref);
  data.dicatat_oleh = oleh || sumber;
  data.diubah = new Date();
  data.versi = (lama && Number(lama.versi) || 0) + 1;
  if (lama) data.id = lama.id;
  var id = tb.set(data);
  idx[kunci] = id;
  return { id: id, hasil: lama ? 'ubah' : 'baru', versi: data.versi };
}

/** Indeks sumber|ref_sumber → id, dibuat sekali per tabel (impor ratusan entri tetap cepat). */
function indeksKas_(tb) {
  if (!tb._idxKas) {
    tb._idxKas = {};
    tb.objek().forEach(function (r) { if (r.sumber && r.ref_sumber !== '') tb._idxKas[r.sumber + '|' + r.ref_sumber] = r.id; });
  }
  return tb._idxKas;
}

/** Untuk modul lain: catat / perbarui uang masuk-keluar miliknya. */
function postingKas_(sumber, ref, data, oleh) {
  var tb = new Tabel_('Kas');
  var r = upsertKas_(tb, sumber, ref, data, oleh);
  if (r.hasil !== 'sama') { tb.simpan(); naikkanVersiCache(); }
  return r;
}

/** Untuk modul lain: batalkan entri miliknya (tidak dihapus). */
function batalKas_(sumber, ref, oleh) {
  var tb = new Tabel_('Kas'), id = indeksKas_(tb)[sumber + '|' + ref];
  var lama = id ? tb.ambil(id) : null;
  if (!lama || lama.status === 'Batal') return null;
  var r = upsertKas_(tb, sumber, ref, Object.assign({}, lama, { status: 'Batal' }), oleh);
  tb.simpan();
  naikkanVersiCache();
  return r;
}

function akunKas_() {
  var m = {};
  bacaTabel_('KategoriKas').forEach(function (a) { m[a.kode] = a; });
  return m;
}

function kunciPeriodeKas_() {
  return String(pengaturan_(true)._kas_kunci_sampai || '').slice(0, 10);
}

function cekKunciPeriode_(tglBaru, tglLama) {
  var ks = kunciPeriodeKas_();
  if (!ks) return;
  var t = [tglBaru, tglLama].filter(Boolean).map(function (x) { return String(x).slice(0, 10); });
  if (t.some(function (x) { return x <= ks; })) throw new Error('Periode sampai ' + ks + ' sudah dikunci (tutup buku).');
}

/** 250000 | "250000" | "250.000" | "Rp 250.000,50" | "250,000.50" → angka. */
function angkaRupiah_(v) {
  if (typeof v === 'number') return v;
  var s = String(v == null ? '' : v).replace(/rp\.?|\s/gi, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  var n = Number(s);
  return isFinite(n) ? n : NaN;
}

function rupiah_(n) { return 'Rp ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

/* ================================================================
 * Donasi website → buku kas (otomatis, idempoten)
 * ============================================================== */

/**
 * Konfirmasi berstatus Diterima = entri kas Masuk (sumber "donasi-web").
 * Status berubah dari Diterima → entri dibatalkan. Aman dijalankan berulang.
 */
function sinkronDonasiKeKas_() {
  if (!MODUL.keuangan || CONFIG.MODUL_NONAKTIF.indexOf('keuangan') >= 0 || !MODUL.donasi) return { pesan: 'Modul keuangan/donasi tidak aktif.' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { pesan: 'Sinkron lain sedang berjalan.' };
  var hit = { baru: 0, ubah: 0, batal: 0, terkunci: 0 };
  try {
    var tb = new Tabel_('Kas'), ada = {};
    tb.objek().forEach(function (r) { if (r.sumber === 'donasi-web') ada[r.ref_sumber] = r; });
    indeksKas_(tb);
    var program = {};
    bacaTabel_('Program').forEach(function (p) { program[p.id] = p.nama; });
    bacaTabel_('Konfirmasi').forEach(function (c) {
      var e = ada[c.id];
      try {
        if (c.status === 'Diterima' && Number(c.nominal) > 0) {
          var tgl = c.tanggal_transfer || (c.waktu ? String(c.waktu).slice(0, 10) : fmt_(new Date(), 'yyyy-MM-dd'));
          var r = upsertKas_(tb, 'donasi-web', c.id, {
            tanggal: tgl, jenis: 'Masuk', jumlah: c.nominal,
            akun: c.program ? CONFIG.KAS_AKUN_DONASI_PROGRAM : CONFIG.KAS_AKUN_DONASI,
            program: c.program || '', status: 'Final', pihak: c.nama || '', bukti: c.bukti || '',
            keterangan: 'Donasi via website' + (c.program && program[c.program] ? ' · ' + program[c.program] : '') + (c.rekening ? ' · ke ' + c.rekening : '')
          }, 'sistem');
          if (r.hasil !== 'sama') hit[r.hasil]++;
        } else if (e && e.status !== 'Batal') {
          upsertKas_(tb, 'donasi-web', c.id, Object.assign({}, e, { status: 'Batal' }), 'sistem');
          hit.batal++;
        }
      } catch (err) {
        if (/dikunci/.test(pesanError_(err))) hit.terkunci++; else throw err;
      }
    });
    if (hit.baru || hit.ubah || hit.batal) { tb.simpan(); naikkanVersiCache(); }
  } finally {
    lock.releaseLock();
  }
  return { hit: hit, pesan: 'Donasi → kas: ' + hit.baru + ' baru, ' + hit.ubah + ' diperbarui, ' + hit.batal + ' dibatalkan' +
    (hit.terkunci ? ', ' + hit.terkunci + ' dilewati karena periode terkunci' : '') + '.' };
}

/* ================================================================
 * Laporan & ekspor
 * ============================================================== */

/** {dari, sampai} (YYYY-MM-DD) dari parameter tahun / bulan / dari-sampai. Bawaan: tahun berjalan. */
function periodeKas_(p) {
  p = p || {};
  if (p.dari || p.sampai) {
    var d = String(p.dari || '0000-01-01').slice(0, 10), s = String(p.sampai || '9999-12-31').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Format tanggal YYYY-MM-DD.');
    return { dari: d, sampai: s };
  }
  if (p.bulan) {
    var m = String(p.bulan).match(/^(\d{4})-(\d{2})$/);
    if (!m) throw new Error('Format bulan YYYY-MM.');
    var akhir = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
    return { dari: m[1] + '-' + m[2] + '-01', sampai: m[1] + '-' + m[2] + '-' + ('0' + akhir).slice(-2) };
  }
  var th = Number(p.tahun) || Number(fmt_(new Date(), 'yyyy'));
  return { dari: th + '-01-01', sampai: th + '-12-31' };
}

/** Ringkasan arus kas suatu periode. Hanya status Final. publik=true: tanpa nama, akun non-publik digabung. */
function laporanKas_(per, opsi) {
  opsi = opsi || {};
  var akun = akunKas_(), program = {};
  bacaTabel_('Program').forEach(function (p) { program[p.id] = p.nama; });
  var out = { dari: per.dari, sampai: per.sampai, saldo_awal: 0, masuk: 0, keluar: 0, saldo_akhir: 0,
    per_akun: [], per_program: [], per_bulan: [], kunci_periode: kunciPeriodeKas_() || null, jumlah_entri: 0 };
  var pa = {}, pp = {}, pb = {};
  bacaTabel_('Kas').forEach(function (r) {
    if (r.status !== 'Final') return;
    var tgl = String(r.tanggal).slice(0, 10), n = Number(r.jumlah) || 0, tanda = r.jenis === 'Masuk' ? 1 : -1;
    if (tgl < per.dari) { out.saldo_awal += tanda * n; return; }
    if (tgl > per.sampai) return;
    out.jumlah_entri++;
    if (tanda > 0) out.masuk += n; else out.keluar += n;
    var a = akun[r.akun] || {};
    var kode = (opsi.publik && a.publik === false) || !a.kode ? 'LAIN-' + r.jenis : r.akun;
    var ka = kode + '|' + r.jenis;
    if (!pa[ka]) pa[ka] = { kode: kode, nama: a.kode && kode === r.akun ? a.nama : 'Lainnya', jenis: r.jenis, kelompok: a.kode && kode === r.akun ? (a.kelompok || '') : '', jumlah: 0 };
    pa[ka].jumlah += n;
    if (r.program) {
      if (!pp[r.program]) pp[r.program] = { id: r.program, nama: program[r.program] || r.program, masuk: 0, keluar: 0 };
      pp[r.program][tanda > 0 ? 'masuk' : 'keluar'] += n;
    }
    var b = tgl.slice(0, 7);
    if (!pb[b]) pb[b] = { bulan: b, masuk: 0, keluar: 0 };
    pb[b][tanda > 0 ? 'masuk' : 'keluar'] += n;
  });
  out.saldo_akhir = out.saldo_awal + out.masuk - out.keluar;
  out.per_akun = Object.keys(pa).map(function (k) { return pa[k]; }).sort(function (x, y) { return (x.jenis < y.jenis ? 1 : x.jenis > y.jenis ? -1 : 0) || y.jumlah - x.jumlah; });
  out.per_program = Object.keys(pp).map(function (k) { var x = pp[k]; x.saldo = x.masuk - x.keluar; return x; });
  out.per_bulan = Object.keys(pb).sort().map(function (k) { return pb[k]; });
  return out;
}

/** Entri yang berubah setelah kursor, urut (diubah, id). Kursor = "<ms>|<id>" dari respons sebelumnya. */
function eksporKas_(p, rinci, batas) {
  var dari = 0, dariId = '';
  if (p.kursor) {
    var c = String(p.kursor).split('|');
    dari = Number(c[0]) || 0; dariId = c[1] || '';
  } else if (p.sejak) {
    dari = new Date(p.sejak).getTime();
    if (isNaN(dari)) throw new Error('Parameter "sejak" bukan tanggal yang valid.');
    dariId = '￿';
  }
  var akun = akunKas_(), program = {};
  bacaTabel_('Program').forEach(function (x) { program[x.id] = x.nama; });
  var semua = bacaTabel_('Kas').map(function (r) { r._ms = r.diubah ? new Date(r.diubah).getTime() : 0; return r; })
    .filter(function (r) { return r._ms > dari || (r._ms === dari && String(r.id) > dariId); })
    .filter(function (r) { return (!p.dari || String(r.tanggal) >= p.dari) && (!p.sampai || String(r.tanggal) <= p.sampai); })
    .sort(function (a, b) { return (a._ms - b._ms) || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0); });
  var page = semua.slice(0, batas);
  var akhir = page[page.length - 1];
  return {
    items: page.map(function (r) {
      var o = { id: r.id, tanggal: String(r.tanggal).slice(0, 10), jenis: r.jenis, jumlah: Number(r.jumlah) || 0,
        akun: r.akun, akun_nama: (akun[r.akun] || {}).nama || '', program: r.program || '', program_nama: program[r.program] || '',
        rekening: r.rekening || '', keterangan: r.keterangan || '', status: r.status, sumber: r.sumber || 'manual',
        ref_sumber: r.ref_sumber || '', diubah: r.diubah, versi: Number(r.versi) || 1 };
      if (rinci) { o.pihak = r.pihak || ''; o.bukti = r.bukti || ''; }
      return o;
    }),
    kursor: akhir ? akhir._ms + '|' + akhir.id : (p.kursor || (dari ? dari + '|' + dariId : '')),
    lagi: semua.length > page.length,
    waktu_server: iso_(new Date()),
    kunci_periode: kunciPeriodeKas_() || null
  };
}

/** CSV untuk =IMPORTDATA() di Google Sheet lain. Teks berawalan = + - @ dinetralkan. */
function csvKas_(items) {
  var kol = ['id', 'tanggal', 'jenis', 'jumlah', 'akun', 'akun_nama', 'program', 'program_nama', 'rekening', 'keterangan', 'status', 'sumber', 'ref_sumber', 'diubah', 'versi'];
  if (items[0] && items[0].hasOwnProperty('pihak')) kol.push('pihak', 'bukti');
  var sel = function (v, k) {
    var s = v == null ? '' : String(v);
    if (k !== 'jumlah' && k !== 'versi' && /^[=+\-@]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [kol.join(',')].concat(items.map(function (it) { return kol.map(function (k) { return sel(it[k], k); }).join(','); })).join('\n');
}
