/**
 * MODUL INTEGRASI: kunci API untuk sistem/modul lain (zona Superadmin).
 * ------------------------------------------------------------------
 * Setiap sistem lain (aplikasi pembukuan, laporan di Google Sheet lain,
 * modul tambahan) mendapat kunci sendiri dengan izin terbatas:
 *   kas:baca  — tarik buku kas (tanpa nama donatur & bukti)
 *   kas:rinci — termasuk nama pihak & tautan bukti
 *   kas:tulis — kirim/ubah entri kas miliknya sendiri (idempoten per ref_sumber)
 * Kunci hanya ditampilkan sekali saat dibuat; yang disimpan hanya hash-nya.
 */
var MODUL = MODUL || {};

MODUL.integrasi = {
  judul: 'Integrasi & API',
  urutan: 92,
  zona: 'sistem',

  sheets: [
    {
      nama: 'KunciApi',
      judul: 'Kunci API sinkron',
      keterangan: 'Buat kunci lewat tombol "+ Buat kunci". Kunci hanya tampil sekali — simpan di sistem tujuan. Cabut kapan saja dengan mematikan Aktif.',
      bisaTambah: false,
      urut: { k: 'dibuat', arah: 'desc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'nama', l: 'Nama sistem', t: 'text', wajib: true },
        { k: 'sumber', l: 'Label sumber', t: 'text', ro: true, bantuan: 'Dipakai sebagai kolom "sumber" pada entri yang dikirim sistem ini' },
        { k: 'izin', l: 'Izin', t: 'text', ro: true },
        { k: 'aktif', l: 'Aktif', t: 'bool', bawaan: true },
        { k: 'awalan', l: 'Awalan kunci', t: 'text', ro: true },
        { k: 'hash', l: 'Hash', t: 'text', rahasia: true },
        { k: 'dibuat', l: 'Dibuat', t: 'datetime', ro: true },
        { k: 'terakhir_dipakai', l: 'Terakhir dipakai', t: 'datetime', ro: true },
        { k: 'catatan', l: 'Catatan', t: 'textarea', daftar: false }
      ]
    }
  ],

  alat: [
    {
      id: 'buat_kunci', sheet: 'KunciApi', label: '+ Buat kunci', gaya: 'utama',
      input: [
        { k: 'nama', l: 'Nama sistem', t: 'text', wajib: true, bantuan: 'mis. Aplikasi pembukuan, Laporan bulanan (Sheet)' },
        { k: 'izin', l: 'Izin', t: 'select', wajib: true, bawaan: 'kas:baca',
          opsi: ['kas:baca', 'kas:baca, kas:rinci', 'kas:baca, kas:tulis', 'kas:baca, kas:rinci, kas:tulis'] }
      ],
      run: function (ids, inp) {
        var nama = String(inp.nama || '').trim().slice(0, 80);
        if (!nama) throw new Error('Nama sistem wajib diisi.');
        var izin = normalIzin_(inp.izin);
        var tb = new Tabel_('KunciApi');
        var sumber = slug_(nama).slice(0, 40) || 'api';
        var pakai = {};
        tb.objek().forEach(function (k) { pakai[k.sumber] = 1; });
        var dasar = sumber, n = 2;
        while (pakai[sumber] || /^(manual|donasi-web)$/.test(sumber)) sumber = dasar + '-' + (n++);
        var kunci = buatKunciApi_();
        tb.set({ nama: nama, sumber: sumber, izin: izin, aktif: true, awalan: kunci.slice(0, 7) + '…', hash: sha256_(kunci), dibuat: new Date() });
        tb.simpan();
        return { pesan: 'Kunci untuk "' + nama + '" (label sumber: ' + sumber + '). Salin sekarang — kunci ini tidak bisa ditampilkan lagi.', salin: kunci };
      }
    },
    {
      id: 'putar_kunci', sheet: 'KunciApi', label: 'Ganti kunci', perluPilih: true,
      run: function (ids) {
        if (ids.length !== 1) throw new Error('Pilih satu kunci saja.');
        var tb = new Tabel_('KunciApi'), k = tb.ambil(ids[0]);
        if (!k) throw new Error('Kunci tidak ditemukan.');
        var kunci = buatKunciApi_();
        tb.set({ id: k.id, hash: sha256_(kunci), awalan: kunci.slice(0, 7) + '…', aktif: true });
        tb.simpan();
        return { pesan: 'Kunci baru untuk "' + k.nama + '". Kunci lama langsung tidak berlaku. Salin sekarang — tidak bisa ditampilkan lagi.', salin: kunci };
      }
    }
  ]
};

function buatKunciApi_() {
  return 'yk_' + (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 44);
}

function normalIzin_(s) {
  var ok = ['kas:baca', 'kas:rinci', 'kas:tulis'];
  var daftar = String(s || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return ok.indexOf(x) >= 0; });
  if (!daftar.length) throw new Error('Izin tidak valid.');
  if (daftar.indexOf('kas:baca') < 0) daftar.unshift('kas:baca');
  return daftar.filter(function (x, i) { return daftar.indexOf(x) === i; }).join(', ');
}

/** Periksa kunci API & izinnya. Mengembalikan {id, nama, sumber, izin[]}. */
function kunciApi_(kunci, izinPerlu) {
  kunci = String(kunci || '').trim();
  if (!/^yk_[0-9a-f]{20,}$/.test(kunci)) throw new Error('Kunci API tidak valid.');
  var h = sha256_(kunci);
  var tb = new Tabel_('KunciApi');
  var k = tb.objek().filter(function (x) { return x.hash === h; })[0];
  if (!k || k.aktif === false) throw new Error('Kunci API tidak dikenal atau sudah dicabut.');
  var izin = String(k.izin || '').split(',').map(function (x) { return x.trim(); });
  if (izinPerlu && izin.indexOf(izinPerlu) < 0) throw new Error('Kunci ini tidak punya izin ' + izinPerlu + '.');
  var terakhir = k.terakhir_dipakai ? new Date(k.terakhir_dipakai).getTime() : 0;
  if (Date.now() - terakhir > 10 * 60 * 1000) { tb.set({ id: k.id, terakhir_dipakai: new Date() }); tb.simpan(); }
  return { id: k.id, nama: k.nama, sumber: k.sumber, izin: izin };
}
