/**
 * MODUL KONTRIBUTOR & MIRRORING (tanpa hub)
 * ------------------------------------------------------------------
 * Kontributor cukup menyetor SATU sumber:
 *   1. Link folder Google Drive  → setiap Google Doc di folder = 1 artikel.
 *      Subfolder (1 tingkat) dibaca sebagai kategori bila namanya cocok.
 *   2. URL feed website          → RSS 2.0, Atom, atau JSON Feed.
 *      (Website lain yang memakai sistem ini juga punya feed JSON, jadi
 *       antar-yayasan bisa saling mirror langsung tanpa server pusat.)
 *
 * Sinkron berjalan otomatis tiap jam (trigger dari setup) dan bisa
 * dijalankan manual dari panel admin.
 */
var MODUL = MODUL || {};

MODUL.kontributor = {
  judul: 'Kontributor',
  urutan: 20,

  sheets: [
    {
      nama: 'Kontributor',
      judul: 'Kontributor',
      keterangan: 'Sumber = link folder Google Drive (dibagikan "Siapa saja yang memiliki link") atau URL feed RSS/Atom/JSON.',
      urut: { k: 'terdaftar', arah: 'desc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'nama', l: 'Nama', t: 'text', wajib: true },
        { k: 'slug', l: 'Slug', t: 'text', daftar: false },
        { k: 'foto', l: 'Foto (URL)', t: 'image' },
        { k: 'website', l: 'Website', t: 'url' },
        { k: 'bio', l: 'Biografi', t: 'textarea', daftar: false },
        { k: 'email', l: 'Email', t: 'email', privat: true, daftar: false },
        { k: 'wa', l: 'WhatsApp', t: 'wa', privat: true, daftar: false },
        { k: 'sumber_tipe', l: 'Jenis sumber', t: 'select', opsi: ['folder', 'feed'], bawaan: 'folder' },
        { k: 'sumber_url', l: 'Link folder / URL feed', t: 'url', wajib: true, privat: true, daftar: false },
        { k: 'kategori_default', l: 'Kategori bawaan', t: 'ref', ref: { sheet: 'Kategori', nilai: 'slug', label: 'nama' }, daftar: false },
        { k: 'status', l: 'Status', t: 'select', opsi: ['Tayang', 'Tidak tayang'], bawaan: 'Tayang',
          bantuan: '"Tidak tayang" menyembunyikan profil & semua artikelnya' },
        { k: 'status_artikel_baru', l: 'Status artikel baru', t: 'select', opsi: ['Tayang', 'Tidak tayang'],
          bawaan: 'Tayang', daftar: false, bantuan: 'Status awal tiap artikel baru hasil sinkron' },
        { k: 'terakhir_sinkron', l: 'Terakhir sinkron', t: 'datetime', ro: true, privat: true },
        { k: 'catatan_sinkron', l: 'Hasil sinkron', t: 'text', ro: true, privat: true },
        { k: 'arsip_lanjut', l: 'Impor arsip feed', t: 'text', ro: true, privat: true, daftar: false, bantuan: 'Otomatis: halaman feed berikutnya yang akan diambil, atau "selesai"' },
        { k: 'terdaftar', l: 'Terdaftar', t: 'datetime', ro: true, daftar: false }
      ]
    }
  ],

  publik: {
    kontributor: function () {
      var jumlah = {};
      artikelTayang_().forEach(function (a) { if (a.kontributor) jumlah[a.kontributor.slug] = (jumlah[a.kontributor.slug] || 0) + 1; });
      return publikSaja_('Kontributor', bacaTabel_('Kontributor'))
        .filter(function (k) { return k.status === STATUS.TAYANG && k.slug; })
        .map(function (k) { return ringkasKontributor_(k, jumlah[k.slug] || 0); })
        .sort(function (a, b) { return a.nama.localeCompare(b.nama); });
    },

    kontributor_detail: function (p) {
      var prof = profilKontributor_(p.slug);
      if (!prof) throw new Error('Kontributor tidak ditemukan.');
      var per = Math.min(Number(p.per) || 12, 50), hal = Math.max(Number(p.halaman) || 1, 1);
      var list = artikelTayang_().filter(function (a) { return a.kontributor && a.kontributor.slug === p.slug; });
      prof.artikel = list.slice((hal - 1) * per, hal * per).map(publikArtikel_);
      prof.total = list.length;
      prof.halaman = hal;
      prof.jumlahHalaman = Math.max(1, Math.ceil(list.length / per));
      return prof;
    }
  },

  publikPost: {
    /** Formulir "Jadi Kontributor" di website. */
    daftar_kontributor: function (b) {
      if (!CONFIG.PENDAFTARAN_KONTRIBUTOR_TERBUKA) throw new Error('Pendaftaran kontributor sedang ditutup.');
      if (b.situs_alt) return { pesan: 'Terima kasih.' }; // jebakan bot
      var nama = String(b.nama || '').trim().slice(0, 120);
      var email = String(b.email || '').trim().slice(0, 160);
      var wa = b.wa ? normalWa_(b.wa) : '';
      var sumber = String(b.sumber_url || '').trim();
      var website = String(b.website || '').trim();
      var foto = String(b.foto || '').trim();
      if (!nama) throw new Error('Nama wajib diisi.');
      if (!validEmail_(email)) throw new Error('Email tidak valid.');
      if (b.wa && !wa) throw new Error('Nomor WhatsApp tidak valid.');
      if (!validUrl_(sumber)) throw new Error('Link folder / URL feed tidak valid.');
      if (website && !validUrl_(website)) throw new Error('Alamat website tidak valid.');
      if (foto && !validUrl_(foto)) throw new Error('URL foto tidak valid.');
      if (!b.setuju) throw new Error('Mohon centang persetujuan.');
      batasiFrekuensi_('daftar:' + email.toLowerCase(), 600, 'Pendaftaran dengan email ini baru saja dikirim.');
      var lepas = kunciTulis_();
      try {
        var tb = new Tabel_('Kontributor');
        var ada = tb.objek().filter(function (k) { return String(k.email).toLowerCase() === email.toLowerCase(); })[0];
        if (ada) throw new Error('Email ini sudah terdaftar sebagai kontributor. Hubungi admin untuk perubahan.');
        tb.set({
          nama: nama, slug: slugUnik_(nama, tb), foto: foto, website: website,
          bio: String(b.bio || '').trim().slice(0, 1500), email: email, wa: wa,
          sumber_tipe: jenisSumber_(sumber), sumber_url: sumber,
          status: CONFIG.KONTRIBUTOR_STATUS_DEFAULT,
          status_artikel_baru: CONFIG.ARTIKEL_KONTRIBUTOR_STATUS_DEFAULT,
          terdaftar: new Date()
        });
        tb.simpan();
      } finally {
        lepas();
      }
      naikkanVersiCache();
      return { pesan: 'Pendaftaran diterima. Artikel Anda mulai tampil setelah sinkronisasi berikutnya (paling lama ±1 jam).' };
    }
  },

  /** Daftar ringkas kontributor untuk filter di halaman Artikel. */
  bootstrap: function () {
    return { kontributor: MODUL.kontributor.publik.kontributor().map(function (k) {
      return { nama: k.nama, slug: k.slug, foto: k.foto, website: k.website, bio: potong_(k.bio, 280), jumlah_artikel: k.jumlah_artikel };
    }) };
  },

  beranda: function () {
    return { kontributor: MODUL.kontributor.publik.kontributor().slice(0, 6) };
  },

  /** Dipanggil trigger per jam (lihat 99_Setup.gs). */
  tugasPerJam: function () { sinkronSemua(); },

  sebelumSimpan: function (nama, obj, lama) {
    if (nama !== 'Kontributor') return;
    // Jenis sumber selalu mengikuti alamatnya (link folder Drive = folder, selain itu feed/situs)
    if (obj.sumber_url) obj.sumber_tipe = jenisSumber_(obj.sumber_url);
    if (!lama && !obj.terdaftar) obj.terdaftar = new Date();
    if (obj.wa) obj.wa = normalWa_(obj.wa) || obj.wa;
  },

  alat: [
    {
      id: 'sinkron', sheet: 'Kontributor', label: 'Sinkron sekarang', gaya: 'utama',
      run: function (ids) {
        var hasil = sinkronKontributor_(ids && ids.length ? ids : null);
        return { pesan: hasil.ringkas, tabel: hasil.detail };
      }
    },
    {
      id: 'arsip_ulang', sheet: 'Kontributor', label: 'Baca ulang arsip', perluPilih: true,
      run: function (ids) {
        var n = 0;
        var lepas = kunciTulis_();
        try { n = ubahKolom_('Kontributor', ids, 'arsip_lanjut', ''); } finally { lepas(); }
        var hasil = sinkronKontributor_(ids);
        return { pesan: n + ' kontributor: arsip feed dibaca ulang dari awal (tulisan yang sudah ada dilewati). ' + hasil.ringkas, tabel: hasil.detail };
      }
    },
    {
      id: 'tayangkan_k', sheet: 'Kontributor', label: 'Tayangkan', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Kontributor', ids, 'status', STATUS.TAYANG) + ' kontributor ditayangkan.' }; }
    },
    {
      id: 'sembunyikan_k', sheet: 'Kontributor', label: 'Tidak tayang', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Kontributor', ids, 'status', STATUS.TIDAK) + ' kontributor disembunyikan beserta artikelnya.' }; }
    }
  ]
};

