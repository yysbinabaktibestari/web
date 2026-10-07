/**
 * MODUL ARTIKEL: kategori, artikel dari Google Docs (internal & kontributor)
 * maupun dari feed website kontributor.
 *
 * Status artikel:
 *   Draf          → belum tampil (bawaan untuk Doc yang dibuat dari admin)
 *   Tayang        → tampil di website & feed
 *   Tidak tayang  → disembunyikan (bawaan bisa diatur per kontributor)
 */
var MODUL = MODUL || {};

MODUL.artikel = {
  judul: 'Artikel',
  urutan: 10,

  sheets: [
    {
      nama: 'Artikel',
      judul: 'Artikel',
      keterangan: 'Artikel internal ditulis di Google Doc (tombol "Buat Google Doc"). Artikel kontributor terisi otomatis saat sinkron.',
      urut: { k: 'tanggal', arah: 'desc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'judul', l: 'Judul', t: 'text', wajib: true },
        { k: 'slug', l: 'Slug URL', t: 'text', daftar: false, bantuan: 'Kosongkan untuk dibuat otomatis dari judul' },
        { k: 'kategori', l: 'Kategori', t: 'ref', ref: { sheet: 'Kategori', nilai: 'slug', label: 'nama' } },
        { k: 'status', l: 'Status', t: 'select', opsi: ['Draf', 'Tayang', 'Tidak tayang'], bawaan: 'Draf' },
        { k: 'sumber', l: 'Sumber', t: 'select', opsi: ['internal', 'folder', 'feed'], bawaan: 'internal' },
        { k: 'doc_url', l: 'Google Doc', t: 'url', daftar: false },
        { k: 'url_asli', l: 'URL asli (situs kontributor)', t: 'url', daftar: false },
        { k: 'kontributor', l: 'Kontributor', t: 'ref', ref: { sheet: 'Kontributor', nilai: 'slug', label: 'nama' } },
        { k: 'penulis', l: 'Penulis', t: 'text' },
        { k: 'ringkasan', l: 'Ringkasan', t: 'textarea', daftar: false, bantuan: 'Kosongkan untuk diambil dari paragraf pertama' },
        { k: 'sampul', l: 'Gambar sampul (URL)', t: 'image', daftar: false, bantuan: 'Kosongkan untuk memakai gambar pertama di Doc' },
        { k: 'tanggal', l: 'Tanggal tayang', t: 'datetime', bantuan: 'Tanggal di masa depan = terjadwal' },
        { k: 'diperbarui', l: 'Diperbarui', t: 'datetime', ro: true, daftar: false },
        { k: 'disematkan', l: 'Disematkan', t: 'bool', bawaan: false },
        { k: 'sematkan_sampai', l: 'Sematkan sampai', t: 'date', daftar: false },
        { k: 'konten_file', l: 'File konten (sistem)', t: 'text', ro: true, daftar: false, privat: true },
        { k: 'hash', l: 'Hash (sistem)', t: 'text', ro: true, daftar: false, privat: true }
      ]
    },
    {
      nama: 'Kategori',
      judul: 'Kategori artikel',
      kunci: 'slug',
      kolom: [
        { k: 'slug', l: 'Slug', t: 'text', bantuan: 'Kosongkan untuk dibuat dari nama' },
        { k: 'nama', l: 'Nama', t: 'text', wajib: true },
        { k: 'warna', l: 'Warna label', t: 'select', opsi: ['biru', 'emas', 'karat', 'netral'], bawaan: 'biru' },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 }
      ],
      isiAwal: [
        { slug: 'pengumuman', nama: 'Pengumuman', warna: 'karat', urutan: 1 },
        { slug: 'pendidikan', nama: 'Pendidikan', warna: 'biru', urutan: 2 },
        { slug: 'sosial', nama: 'Sosial', warna: 'emas', urutan: 3 },
        { slug: 'kegiatan', nama: 'Kegiatan', warna: 'karat', urutan: 4 },
        { slug: 'opini', nama: 'Opini', warna: 'netral', urutan: 5 }
      ]
    }
  ],

  publik: {
    artikel: function (p) {
      var semua = artikelTayang_();
      var kat = p.kategori || '', kon = p.kontributor || '', q = String(p.q || '').toLowerCase().trim();
      var per = Math.min(Math.max(Number(p.per) || 12, 1), 50);
      var hal = Math.max(Number(p.halaman) || 1, 1);
      var list = semua.filter(function (a) {
        if (kat && a.kategori !== kat) return false;
        if (kon && (!a.kontributor || a.kontributor.slug !== kon)) return false;
        if (q && (a.judul + ' ' + a.ringkasan + ' ' + a.penulis).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      var disematkan = [];
      if (!kat && !kon && !q && hal === 1) {
        disematkan = list.filter(sedangDisematkan_);
        list = list.filter(function (a) { return !sedangDisematkan_(a); });
      }
      return {
        items: list.slice((hal - 1) * per, hal * per).map(publikArtikel_),
        disematkan: disematkan.map(publikArtikel_),
        total: list.length,
        halaman: hal,
        jumlahHalaman: Math.max(1, Math.ceil(list.length / per))
      };
    },

    artikel_detail: function (p) {
      var semua = artikelTayang_();
      var a = semua.filter(function (x) { return x.slug === p.slug; })[0];
      if (!a) throw new Error('Artikel tidak ditemukan.');
      var html = kontenArtikel_(a);
      var teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      var out = publikArtikel_(a);
      out.konten = html;
      out.url_asli = a.url_asli || '';
      out.menit_baca = Math.max(1, Math.round((teks ? teks.split(' ').length : 0) / 200));
      out.terkait = semua.filter(function (x) { return x.id !== a.id && x.kategori === a.kategori; })
        .slice(0, 3).map(publikArtikel_);
      if (a.kontributor && modulAktif_('kontributor')) out.kontributor = profilKontributor_(a.kontributor.slug);
      return out;
    },

    kategori: function () { return daftarKategori_(true); }
  },

  bootstrap: function () {
    return { kategori: daftarKategori_(false) };
  },

  beranda: function () {
    var semua = artikelTayang_();
    var pg = CONFIG.KATEGORI_PENGUMUMAN;
    return {
      artikel: {
        disematkan: semua.filter(sedangDisematkan_).slice(0, 1).map(publikArtikel_),
        pengumuman: semua.filter(function (a) { return a.kategori === pg; }).slice(0, 3).map(publikArtikel_),
        terbaru: semua.filter(function (a) { return a.kategori !== pg; }).slice(0, 6).map(publikArtikel_)
      }
    };
  },

  sebelumSimpan: function (nama, obj, lama) {
    if (nama !== 'Artikel') return;
    if (!obj.sumber && !(lama && lama.sumber)) obj.sumber = 'internal';
    if (!obj.tanggal && !(lama && lama.tanggal)) obj.tanggal = new Date();
    var docUrl = obj.doc_url || (lama && lama.doc_url);
    var status = obj.status || (lama && lama.status);
    var ringkasan = obj.hasOwnProperty('ringkasan') ? obj.ringkasan : (lama && lama.ringkasan);
    var sampul = obj.hasOwnProperty('sampul') ? obj.sampul : (lama && lama.sampul);
    if (docUrl && status === STATUS.TAYANG && (!ringkasan || !sampul)) {
      try {
        var info = htmlDoc_(idDrive_(docUrl));
        if (!ringkasan) obj.ringkasan = info.ringkasan;
        if (!sampul) obj.sampul = info.sampul;
      } catch (e) { /* Doc tidak bisa dibuka: biarkan */ }
    }
  },

  alat: [
    {
      id: 'buat_doc', sheet: 'Artikel', label: 'Buat Google Doc', gaya: 'utama',
      input: [
        { k: 'judul', l: 'Judul artikel', t: 'text', wajib: true },
        { k: 'kategori', l: 'Kategori', t: 'ref', ref: { sheet: 'Kategori', nilai: 'slug', label: 'nama' } },
        { k: 'penulis', l: 'Penulis', t: 'text' }
      ],
      run: function (ids, input) {
        if (!input.judul) throw new Error('Judul wajib diisi.');
        var folder = folder_('FOLDER_DOCS');
        var file;
        if (CONFIG.TEMPLATE_DOC_ID) file = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID).makeCopy(input.judul, folder);
        else { file = DriveApp.getFileById(DocumentApp.create(input.judul).getId()); file.moveTo(folder); }
        var tb = new Tabel('Artikel');
        tb.set({
          judul: input.judul, slug: slugUnik_(input.judul, tb), kategori: input.kategori || '',
          status: STATUS.DRAF, sumber: 'internal', doc_url: file.getUrl(), penulis: input.penulis || '',
          tanggal: new Date()
        });
        tb.simpan();
        return { pesan: 'Google Doc dibuat dengan status Draf. Tulis artikelnya, lalu ubah status ke Tayang.', url: file.getUrl(), labelUrl: 'Buka Google Doc' };
      }
    },
    {
      id: 'tayangkan', sheet: 'Artikel', label: 'Tayangkan', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Artikel', ids, 'status', STATUS.TAYANG) + ' artikel ditayangkan.' }; }
    },
    {
      id: 'sembunyikan', sheet: 'Artikel', label: 'Tidak tayang', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Artikel', ids, 'status', STATUS.TIDAK) + ' artikel disembunyikan.' }; }
    },
    {
      id: 'sematkan', sheet: 'Artikel', label: 'Sematkan', perluPilih: true,
      input: [{ k: 'sampai', l: 'Sematkan sampai (kosong = tanpa batas)', t: 'date' }],
      run: function (ids, input) {
        var tb = new Tabel('Artikel');
        ids.forEach(function (k) { if (tb.ambil(k)) tb.set({ id: k, disematkan: true, sematkan_sampai: input.sampai || '' }); });
        tb.simpan();
        return { pesan: ids.length + ' artikel disematkan di atas daftar artikel.' };
      }
    },
    {
      id: 'lepas_sematan', sheet: 'Artikel', label: 'Lepas sematan', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Artikel', ids, 'disematkan', false) + ' sematan dilepas.' }; }
    },
    {
      id: 'segarkan', sheet: 'Artikel', label: 'Segarkan isi dari Doc', perluPilih: true,
      run: function (ids) {
        var tb = new Tabel('Artikel'), n = 0;
        ids.forEach(function (k) {
          var a = tb.ambil(k);
          if (!a || !a.doc_url) return;
          var docId = idDrive_(a.doc_url);
          var f = cariFileCache_(docId + '.json');
          if (f) f.setTrashed(true);
          var info = htmlDoc_(docId);
          tb.set({ id: k, ringkasan: info.ringkasan, sampul: info.sampul || a.sampul });
          n++;
        });
        tb.simpan();
        return { pesan: n + ' artikel diperbarui dari Google Doc.' };
      }
    }
  ]
};

/* ================================================================
 * Helper artikel
 * ============================================================== */

function modulAktif_(id) { return !!MODUL[id] && CONFIG.MODUL_NONAKTIF.indexOf(id) < 0; }

function daftarKategori_(denganJumlah) {
  var rows = bacaTabel('Kategori').sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); });
  var jumlah = {};
  if (denganJumlah) artikelTayang_().forEach(function (a) { jumlah[a.kategori] = (jumlah[a.kategori] || 0) + 1; });
  return rows.map(function (k) {
    var o = { slug: k.slug, nama: k.nama, warna: k.warna || 'biru' };
    if (denganJumlah) o.jumlah = jumlah[k.slug] || 0;
    return o;
  });
}

