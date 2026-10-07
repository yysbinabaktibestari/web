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
        { k: 'terdaftar', l: 'Terdaftar', t: 'datetime', ro: true, daftar: false }
      ]
    }
  ],

  publik: {
    kontributor: function () {
      var jumlah = {};
      artikelTayang_().forEach(function (a) { if (a.kontributor) jumlah[a.kontributor.slug] = (jumlah[a.kontributor.slug] || 0) + 1; });
      return publikSaja_('Kontributor', bacaTabel('Kontributor'))
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
      var lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        var tb = new Tabel('Kontributor');
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
        lock.releaseLock();
      }
      naikkanVersiCache();
      return { pesan: 'Pendaftaran diterima. Artikel Anda mulai tampil setelah sinkronisasi berikutnya (paling lama ±1 jam).' };
    }
  },

  beranda: function () {
    return { kontributor: MODUL.kontributor.publik.kontributor().slice(0, 6) };
  },

  /** Dipanggil trigger per jam (lihat 99_Setup.gs). */
  tugasPerJam: function () { sinkronSemua(); },

  sebelumSimpan: function (nama, obj, lama) {
    if (nama !== 'Kontributor') return;
    if (obj.sumber_url && !obj.sumber_tipe) obj.sumber_tipe = jenisSumber_(obj.sumber_url);
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
  var k = publikSaja_('Kontributor', bacaTabel('Kontributor'))
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
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ringkas: 'Sinkron lain sedang berjalan. Coba beberapa menit lagi.', detail: [] };
  var detail = [];
  try {
    var mulai = Date.now();
    var tk = new Tabel('Kontributor'), ta = new Tabel('Artikel');
    var daftar = tk.objek().filter(function (k) {
      return k.sumber_url && (!ids || ids.indexOf(k.id) >= 0);
    }).sort(function (a, b) { return String(a.terakhir_sinkron).localeCompare(String(b.terakhir_sinkron)); });
    var kat = petaKategori_();
    for (var i = 0; i < daftar.length; i++) {
      if (Date.now() - mulai > CONFIG.BATAS_WAKTU_MS) {
        detail.push({ kontributor: '(sisanya)', hasil: 'Dilanjutkan pada sinkron berikutnya (batas waktu).' });
        break;
      }
      var k = daftar[i], catatan;
      try {
        var batas = mulai + CONFIG.BATAS_WAKTU_MS;
        var h = k.sumber_tipe === 'feed' ? sinkronFeed_(k, ta, kat) : sinkronFolder_(k, ta, kat, batas);
        catatan = 'OK · ' + h.baru + ' baru, ' + h.ubah + ' diperbarui' + (h.hilang ? ', ' + h.hilang + ' disembunyikan' : '') + (h.tertunda ? ', ' + h.tertunda + ' menyusul' : '');
      } catch (e) {
        catatan = 'Gagal: ' + pesanError_(e);
      }
      tk.set({ id: k.id, terakhir_sinkron: new Date(), catatan_sinkron: catatan });
      detail.push({ kontributor: k.nama, hasil: catatan });
    }
    ta.simpan();
    tk.simpan();
    naikkanVersiCache();
  } finally {
    lock.releaseLock();
  }
  return { ringkas: detail.length ? 'Sinkron selesai untuk ' + detail.length + ' kontributor.' : 'Tidak ada kontributor dengan sumber.', detail: detail };
}

/** Fungsi untuk trigger per jam. */
function sinkronSemua() { return sinkronKontributor_(null); }

function petaKategori_() {
  var m = {};
  bacaTabel('Kategori').forEach(function (k) {
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
  kumpulkanDoc_(folder, '', docs, 0);
  var h = { baru: 0, ubah: 0, hilang: 0, tertunda: 0 }, terlihat = {};
  docs.forEach(function (d) {
    var id = 'f_' + d.file.getId();
    terlihat[id] = 1;
    var lama = ta.ambil(id);
    var upd = d.file.getLastUpdated();
    var updDetik = Math.floor(upd.getTime() / 1000) * 1000; // sheet tidak menyimpan milidetik
    if (lama && lama.diperbarui && new Date(lama.diperbarui).getTime() >= updDetik) return;
    if (Date.now() > batas) { h.tertunda++; return; }
    var isi = htmlDoc_(d.file.getId());
    ta.set({
      id: id,
      judul: d.file.getName().replace(/\.(docx?|gdoc)$/i, ''),
      slug: lama ? lama.slug : slugUnik_(d.file.getName(), ta),
      kategori: (lama && lama.kategori) || kat[d.sub.toLowerCase()] || k.kategori_default || '',
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
    });
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

function kumpulkanDoc_(folder, sub, out, kedalaman) {
  var it = folder.getFilesByType(MimeType.GOOGLE_DOCS);
  while (it.hasNext()) out.push({ file: it.next(), sub: sub });
  if (kedalaman >= 1) return;
  var fs = folder.getFolders();
  while (fs.hasNext()) {
    var f = fs.next();
    kumpulkanDoc_(f, f.getName(), out, kedalaman + 1);
  }
}

/* ---------- Sumber: feed RSS / Atom / JSON Feed ---------- */

function sinkronFeed_(k, ta, kat) {
  var res = UrlFetchApp.fetch(k.sumber_url, {
    muteHttpExceptions: true, followRedirects: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YayasanMirror/1.0)' }
  });
  if (res.getResponseCode() >= 400) throw new Error('Feed tidak bisa diambil (HTTP ' + res.getResponseCode() + ').');
  var items = parseFeed_(res.getContentText());
  var h = { baru: 0, ubah: 0, hilang: 0, tertunda: 0 };
  items.forEach(function (it) {
    if (!it.judul) return;
    var id = 'r_' + md5_(k.slug + '|' + (it.guid || it.url || it.judul)).slice(0, 16);
    var html = absolutkan_(bersihkanHtml_(it.konten || ''), it.url || k.website);
    var hash = 'h' + md5_(it.judul + '|' + html).slice(0, 16);
    var lama = ta.ambil(id);
    if (lama && lama.hash === hash) return;
    var fileId = simpanFileCache_(id + '.html', html, hash);
    ta.set({
      id: id,
      judul: potong_(it.judul, 200),
      slug: lama ? lama.slug : slugUnik_(it.judul, ta),
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
    });
    if (lama) h.ubah++; else h.baru++;
  });
  return h;
}

function parseFeed_(teks) {
  var s = String(teks || '').replace(/^﻿/, '').trim();
  if (s.charAt(0) === '{') return parseJsonFeed_(JSON.parse(s));
  var root = XmlService.parse(s).getRootElement();
  if (root.getName() === 'rss') return parseRss_(root);
  if (root.getName() === 'feed') return parseAtom_(root);
  throw new Error('Format feed tidak dikenali (didukung: RSS 2.0, Atom, JSON Feed).');
}

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