/* ================================================================
 * Profil
 * ============================================================== */

function ringkasKontributor_(k, jumlah) {
  return { nama: k.nama, slug: k.slug, foto: k.foto || '', website: k.website || '',
    bio: k.bio || '', jumlah_artikel: jumlah };
}

function profilKontributor_(slug) {
  var k = publikSaja_('Kontributor', bacaTabel_('Kontributor'))
    .filter(function (x) { return x.slug === slug && x.status === STATUS.TAYANG; })[0];
  return k ? ringkasKontributor_(k, 0) : null;
}

function jenisSumber_(url) {
  return /drive\.google\.com\/(drive\/)?(u\/\d+\/)?(folders\/|open\?id=)/i.test(String(url)) ? 'folder' : 'feed';
}

/* ================================================================
 * SINKRON
 * ============================================================== */

/** Dipanggil trigger per jam & tombol admin. `ids` null = semua kontributor. */
function sinkronKontributor_(ids) {
  if (!ambilGiliran_('artikel')) return { ringkas: 'Sinkron artikel sedang berjalan (bisa jadi di latar belakang). Hasilnya akan tercatat di kolom "Hasil sinkron"; coba lagi beberapa menit lagi bila perlu.', detail: [] };
  var detail = [];
  try {
    var mulai = Date.now();
    var tk = new Tabel_('Kontributor'), ta = new Tabel_('Artikel');
    var daftar = tk.objek().filter(function (k) {
      return k.sumber_url && (!ids || ids.indexOf(k.id) >= 0);
    }).sort(function (a, b) { return String(a.terakhir_sinkron).localeCompare(String(b.terakhir_sinkron)); });
    var kat = petaKategori_(), adaAntrean = false, berubah = false;
    for (var i = 0; i < daftar.length; i++) {
      if (Date.now() - mulai > CONFIG.BATAS_WAKTU_MS) {
        detail.push({ kontributor: '(sisanya)', hasil: 'Dilanjutkan otomatis ±1 menit lagi (batas waktu).' });
        adaAntrean = true;
        break;
      }
      var k = daftar[i], catatan;
      try {
        var batas = mulai + CONFIG.BATAS_WAKTU_MS;
        var kemajuan = (function (id) {
          return function (lanjut) { tk.set({ id: id, arsip_lanjut: lanjut }); ta.simpan(); tk.simpan(); };
        })(k.id);
        var h = k.sumber_tipe === 'feed' ? sinkronFeed_(k, ta, kat, batas, kemajuan) : sinkronFolder_(k, ta, kat, batas);
        catatan = 'OK · ' + h.baru + ' baru, ' + h.ubah + ' diperbarui' + (h.hilang ? ', ' + h.hilang + ' disembunyikan' : '') +
          (h.tertunda ? ', ' + h.tertunda + ' menyusul' : '') + (h.arsip ? ' · ' + h.arsip : '');
        if (h.tertunda || (h.arsipLanjut && !h.arsipGagal)) adaAntrean = true;
        if (h.baru || h.ubah || h.hilang) berubah = true;
        if (h.arsipLanjut !== undefined) tk.set({ id: k.id, arsip_lanjut: h.arsipLanjut || 'selesai' });
        if (h.feedBaru) { tk.set({ id: k.id, sumber_url: h.feedBaru }); catatan += ' · alamat feed ditemukan otomatis: ' + h.feedBaru; }
      } catch (e) {
        catatan = 'Gagal: ' + pesanError_(e);
      }
      tk.set({ id: k.id, terakhir_sinkron: new Date(), catatan_sinkron: catatan });
      detail.push({ kontributor: k.nama, hasil: catatan });
      ta.simpan(); tk.simpan();          // simpan per kontributor: hasil tidak hilang bila eksekusi terputus
    }
    ta.simpan();
    tk.simpan();
    if (berubah) naikkanVersiCache();     // cache website hanya dikosongkan bila ada tulisan berubah
  } finally {
    lepasGiliran_('artikel');
  }
  // Antrean belum habis → putaran berikutnya 1 menit lagi (bukan menunggu sejam)
  var lanjut = adaAntrean && typeof jadwalkanSegera_ === 'function' && jadwalkanSegera_('kontributor');
  return { ringkas: (detail.length ? 'Sinkron selesai untuk ' + detail.length + ' kontributor.' : 'Tidak ada kontributor dengan sumber.') +
    (lanjut ? ' Sisa antrean dilanjutkan otomatis di latar belakang.' : ''), detail: detail };
}

