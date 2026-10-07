/**
 * MODUL DONASI: program/open donasi, rekening (bisa banyak), kontak
 * konfirmasi, formulir konfirmasi transfer, dan banner sematan di atas
 * semua halaman (untuk open donasi / pengumuman penting).
 */
var MODUL = MODUL || {};

var STATUS_KONFIRMASI = ['Belum dicek', 'Diterima', 'Ditolak'];

MODUL.donasi = {
  judul: 'Donasi & Sematan',
  urutan: 40,

  sheets: [
    {
      nama: 'Sematan',
      judul: 'Banner disematkan',
      keterangan: 'Banner di atas semua halaman. Yang tampil: baris aktif pertama yang tanggalnya berlaku.',
      urut: { k: 'urutan', arah: 'asc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 },
        { k: 'aktif', l: 'Aktif', t: 'bool', bawaan: true },
        { k: 'jenis', l: 'Label', t: 'select', opsi: ['Open Donasi', 'Pengumuman', 'Artikel', 'Kajian'], bawaan: 'Open Donasi' },
        { k: 'judul', l: 'Judul', t: 'text', wajib: true },
        { k: 'tautan', l: 'Tautan tombol', t: 'text', bawaan: '#/donasi', bantuan: 'mis. #/donasi, #/artikel/slug-artikel, atau URL lengkap' },
        { k: 'teks_tombol', l: 'Teks tombol', t: 'text', bawaan: 'Donasi Sekarang' },
        { k: 'program', l: 'Program (untuk progres dana)', t: 'ref', ref: { sheet: 'Program', nilai: 'id', label: 'nama' } },
        { k: 'warna', l: 'Warna', t: 'select', opsi: ['karat', 'biru', 'emas'], bawaan: 'karat' },
        { k: 'mulai', l: 'Mulai', t: 'date' },
        { k: 'selesai', l: 'Selesai', t: 'date' }
      ]
    },
    {
      nama: 'Program',
      judul: 'Program donasi',
      urut: { k: 'mulai', arah: 'desc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'nama', l: 'Nama program', t: 'text', wajib: true },
        { k: 'deskripsi', l: 'Deskripsi', t: 'textarea', daftar: false },
        { k: 'poster', l: 'Poster (URL)', t: 'image', daftar: false },
        { k: 'target', l: 'Target (Rp)', t: 'number' },
        { k: 'terkumpul', l: 'Terkumpul (Rp)', t: 'number', bantuan: 'Kosongkan = dihitung otomatis dari konfirmasi berstatus Diterima' },
        { k: 'mulai', l: 'Mulai', t: 'date' },
        { k: 'selesai', l: 'Selesai', t: 'date' },
        { k: 'aktif', l: 'Aktif', t: 'bool', bawaan: true }
      ]
    },
    {
      nama: 'Rekening',
      judul: 'Rekening donasi',
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 },
        { k: 'bank', l: 'Bank / dompet', t: 'text', wajib: true },
        { k: 'nomor', l: 'Nomor rekening', t: 'text', wajib: true },
        { k: 'atas_nama', l: 'Atas nama', t: 'text', wajib: true },
        { k: 'peruntukan', l: 'Peruntukan', t: 'text', bawaan: 'Umum', bantuan: 'mis. Umum, Pendidikan, Sosial, atau nama program' },
        { k: 'kontak', l: 'Kontak konfirmasi', t: 'ref', ref: { sheet: 'KontakDonasi', nilai: 'id', label: 'nama' } },
        { k: 'tampil', l: 'Tampil', t: 'bool', bawaan: true }
      ]
    },
    {
      nama: 'KontakDonasi',
      judul: 'Kontak konfirmasi',
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'nama', l: 'Nama petugas', t: 'text', wajib: true },
        { k: 'wa', l: 'WhatsApp', t: 'wa', wajib: true },
        { k: 'keterangan', l: 'Keterangan', t: 'text', bantuan: 'mis. Rekening umum & QRIS' },
        { k: 'tampil', l: 'Tampil', t: 'bool', bawaan: true }
      ]
    },
    {
      nama: 'Konfirmasi',
      judul: 'Konfirmasi donasi masuk',
      bisaTambah: false,
      urut: { k: 'waktu', arah: 'desc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'waktu', l: 'Waktu', t: 'datetime', ro: true },
        { k: 'nama', l: 'Donatur', t: 'text' },
        { k: 'wa', l: 'WhatsApp', t: 'wa', privat: true },
        { k: 'nominal', l: 'Nominal (Rp)', t: 'number' },
        { k: 'tanggal_transfer', l: 'Tgl transfer', t: 'date' },
        { k: 'rekening', l: 'Rekening tujuan', t: 'text' },
        { k: 'program', l: 'Program', t: 'ref', ref: { sheet: 'Program', nilai: 'id', label: 'nama' } },
        { k: 'bukti', l: 'Bukti', t: 'url', privat: true },
        { k: 'pesan', l: 'Pesan', t: 'textarea', daftar: false },
        { k: 'status', l: 'Status', t: 'select', opsi: STATUS_KONFIRMASI, bawaan: 'Belum dicek' }
      ]
    }
  ],

  publik: {
    donasi: function () {
      var kontak = {};
      bacaTabel_('KontakDonasi').forEach(function (k) { if (k.tampil !== false) kontak[k.id] = { nama: k.nama, wa: k.wa, keterangan: k.keterangan }; });
      return {
        program: programAktif_(),
        rekening: tampilUrut_(bacaTabel_('Rekening')).map(function (r) {
          return { id: r.id, bank: r.bank, nomor: r.nomor, atas_nama: r.atas_nama, peruntukan: r.peruntukan, kontak: kontak[r.kontak] || null };
        }),
        kontak: Object.keys(kontak).map(function (k) { return kontak[k]; })
      };
    }
  },

  publikPost: {
    konfirmasi_donasi: function (b) {
      var nama = String(b.nama || '').trim().slice(0, 120) || 'Hamba Allah';
      var wa = normalWa_(b.wa);
      var nominal = Number(String(b.nominal || '').replace(/[^\d]/g, ''));
      if (!wa) throw new Error('Nomor WhatsApp tidak valid.');
      if (!nominal || nominal < 1000) throw new Error('Nominal tidak valid.');
      batasiFrekuensi_('konf:' + wa, 120, 'Konfirmasi baru saja dikirim. Coba lagi 2 menit lagi.');
      var buktiUrl = '';
      if (b.bukti && b.bukti.data) {
        var tipe = String(b.bukti.tipe || '');
        if (!/^image\/(jpeg|png|webp)$|^application\/pdf$/.test(tipe)) throw new Error('Bukti harus berupa gambar (JPG/PNG/WEBP) atau PDF.');
        var bytes = Utilities.base64Decode(String(b.bukti.data));
        if (bytes.length > CONFIG.MAKS_BUKTI) throw new Error('Ukuran bukti maksimal 5 MB.');
        var ext = tipe === 'application/pdf' ? '.pdf' : '.' + tipe.split('/')[1];
        var namaFile = fmt_(new Date(), 'yyyyMMdd-HHmmss') + '-' + slug_(nama).slice(0, 30) + ext;
        buktiUrl = folder_('FOLDER_BUKTI').createFile(Utilities.newBlob(bytes, tipe, namaFile)).getUrl();
      }
      tambahBaris_('Konfirmasi', {
        waktu: new Date(), nama: nama, wa: wa, nominal: nominal,
        tanggal_transfer: b.tanggal_transfer || '', rekening: String(b.rekening || '').slice(0, 120),
        program: String(b.program || '').slice(0, 40), bukti: buktiUrl,
        pesan: String(b.pesan || '').slice(0, 1000), status: 'Belum dicek'
      });
      return { pesan: 'Jazakumullahu khairan. Konfirmasi Anda sudah kami terima dan akan dicek oleh petugas.' };
    }
  },

  bootstrap: function () { return { sematan: sematanAktif_() }; },

  alat: [
    {
      id: 'terima', sheet: 'Konfirmasi', label: 'Tandai Diterima', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Konfirmasi', ids, 'status', 'Diterima') + ' konfirmasi diterima.' }; }
    },
    {
      id: 'tolak', sheet: 'Konfirmasi', label: 'Tandai Ditolak', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Konfirmasi', ids, 'status', 'Ditolak') + ' konfirmasi ditolak.' }; }
    }
  ]
};