/** Semua artikel yang sedang tayang (sudah dicek status kontributor & jadwal), terbaru dulu. */
function artikelTayang_() {
  return dariCache_('artikelTayang', CONFIG.CACHE_DETIK, function () {
    var kon = {};
    if (modulAktif_('kontributor')) bacaTabel('Kontributor').forEach(function (k) { kon[k.slug] = k; });
    var kat = {};
    bacaTabel('Kategori').forEach(function (k) { kat[k.slug] = k; });
    var sekarang = Date.now();
    return bacaTabel('Artikel').filter(function (a) {
      if (a.status !== STATUS.TAYANG || !a.slug) return false;
      if (a.kontributor) {
        var k = kon[a.kontributor];
        if (!k || k.status !== STATUS.TAYANG) return false;
      }
      if (a.tanggal && new Date(a.tanggal).getTime() > sekarang) return false;
      return true;
    }).map(function (a) {
      var k = kat[a.kategori] || {};
      var ko = a.kontributor ? kon[a.kontributor] : null;
      return {
        id: a.id, judul: a.judul, slug: a.slug, kategori: a.kategori,
        kategori_nama: k.nama || '', warna: k.warna || 'netral',
        penulis: a.penulis || (ko ? ko.nama : ''),
        kontributor: ko ? { slug: ko.slug, nama: ko.nama, foto: ko.foto || '' } : null,
        ringkasan: a.ringkasan, sampul: a.sampul, tanggal: a.tanggal, diperbarui: a.diperbarui,
        sumber: a.sumber || 'internal', disematkan: a.disematkan, sematkan_sampai: a.sematkan_sampai,
        // internal (tidak dikirim ke publik)
        _doc: a.doc_url, _file: a.konten_file, url_asli: a.url_asli
      };
    }).sort(function (x, y) { return String(y.tanggal).localeCompare(String(x.tanggal)); });
  });
}

function sedangDisematkan_(a) {
  return a.disematkan && (!a.sematkan_sampai || a.sematkan_sampai >= hariIni_());
}

function publikArtikel_(a) {
  return {
    id: a.id, judul: a.judul, slug: a.slug, kategori: a.kategori, kategori_nama: a.kategori_nama,
    warna: a.warna, penulis: a.penulis, kontributor: a.kontributor, ringkasan: a.ringkasan,
    sampul: a.sampul, tanggal: a.tanggal, sumber: a.sumber, disematkan: sedangDisematkan_(a)
  };
}

/** HTML isi artikel (dari Google Doc, atau dari cache feed kontributor). */
function kontenArtikel_(a) {
  if (a.sumber === 'feed') return bacaFileCache_(a._file) || ('<p>' + esc_(a.ringkasan) + '</p>');
  var docId = idDrive_(a._doc);
  if (!docId) return '<p>' + esc_(a.ringkasan) + '</p>';
  return htmlDoc_(docId).html;
}