/** Fungsi untuk trigger per jam. */
function sinkronSemua() {
  try { batasiFrekuensi_('sinkronSemua', 120); } catch (e) { return { ringkas: 'Sinkron baru saja dijalankan.', detail: [] }; }
  return sinkronKontributor_(null);
}

function petaKategori_() {
  var m = {};
  bacaTabel_('Kategori').forEach(function (k) {
    m[String(k.slug).toLowerCase()] = k.slug;
    m[String(k.nama).toLowerCase()] = k.slug;
  });
  return m;
}

function cocokKategori_(daftar, peta) {
  for (var i = 0; i < (daftar || []).length; i++) {
    var x = String(daftar[i] || '').toLowerCase().trim();
    if (peta[x]) return peta[x];
    if (peta[slug_(x)]) return peta[slug_(x)];
  }
  return '';
}

/* ---------- Sumber: folder Google Drive ---------- */

function sinkronFolder_(k, ta, kat, batas) {
  var fid = idDrive_(k.sumber_url);
  if (!fid) throw new Error('Link folder tidak valid.');
  var folder;
  try { folder = DriveApp.getFolderById(fid); }
  catch (e) { throw new Error('Folder tidak bisa dibuka. Pastikan dibagikan "Siapa saja yang memiliki link".'); }
  var docs = [];
  kumpulkanDoc_(folder, [], docs, 0, {});
  var h = { baru: 0, ubah: 0, hilang: 0, tertunda: 0 }, terlihat = {};
  docs.forEach(function (d) {
    var id = 'f_' + d.file.getId();
    if (terlihat[id]) return;            // Doc yang sama lewat pintasan / dua folder
    terlihat[id] = 1;
    var lama = ta.ambil(id);
    var upd = d.file.getLastUpdated();
    var updDetik = Math.floor(upd.getTime() / 1000) * 1000; // sheet tidak menyimpan milidetik
    if (lama && lama.diperbarui && new Date(lama.diperbarui).getTime() >= updDetik) return;
    if (Date.now() > batas) { h.tertunda++; return; }
    var isi = htmlDoc_(d.file.getId());
    ta.set(hanyaBaru_({
      id: id,
      judul: bersihJudul_(d.file.getName()),
      slug: lama ? lama.slug : slugUnik_(bersihJudul_(d.file.getName()), ta),
      status_kurasi: lama ? lama.status_kurasi : 'Belum dikurasi',
      kategori: (lama && lama.kategori) || kategoriDariJalur_(d.jalur, kat) || k.kategori_default || '',
      status: lama ? lama.status : (k.status_artikel_baru || CONFIG.ARTIKEL_KONTRIBUTOR_STATUS_DEFAULT),
      sumber: 'folder',
      doc_url: d.file.getUrl(),
      url_asli: (lama && lama.url_asli) || '',
      kontributor: k.slug,
      penulis: k.nama,
      ringkasan: isi.ringkasan,
      sampul: isi.sampul,
      tanggal: lama ? lama.tanggal : d.file.getDateCreated(),
      diperbarui: upd
    }, lama));
    if (lama) h.ubah++; else h.baru++;
  });
  // Doc yang dihapus/dipindah dari folder → disembunyikan
  ta.objek().forEach(function (a) {
    if (a.kontributor === k.slug && a.sumber === 'folder' && !terlihat[a.id] && a.status === STATUS.TAYANG) {
      ta.set({ id: a.id, status: STATUS.TIDAK });
      h.hilang++;
    }
  });
  return h;
}