function terkumpulOtomatis_() {
  var t = {};
  bacaTabel_('Konfirmasi').forEach(function (k) {
    if (k.status === 'Diterima' && k.program) t[k.program] = (t[k.program] || 0) + (Number(k.nominal) || 0);
  });
  return t;
}

function programAktif_() {
  var hariIni = hariIni_(), auto = null;
  return bacaTabel_('Program').filter(function (p) {
    return p.aktif !== false && (!p.mulai || p.mulai <= hariIni) && (!p.selesai || p.selesai >= hariIni);
  }).map(function (p) {
    var terkumpul = p.terkumpul;
    if (terkumpul === null || terkumpul === '') { auto = auto || terkumpulOtomatis_(); terkumpul = auto[p.id] || 0; }
    return {
      id: p.id, nama: p.nama, deskripsi: p.deskripsi, poster: p.poster, target: p.target || 0,
      terkumpul: terkumpul || 0, selesai: p.selesai,
      persen: p.target ? Math.min(100, Math.round((terkumpul || 0) / p.target * 100)) : null
    };
  });
}

function sematanAktif_() {
  var hariIni = hariIni_();
  var s = bacaTabel_('Sematan').filter(function (x) {
    return x.aktif !== false && (!x.mulai || x.mulai <= hariIni) && (!x.selesai || x.selesai >= hariIni);
  }).sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); })[0];
  if (!s) return null;
  var out = { jenis: s.jenis, judul: s.judul, tautan: s.tautan || '#/donasi', teks_tombol: s.teks_tombol || 'Selengkapnya', warna: s.warna || 'karat' };
  if (s.program) {
    var p = programAktif_().filter(function (x) { return x.id === s.program; })[0];
    if (p) { out.target = p.target; out.terkumpul = p.terkumpul; out.persen = p.persen; }
  }
  return out;
}
