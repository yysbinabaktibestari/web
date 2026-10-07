/**
 * TEMPLATE MODUL BACKEND
 * ------------------------------------------------------------------
 * 1. Salin file ini ke Apps Script sebagai mis. "30_Video.gs".
 * 2. Ganti "video" dan definisinya sesuai kebutuhan.
 * 3. Jalankan setup() → sheet & kolom dibuat otomatis, menu muncul di panel admin.
 * 4. Terapkan › Kelola deployment › Edit › Versi baru (URL web app tetap sama).
 *
 * Semua bagian opsional kecuali `sheets` (bila modul menyimpan data).
 */
var MODUL = MODUL || {};

MODUL.video = {
  judul: 'Video',        // judul grup di panel admin
  urutan: 50,            // urutan di panel admin

  sheets: [
    {
      nama: 'Video',
      judul: 'Daftar video',
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

  // GET publik: ?action=video  (hasil di-cache otomatis, privat dibuang)
  publik: {
    video: function (p) {
      var list = publikSaja_('Video', tampilUrut_(bacaTabel('Video')));
      return p.kategori ? list.filter(function (v) { return v.kategori === p.kategori; }) : list;
    }
  },

  // POST publik: fetch(API_URL, {method:'POST', body: JSON.stringify({action:'...', ...})})
  // publikPost: { kirim_sesuatu: function (body) { tambahBaris_('NamaSheet', {...}); return { pesan: 'OK' }; } },

  // Data tambahan untuk beranda (?action=beranda) dan bootstrap (dimuat sekali).
  beranda: function () { return { video: MODUL.video.publik.video({}).slice(0, 4) }; },
  // bootstrap: function () { return { ... }; },

  // Tombol khusus di panel admin.
  // alat: [{ id: 'nama', sheet: 'Video', label: 'Label tombol', perluPilih: true,
  //          input: [{ k: 'x', l: 'Isian', t: 'text' }], run: function (ids, input) { return { pesan: 'Selesai' }; } }],

  // Tugas latar per jam.
  // tugasPerJam: function () { ... },

  // Kait sebelum disimpan dari admin.
  // sebelumSimpan: function (namaSheet, dataBaru, dataLama) { ... }
};