/** Batas kedalaman subfolder yang dibaca (folder utama = 0). */
var KEDALAMAN_FOLDER_KONTRIBUTOR = 5;

/**
 * Kumpulkan semua Google Doc di folder & subfoldernya (sampai 5 tingkat), termasuk
 * pintasan (shortcut) ke Doc. `jalur` = nama-nama subfolder dari atas ke bawah.
 */
function kumpulkanDoc_(folder, jalur, out, kedalaman, dilihat) {
  var fid = folder.getId();
  if (dilihat[fid]) return;
  dilihat[fid] = 1;
  var it = folder.getFilesByType(MimeType.GOOGLE_DOCS);
  while (it.hasNext()) out.push({ file: it.next(), jalur: jalur });
  if (MimeType.SHORTCUT) {
    try {
      var ps = folder.getFilesByType(MimeType.SHORTCUT);
      while (ps.hasNext()) {
        var p = ps.next();
        try {
          if (p.getTargetMimeType() === MimeType.GOOGLE_DOCS) out.push({ file: DriveApp.getFileById(p.getTargetId()), jalur: jalur });
        } catch (e) { /* pintasan ke file yang tidak bisa dibuka: lewati */ }
      }
    } catch (e) { /* abaikan */ }
  }
  if (kedalaman >= KEDALAMAN_FOLDER_KONTRIBUTOR) return;
  var fs = folder.getFolders();
  while (fs.hasNext()) {
    var f = fs.next();
    kumpulkanDoc_(f, jalur.concat(f.getName()), out, kedalaman + 1, dilihat);
  }
}

