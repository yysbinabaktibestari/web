/**
 * MODUL SITUS: pengaturan umum, tautan sosmed, pengurus, bidang kegiatan,
 * serta endpoint gabungan `bootstrap`, `beranda`, dan `info`.
 */
var MODUL = MODUL || {};

MODUL.situs = {
  judul: 'Situs & Profil',
  urutan: 1,

  sheets: [
    {
      nama: 'Pengaturan',
      judul: 'Pengaturan situs',
      keterangan: 'Teks & info yayasan. Kunci berawalan "_" tidak ditampilkan ke publik.',
      kunci: 'kunci',
      lengkapiIsiAwal: true,
      urut: { k: 'kunci', arah: 'asc' },
      kolom: [
        { k: 'kunci', l: 'Kunci', t: 'text', wajib: true },
        { k: 'nilai', l: 'Nilai', t: 'textarea' },
        { k: 'keterangan', l: 'Keterangan', t: 'text', daftar: false }
      ],
      isiAwal: [
        { kunci: 'nama_yayasan', nilai: '', keterangan: 'Nama resmi yayasan' },
        { kunci: 'tagline', nilai: '', keterangan: 'Label kecil di atas judul beranda' },
        { kunci: 'judul_hero', nilai: '', keterangan: 'Judul besar di beranda' },
        { kunci: 'deskripsi', nilai: '', keterangan: 'Paragraf di bawah judul beranda & deskripsi SEO' },
        { kunci: 'logo', nilai: '', keterangan: 'URL gambar logo (opsional)' },
        { kunci: 'foto_hero', nilai: '', keterangan: 'URL foto kegiatan di beranda (opsional)' },
        { kunci: 'sejarah', nilai: '', keterangan: 'Halaman Tentang' },
        { kunci: 'visi', nilai: '', keterangan: 'Halaman Tentang' },
        { kunci: 'misi', nilai: '', keterangan: 'Satu misi per baris' },
        { kunci: 'akta', nilai: '', keterangan: 'Legalitas' },
        { kunci: 'sk_kemenkumham', nilai: '', keterangan: 'Legalitas' },
        { kunci: 'alamat', nilai: '', keterangan: 'Footer & kontak' },
        { kunci: 'telepon_wa', nilai: '', keterangan: 'Nomor WA kontak umum, mis. 0812xxxx' },
        { kunci: 'email', nilai: '', keterangan: 'Email yayasan' },
        { kunci: 'maps_embed', nilai: '', keterangan: 'URL embed Google Maps (Bagikan › Sematkan peta › ambil src)' },
        { kunci: 'qris', nilai: '', keterangan: 'URL gambar QRIS donasi (opsional)' },
        { kunci: 'ajakan_donasi', nilai: '', keterangan: 'Halaman Donasi' }
      ]
    },
    {
      nama: 'Tautan',
      judul: 'Tautan & sosial media',
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 },
        { k: 'label', l: 'Label', t: 'text', wajib: true },
        { k: 'url', l: 'URL', t: 'url', wajib: true },
        { k: 'ikon', l: 'Ikon', t: 'select', opsi: ['instagram', 'youtube', 'whatsapp', 'facebook', 'tiktok', 'telegram', 'x', 'web', 'tautan'], bawaan: 'tautan' },
        { k: 'keterangan', l: 'Keterangan', t: 'text' },
        { k: 'tampil', l: 'Tampil', t: 'bool', bawaan: true }
      ]
    },
    {
      nama: 'Pengurus',
      judul: 'Pengurus',
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 },
        { k: 'jabatan', l: 'Jabatan', t: 'text', wajib: true },
        { k: 'nama', l: 'Nama', t: 'text', wajib: true },
        { k: 'foto', l: 'Foto (URL)', t: 'image' },
        { k: 'tampil', l: 'Tampil', t: 'bool', bawaan: true }
      ]
    },
    {
      nama: 'Bidang',
      judul: 'Bidang kegiatan',
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 },
        { k: 'judul', l: 'Judul', t: 'text', wajib: true },
        { k: 'deskripsi', l: 'Deskripsi', t: 'textarea' },
        { k: 'ikon', l: 'Ikon', t: 'select', opsi: ['pendidikan', 'sosial', 'dakwah', 'kesehatan', 'ekonomi', 'lainnya'], bawaan: 'lainnya' },
        { k: 'tautan', l: 'Tautan (opsional)', t: 'text', bantuan: 'mis. #/artikel?kategori=pendidikan' },
        { k: 'tampil', l: 'Tampil', t: 'bool', bawaan: true }
      ]
    }
  ],

  publik: {
    /** Data awal yang dimuat sekali oleh website: pengaturan, menu, kategori, sematan, dst. */
    bootstrap: function () { return gabungHook_('bootstrap'); },

    /** Data semua bagian beranda dari setiap modul. */
    beranda: function () { return gabungHook_('beranda'); },

    profil: function () {
      return {
        pengurus: tampilUrut_(bacaTabel_('Pengurus')),
        bidang: tampilUrut_(bacaTabel_('Bidang'))
      };
    },

    /** Deskripsi API — titik awal bagi mitra yang ingin mirroring. */
    info: {
      cache: 3600,
      run: function () {
        var base = ScriptApp.getService().getUrl();
        return {
          nama: namaSitus_(),
          situs: CONFIG.SITE_URL,
          versi_api: 1,
          modul: daftarModul_().map(function (m) { return m.id; }),
          endpoint: {
            feed_rss: base + '?action=feed&format=rss',
            feed_json: base + '?action=feed&format=json',
            artikel: base + '?action=artikel&halaman=1&per=12[&kategori=slug][&kontributor=slug][&q=kata]',
            artikel_detail: base + '?action=artikel_detail&slug=SLUG',
            kontributor: base + '?action=kontributor',
            kontributor_detail: base + '?action=kontributor_detail&slug=SLUG',
            kategori: base + '?action=kategori'
          },
          catatan: 'Feed bawaan hanya berisi artikel asli yayasan (bukan hasil mirror) untuk mencegah duplikasi berantai. Tambahkan &semua=1 untuk menyertakan artikel mirror.'
        };
      }
    }
  },

  bootstrap: function () {
    return {
      situs: pengaturan_(),
      tautan: tampilUrut_(bacaTabel_('Tautan')),
      modul: daftarModul_().map(function (m) { return m.id; }),
      fitur: { pendaftaranKontributor: !!CONFIG.PENDAFTARAN_KONTRIBUTOR_TERBUKA },
      feed: ScriptApp.getService().getUrl() + '?action=feed&format=rss'
    };
  },

  beranda: function () {
    return { bidang: tampilUrut_(bacaTabel_('Bidang')) };
  }
};

/** Gabungkan hasil hook (bootstrap/beranda) dari semua modul. */
function gabungHook_(nama) {
  var out = {};
  daftarModul_().forEach(function (m) {
    if (typeof m[nama] !== 'function') return;
    try {
      var r = m[nama]() || {};
      Object.keys(r).forEach(function (k) { out[k] = r[k]; });
    } catch (e) {
      out['_galat_' + m.id] = pesanError_(e);
    }
  });
  return out;
}

function tampilUrut_(rows) {
  return rows.filter(function (r) { return r.tampil !== false; })
    .sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); })
    .map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { if (k !== 'tampil') o[k] = r[k]; }); return o; });
}
