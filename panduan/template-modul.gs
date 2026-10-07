/**
 * TEMPLATE MODUL BACKEND
 * ------------------------------------------------------------------
 * 1. Simpan file ini di repo GitHub sebagai mis. "gas/30_Galeri.gs".
 * 2. Ganti "galeri" dan definisinya sesuai kebutuhan.
 * 3. Panel admin › Perbarui sistem → sheet & kolom dibuat otomatis,
 *    menu muncul di panel admin. Tidak perlu deploy ulang.
 *
 * Semua bagian opsional kecuali `sheets` (bila modul menyimpan data).
 */
var MODUL = MODUL || {};

MODUL.galeri = {
  judul: 'Galeri',        // judul grup di panel admin
  urutan: 50,            // urutan di panel admin

  sheets: [
    {
      nama: 'Galeri',
      judul: 'Daftar video galeri',
      keterangan: 'Video YouTube per kategori.',
      urut: { k: 'urutan', arah: 'asc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 },
        { k: 'judul', l: 'Judul', t: 'text', wajib: true },
        { k: 'url', l: 'URL YouTube', t: 'url', wajib: true },
        { k: 'kategori', l: 'Kategori', t: 'select', opsi: ['Kajian', 'Kegiatan', 'Lainnya'] },
        { k: 'catatan_admin', l: 'Catatan admin', t: 'textarea', privat: true, daftar: false },
        { k: 'tampil', l: 'Tampil', t: 'bool', bawaan: true }
      ]
    }
  ],

  // GET publik: ?action=galeri  (hasil di-cache otomatis, privat dibuang)
  publik: {
    galeri: function (p) {
      var list = publikSaja_('Galeri', tampilUrut_(bacaTabel_('Galeri')));
      return p.kategori ? list.filter(function (v) { return v.kategori === p.kategori; }) : list;
    }
  },

  // POST publik: fetch(API_URL, {method:'POST', body: JSON.stringify({action:'...', ...})})
  // publikPost: { kirim_sesuatu: function (body) { tambahBaris_('NamaSheet', {...}); return { pesan: 'OK' }; } },

  // Data tambahan untuk beranda (?action=beranda) dan bootstrap (dimuat sekali).
  beranda: function () { return { galeri: MODUL.galeri.publik.galeri({}).slice(0, 4) }; },
  // bootstrap: function () { return { ... }; },

  // Tombol khusus di panel admin.
  // alat: [{ id: 'nama', sheet: 'Galeri', label: 'Label tombol', perluPilih: true,
  //          input: [{ k: 'x', l: 'Isian', t: 'text' }], run: function (ids, input) { return { pesan: 'Selesai' }; } }],

  // Tugas latar per jam.
  // tugasPerJam: function () { ... },

  // Kait sebelum disimpan dari admin.
  // sebelumSimpan: function (namaSheet, dataBaru, dataLama) { ... }
};