/** Kategori dari nama subfolder: yang paling dalam lebih dulu, mis. "Opini/Pendidikan" → Pendidikan. */
function kategoriDariJalur_(jalur, kat) {
  for (var i = (jalur || []).length - 1; i >= 0; i--) {
    var n = String(jalur[i]).trim().toLowerCase();
    var cocok = kat[n] || kat[slug_(n)] || kat[bersihJudul_(jalur[i]).toLowerCase()];
    if (cocok) return cocok;
  }
  return '';
}

/* ---------- Sumber: feed RSS / Atom / JSON Feed ---------- */

/** Maksimal halaman arsip feed yang diambil per putaran (sisanya otomatis putaran berikutnya). */
var HALAMAN_ARSIP_PER_PUTARAN = 30;

function ambilFeed_(url) {
  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true, followRedirects: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YayasanMirror/1.0)' }
  });
  return { kode: res.getResponseCode(), teks: res.getResponseCode() < 400 ? res.getContentText() : '' };
}

/**
 * Halaman pertama feed tiap putaran (tulisan terbaru), lalu arsip lama halaman demi halaman
 * sampai habis: Atom/RSS rel="next", JSON Feed next_url, WordPress ?paged=N, Blogger start-index.
 */
function sinkronFeed_(k, ta, kat, batas, kemajuan) {
  batas = batas || Date.now() + CONFIG.BATAS_WAKTU_MS;
  var r = ambilFeed_(k.sumber_url);
  if (r.kode >= 400) throw new Error('Feed tidak bisa diambil (HTTP ' + r.kode + ').');
  var h = { baru: 0, ubah: 0, hilang: 0, tertunda: 0 };
  if (halamanHtml_(r.teks)) {
    // Yang diisi alamat situs, bukan feed → cari feed-nya otomatis, lalu simpan
    var ketemu = temukanFeed_(k.sumber_url, r.teks);
    if (!ketemu) {
      throw new Error('Alamat ini halaman web, bukan feed, dan feed-nya tidak ditemukan otomatis. Isi dengan alamat feed, ' +
        'mis. situs.com/feed (WordPress), situs.blogspot.com/feeds/posts/default (Blogger), atau link folder Google Drive.');
    }
    k.sumber_url = ketemu.url;
    r = ketemu;
    h.feedBaru = ketemu.url;
  }
  // Tiap tulisan baru disimpan ke Drive (±2–3 dtk). Waktu diperiksa per tulisan agar eksekusi tidak
  // diputus paksa oleh Apps Script (6 menit) — kalau diputus, hasil satu putaran hilang semua.
  var proses = function (items) {
    for (var i = 0; i < items.length; i++) {
      if (Date.now() > batas) { h.tertunda += items.length - i; return false; }
      prosesItemFeed_(items[i], k, ta, kat, h);
    }
    return true;
  };
  var f = bacaFeed_(r.teks, k.sumber_url, 1);
  if (!proses(f.items)) return h;
  if (k.arsip_lanjut === 'selesai') {
    // Arsip pernah ditandai selesai, tetapi jumlah tulisan di feed (Blogger: totalResults) jauh lebih banyak → baca ulang
    if (!(f.total && f.berikut && jumlahArtikelFeed_(ta, k) < f.total - 5)) return h;
    k.arsip_lanjut = '';
  }
  // ---- arsip (halaman baru tidak dimulai bila sisa waktu < 75 dtk)
  var berikut = k.arsip_lanjut || f.berikut, n = 0, diambil = 0, lihat = {}, gagal = '', tebakan = /[?&]paged=\d+/;
  while (berikut && n < HALAMAN_ARSIP_PER_PUTARAN && Date.now() < batas - (CONFIG.CADANGAN_HALAMAN_MS || 75000)) {
    if (lihat[berikut]) { berikut = ''; break; }
    lihat[berikut] = 1;
    var rr;
    try { rr = ambilFeed_(berikut); } catch (e) { gagal = pesanError_(e); break; }
    if (rr.kode >= 400) {
      if (tebakan.test(berikut)) berikut = '';                     // WordPress ?paged melewati halaman terakhir → 404 = habis
      else gagal = 'HTTP ' + rr.kode;
      break;
    }
    var ff;
    try { ff = bacaFeed_(rr.teks, berikut, halamanKe_(berikut)); } catch (e) {
      if (tebakan.test(berikut)) berikut = ''; else gagal = pesanError_(e);
      break;
    }
    if (!ff.items.length) { berikut = ''; break; }
    var sebelum = h.baru + h.ubah;
    if (!proses(ff.items)) break;                                   // waktu habis di tengah halaman → lanjut dari halaman ini
    diambil += ff.items.length;
    berikut = ff.berikut;
    n++;
    if (ff.wpTebak && h.baru + h.ubah === sebelum && ff.items.every(function (it) { return ta.ambil(idFeed_(k, it)); })) {
      // halaman tebakan WordPress yang isinya sudah semua ada → anggap arsip habis
      berikut = '';
    }
    if (kemajuan) kemajuan(berikut || 'selesai');                   // simpan kemajuan tiap halaman
  }
  h.arsipLanjut = berikut || '';
  h.arsipGagal = !!gagal;
  h.arsip = gagal ? 'arsip berhenti (' + gagal + '), dicoba lagi pada sinkron berikutnya' :
    berikut ? 'arsip: ' + n + ' halaman lagi terbaca, berlanjut' : (n ? 'arsip lama selesai (' + diambil + ' tulisan diperiksa)' : '');
  if (f.total) h.arsip = (h.arsip ? h.arsip + ' · ' : '') + jumlahArtikelFeed_(ta, k) + ' dari ' + f.total + ' tulisan sudah masuk';
  return h;
}

function jumlahArtikelFeed_(ta, k) {
  return ta.objek().filter(function (a) { return a.kontributor === k.slug && a.sumber === 'feed'; }).length;
}

/** true bila teks berupa halaman HTML (bukan RSS/Atom/JSON Feed). */
function halamanHtml_(teks) {
  var s = String(teks || '').replace(/^\uFEFF/, '').trim().slice(0, 600).toLowerCase();
  return /^<!doctype html|^<html|<head[\s>]|<body[\s>]/.test(s) && !/<rss[\s>]|<feed[\s>]/.test(s);
}

/**
 * Cari feed dari halaman situs: <link rel="alternate" type="application/rss+xml|atom+xml|feed+json">,
 * lalu alamat umum (WordPress /feed/, Blogger /feeds/posts/default, /rss.xml, /feed.xml, /atom.xml, /index.xml).
 * Mengembalikan {url, kode, teks} atau null.
 */
function temukanFeed_(url, html) {
  var calon = [];
  var re = /<link\b[^>]*>/gi, m;
  while ((m = re.exec(String(html || '')))) {
    var tag = m[0];
    if (!/rel=["']?alternate/i.test(tag) || !/type=["']?application\/(rss\+xml|atom\+xml|feed\+json|json)/i.test(tag)) continue;
    if (/comments/i.test(tag)) continue;                                   // lewati feed komentar
    var href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    if (href) calon.push(href.replace(/&amp;/g, '&'));
  }
  var akar = String(url).replace(/[?#].*$/, '').replace(/\/+$/, '');
  var asal = (akar.match(/^https?:\/\/[^/]+/) || [''])[0];
  ['/feed/', '/feeds/posts/default', '/rss.xml', '/feed.xml', '/atom.xml', '/index.xml'].forEach(function (p) {
    calon.push(akar + p);
    if (asal && asal !== akar) calon.push(asal + p);
  });
  var dicoba = {};
  for (var i = 0; i < calon.length && i < 14; i++) {
    var u = calon[i];
    if (!/^https?:/i.test(u)) u = asal + (u.charAt(0) === '/' ? '' : '/') + u;
    if (dicoba[u]) continue;
    dicoba[u] = 1;
    try {
      var r = ambilFeed_(u);
      if (r.kode < 400 && r.teks && !halamanHtml_(r.teks)) {
        var f = bacaFeed_(r.teks, u, 1);
        if (f.items.length) return { url: u, kode: r.kode, teks: r.teks };
      }
    } catch (e) { /* calon berikutnya */ }
  }
  return null;
}

function idFeed_(k, it) { return 'r_' + md5_(k.slug + '|' + (it.guid || it.url || it.judul)).slice(0, 16); }

function halamanKe_(url) {
  var m = String(url).match(/[?&]paged=(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** Item + tautan halaman berikutnya dari satu halaman feed. */
function bacaFeed_(teks, url, ke) {
  var s = String(teks || '').replace(/^\uFEFF/, '').trim();
  var out = { items: [], berikut: '', wpTebak: false };
  if (s.charAt(0) === '{') {
    var j = JSON.parse(s);
    out.items = parseJsonFeed_(j);
    out.berikut = j.next_url || '';
    return out;
  }
  if (halamanHtml_(s)) throw new Error('Alamat ini halaman web, bukan feed.');
  var root;
  try { root = XmlService.parse(s).getRootElement(); }
  catch (e) { throw new Error('Isi feed tidak bisa dibaca (bukan RSS/Atom yang valid).'); }
  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var cariNext = function (el, ns) {
    var href = '';
    (ns ? el.getChildren('link', ns) : el.getChildren('link')).forEach(function (l) { if (!href && atribut_(l, 'rel') === 'next') href = atribut_(l, 'href'); });
    return href;
  };
  if (root.getName() === 'rss') {
    out.items = parseRss_(root);
    var ch = root.getChild('channel');
    out.berikut = ch ? cariNext(ch, atom) : '';
    out.total = ch ? totalFeed_(ch) : 0;
    var gen = ch ? teksAnak_(ch, 'generator') : '';
    if (!out.berikut && out.items.length && (/wordpress/i.test(gen) || /\/feed\/?(\?|$)/.test(url))) {
      // WordPress: halaman arsip lewat ?paged=N
      var ke2 = (ke || halamanKe_(url) || 1) + 1;
      out.berikut = /[?&]paged=\d+/.test(url) ? url.replace(/([?&]paged=)\d+/, '$1' + ke2) : url + (url.indexOf('?') >= 0 ? '&' : '?') + 'paged=' + ke2;
      out.wpTebak = true;
    }
  } else if (root.getName() === 'feed') {
    out.items = parseAtom_(root);
    out.berikut = cariNext(root, atom);
    out.total = totalFeed_(root);
  } else {
    throw new Error('Format feed tidak dikenali (didukung: RSS 2.0, Atom, JSON Feed).');
  }
  return out;
}

/** Jumlah seluruh tulisan menurut feed (openSearch:totalResults, mis. Blogger); 0 bila tidak ada. */
function totalFeed_(el) {
  var t = 0;
  el.getChildren().forEach(function (c) { if (!t && c.getName() === 'totalResults') t = Number(c.getText()) || 0; });
  return t;
}

function prosesItemFeed_(it, k, ta, kat, h) {
    if (!it.judul) return;
    var id = idFeed_(k, it);
    var html = absolutkan_(bersihkanHtml_(it.konten || ''), it.url || k.website);
    var hash = 'h' + md5_(it.judul + '|' + html).slice(0, 16);
    var lama = ta.ambil(id);
    if (lama && lama.hash === hash) return;
    var fileId = simpanFileCache_(id + '.html', html, hash, lama && lama.konten_file);
    ta.set(hanyaBaru_({
      id: id,
      judul: potong_(bersihJudul_(it.judul), 200),
      slug: lama ? lama.slug : slugUnik_(bersihJudul_(it.judul), ta),
      status_kurasi: lama ? lama.status_kurasi : 'Belum dikurasi',
      kategori: (lama && lama.kategori) || cocokKategori_(it.kategori, kat) || k.kategori_default || '',
      status: lama ? lama.status : (k.status_artikel_baru || CONFIG.ARTIKEL_KONTRIBUTOR_STATUS_DEFAULT),
      sumber: 'feed',
      url_asli: it.url || '',
      kontributor: k.slug,
      penulis: it.penulis || k.nama,
      ringkasan: it.ringkasan || ringkasDariHtml_(html),
      sampul: it.sampul || gambarPertama_(html),
      tanggal: (lama && lama.tanggal) || it.tanggal || new Date(),
      diperbarui: new Date(),
      konten_file: fileId,
      hash: hash
    }, lama));
    if (lama) h.ubah++; else h.baru++;
}

/**
 * Kolom yang diatur admin (status, kurasi, slug, kategori, tanggal) hanya diisi untuk tulisan baru.
 * Untuk tulisan yang sudah ada, kolom itu tidak ikut ditulis, jadi perubahan admin selama sinkron tidak tertimpa.
 */
function hanyaBaru_(obj, lama) {
  if (lama) ['slug', 'status_kurasi', 'status', 'kategori', 'tanggal'].forEach(function (c) {
    if (lama[c] !== '' && lama[c] !== null && lama[c] !== undefined) delete obj[c];
  });
  return obj;
}

function parseFeed_(teks) { return bacaFeed_(teks, '', 1).items; }

function teksAnak_(el, nama, ns) {
  var c = ns ? el.getChild(nama, ns) : el.getChild(nama);
  return c ? c.getText().trim() : '';
}
function atribut_(el, nama) {
  var a = el && el.getAttribute(nama);
  return a ? a.getValue() : '';
}
function tglFeed_(s) {
  if (!s) return '';
  var d = new Date(s);
  return isNaN(d.getTime()) ? '' : d;
}

function parseRss_(root) {
  var ch = root.getChild('channel');
  if (!ch) return [];
  var NS = {
    content: XmlService.getNamespace('content', 'http://purl.org/rss/1.0/modules/content/'),
    media: XmlService.getNamespace('media', 'http://search.yahoo.com/mrss/'),
    dc: XmlService.getNamespace('dc', 'http://purl.org/dc/elements/1.1/')
  };
  return ch.getChildren('item').map(function (it) {
    var konten = teksAnak_(it, 'encoded', NS.content) || teksAnak_(it, 'description');
    var link = teksAnak_(it, 'link');
    var sampul = '';
    var enc = it.getChild('enclosure');
    if (enc && /^image\//i.test(atribut_(enc, 'type'))) sampul = atribut_(enc, 'url');
    var mc = it.getChild('content', NS.media) || it.getChild('thumbnail', NS.media);
    if (!sampul && mc) sampul = atribut_(mc, 'url');
    return {
      guid: teksAnak_(it, 'guid') || link,
      judul: teksAnak_(it, 'title'),
      url: link,
      tanggal: tglFeed_(teksAnak_(it, 'pubDate') || teksAnak_(it, 'date', NS.dc)),
      konten: konten,
      ringkasan: ringkasDariHtml_(teksAnak_(it, 'description') || konten),
      sampul: sampul || gambarPertama_(konten),
      kategori: it.getChildren('category').map(function (c) { return c.getText().trim(); }),
      penulis: teksAnak_(it, 'creator', NS.dc)
    };
  });
}

function parseAtom_(root) {
  var ns = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  return root.getChildren('entry', ns).map(function (e) {
    var link = '';
    e.getChildren('link', ns).forEach(function (l) {
      var rel = atribut_(l, 'rel');
      if (!link && (!rel || rel === 'alternate')) link = atribut_(l, 'href');
    });
    var kEl = e.getChild('content', ns) || e.getChild('summary', ns);
    var konten = '';
    if (kEl) {
      konten = atribut_(kEl, 'type') === 'xhtml'
        ? kEl.getChildren().map(function (c) { return XmlService.getRawFormat().format(c); }).join('')
        : kEl.getText();
    }
    var author = e.getChild('author', ns);
    return {
      guid: teksAnak_(e, 'id', ns) || link,
      judul: teksAnak_(e, 'title', ns),
      url: link,
      tanggal: tglFeed_(teksAnak_(e, 'published', ns) || teksAnak_(e, 'updated', ns)),
      konten: konten,
      ringkasan: ringkasDariHtml_(teksAnak_(e, 'summary', ns) || konten),
      sampul: gambarPertama_(konten),
      kategori: e.getChildren('category', ns).map(function (c) { return atribut_(c, 'term'); }),
      penulis: author ? teksAnak_(author, 'name', ns) : ''
    };
  });
}

function parseJsonFeed_(j) {
  return (j.items || []).map(function (it) {
    var html = it.content_html || (it.content_text ? '<p>' + esc_(it.content_text).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>' : '');
    var penulis = (it.authors && it.authors[0] && it.authors[0].name) || (it.author && it.author.name) || '';
    return {
      guid: String(it.id || it.url || ''),
      judul: it.title || '',
      url: it.url || it.external_url || '',
      tanggal: tglFeed_(it.date_published || it.date_modified),
      konten: html,
      ringkasan: it.summary || ringkasDariHtml_(html),
      sampul: it.image || it.banner_image || gambarPertama_(html),
      kategori: it.tags || [],
      penulis: penulis
    };
  });
}
