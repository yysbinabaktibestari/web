/**
 * MODUL VIDEO: katalog video YouTube per kategori.
 * ------------------------------------------------------------------
 * Dua cara mengisi:
 *   1. Manual: Admin › Video › + Tambah, cukup tempel URL YouTube
 *      (judul & nama kanal terisi otomatis).
 *   2. Otomatis: Admin › Sumber video, isi URL kanal (@nama / channel/UC…)
 *      atau playlist. Video baru ditarik tiap jam lewat feed RSS YouTube
 *      (tanpa API key). Feed YouTube hanya memuat ±15 video terbaru per sumber;
 *      video lama tambahkan manual bila perlu.
 */
var MODUL = MODUL || {};

MODUL.video = {
  judul: 'Video',
  urutan: 35,

  sheets: [
    {
      nama: 'Video',
      judul: 'Katalog video',
      keterangan: 'Tempel URL YouTube saja: judul & kanal terisi otomatis saat disimpan.',
      urut: { k: 'tanggal', arah: 'desc' },
      filterCepat: [
        { label: 'Tayang', k: 'status', v: 'Tayang' },
        { label: 'Tidak tayang', k: 'status', v: 'Tidak tayang' },
        { label: 'Unggulan', k: 'unggulan', v: 'true' }
      ],
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'url', l: 'URL YouTube', t: 'url', wajib: true },
        { k: 'judul', l: 'Judul', t: 'text', bantuan: 'Kosongkan untuk diambil otomatis dari YouTube' },
        { k: 'kategori', l: 'Kategori', t: 'ref', ref: { sheet: 'KategoriVideo', nilai: 'slug', label: 'nama' } },
        { k: 'pemateri', l: 'Pemateri / pembicara', t: 'text' },
        { k: 'status', l: 'Status', t: 'select', opsi: ['Tayang', 'Tidak tayang'], bawaan: 'Tayang' },
        { k: 'unggulan', l: 'Unggulan', t: 'bool', bawaan: false, bantuan: 'Tampil paling depan di beranda & katalog' },
        { k: 'tanggal', l: 'Tanggal', t: 'datetime' },
        { k: 'deskripsi', l: 'Deskripsi', t: 'textarea', daftar: false },
        { k: 'kanal', l: 'Kanal YouTube', t: 'text', daftar: false },
        { k: 'video_id', l: 'ID video', t: 'text', ro: true, daftar: false },
        { k: 'sumber', l: 'Sumber', t: 'text', ro: true, daftar: false }
      ]
    },
    {
      nama: 'KategoriVideo',
      judul: 'Kategori video',
      kunci: 'slug',
      kolom: [
        { k: 'slug', l: 'Slug', t: 'text', bantuan: 'Kosongkan untuk dibuat dari nama' },
        { k: 'nama', l: 'Nama', t: 'text', wajib: true },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10 }
      ],
      isiAwal: [
        { slug: 'kajian', nama: 'Kajian', urutan: 1 },
        { slug: 'kegiatan', nama: 'Kegiatan', urutan: 2 }
      ]
    },
    {
      nama: 'SumberVideo',
      judul: 'Sumber video otomatis',
      keterangan: 'URL kanal (https://www.youtube.com/@nama atau /channel/UC…) atau playlist (…list=PL…). Disinkron tiap jam.',
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'nama', l: 'Nama', t: 'text', wajib: true },
        { k: 'url', l: 'URL kanal / playlist', t: 'url', wajib: true },
        { k: 'kategori', l: 'Kategori video', t: 'ref', ref: { sheet: 'KategoriVideo', nilai: 'slug', label: 'nama' } },
        { k: 'pemateri', l: 'Pemateri bawaan', t: 'text', daftar: false },
        { k: 'saring', l: 'Hanya judul yang memuat', t: 'text', daftar: false, bantuan: 'Opsional, mis. "kajian" — pisahkan beberapa kata dengan koma' },
        { k: 'status_baru', l: 'Status video baru', t: 'select', opsi: ['Tayang', 'Tidak tayang'], bawaan: 'Tayang' },
        { k: 'aktif', l: 'Aktif', t: 'bool', bawaan: true },
        { k: 'feed_id', l: 'ID kanal/playlist', t: 'text', ro: true, daftar: false },
        { k: 'terakhir_sinkron', l: 'Terakhir sinkron', t: 'datetime', ro: true },
        { k: 'catatan_sinkron', l: 'Hasil', t: 'text', ro: true }
      ]
    }
  ],

  publik: {
    video: function (p) {
      var semua = videoTayang_();
      var q = String(p.q || '').toLowerCase().trim();
      var per = Math.min(Math.max(Number(p.per) || 12, 1), 48), hal = Math.max(Number(p.halaman) || 1, 1);
      var list = semua.filter(function (v) {
        if (p.kategori && v.kategori !== p.kategori) return false;
        if (q && (v.judul + ' ' + v.pemateri + ' ' + v.kanal).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      return {
        items: list.slice((hal - 1) * per, hal * per), total: list.length, halaman: hal,
        jumlahHalaman: Math.max(1, Math.ceil(list.length / per))
      };
    },
    video_detail: function (p) {
      var semua = videoTayang_();
      var v = semua.filter(function (x) { return x.id === p.id; })[0];
      if (!v) throw new Error('Video tidak ditemukan.');
      var out = JSON.parse(JSON.stringify(v));
      out.terkait = semua.filter(function (x) { return x.id !== v.id && x.kategori === v.kategori; }).slice(0, 6);
      return out;
    }
  },

  bootstrap: function () {
    return { kategoriVideo: bacaTabel_('KategoriVideo').sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); })
      .map(function (k) { return { slug: k.slug, nama: k.nama }; }) };
  },

  beranda: function () { return { video: videoTayang_().slice(0, 4) }; },

  tugasPerJam: function () { sinkronVideo_(null); },

  sebelumSimpan: function (nama, obj, lama) {
    if (nama !== 'Video') return;
    var url = obj.url || (lama && lama.url);
    var vid = idYoutube_(url);
    if (!vid) throw new Error('URL YouTube tidak dikenali. Contoh: https://www.youtube.com/watch?v=xxxxxxxxxxx');
    obj.video_id = vid;
    if (!lama) obj.sumber = obj.sumber || 'manual';
    var judul = obj.hasOwnProperty('judul') ? obj.judul : (lama && lama.judul);
    if (!judul || !(obj.kanal || (lama && lama.kanal))) {
      var info = oembedYoutube_(vid);
      if (!judul) obj.judul = info.judul || 'Video ' + vid;
      if (!(obj.kanal || (lama && lama.kanal))) obj.kanal = info.kanal;
    }
    if (!obj.tanggal && !(lama && lama.tanggal)) obj.tanggal = new Date();
  },

  alat: [
    {
      id: 'sinkron_video', sheet: 'SumberVideo', label: 'Sinkron sekarang', gaya: 'utama',
      run: function (ids) { var h = sinkronVideo_(ids && ids.length ? ids : null); return { pesan: h.ringkas, tabel: h.detail }; }
    },
    {
      id: 'tayangkan_v', sheet: 'Video', label: 'Tayangkan', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Video', ids, 'status', 'Tayang') + ' video ditayangkan.' }; }
    },
    {
      id: 'sembunyikan_v', sheet: 'Video', label: 'Tidak tayang', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Video', ids, 'status', 'Tidak tayang') + ' video disembunyikan.' }; }
    }
  ]
};

/* ================================================================
 * Helper video
 * ============================================================== */

function videoTayang_() {
  return dariCache_('videoTayang', CONFIG.CACHE_DETIK, function () {
    var kat = {};
    bacaTabel_('KategoriVideo').forEach(function (k) { kat[k.slug] = k.nama; });
    return bacaTabel_('Video').filter(function (v) { return v.status !== 'Tidak tayang' && v.video_id; })
      .sort(function (a, b) {
        if (!!b.unggulan !== !!a.unggulan) return b.unggulan ? 1 : -1;
        return String(b.tanggal).localeCompare(String(a.tanggal));
      })
      .map(function (v) {
        return { id: v.id, video_id: v.video_id, judul: v.judul, kategori: v.kategori, kategori_nama: kat[v.kategori] || '',
          pemateri: v.pemateri, kanal: v.kanal, tanggal: v.tanggal, deskripsi: v.deskripsi, unggulan: !!v.unggulan };
      });
  });
}

function idYoutube_(url) {
  var s = String(url || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  var m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : '';
}

function oembedYoutube_(vid) {
  try {
    var r = UrlFetchApp.fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + vid), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return { judul: '', kanal: '' };
    var j = JSON.parse(r.getContentText());
    return { judul: j.title || '', kanal: j.author_name || '' };
  } catch (e) { return { judul: '', kanal: '' }; }
}

/** URL kanal/playlist → URL feed RSS YouTube. */
function feedYoutube_(src) {
  var url = String(src.url || '');
  var pl = url.match(/[?&]list=([\w-]+)/);
  if (pl) return { id: pl[1], feed: 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + pl[1] };
  var ch = url.match(/\/channel\/(UC[\w-]{22})/) || String(src.feed_id || '').match(/^(UC[\w-]{22})$/);
  if (!ch) {
    // @handle, /c/nama, /user/nama → baca halaman kanal untuk mencari ID UC…
    var html = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true,
      headers: { 'Accept-Language': 'id,en;q=0.8', 'User-Agent': 'Mozilla/5.0' } }).getContentText();
    ch = html.match(/feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/) || html.match(/"(?:channelId|externalId|browseId)":"(UC[\w-]{22})"/);
  }
  if (!ch) throw new Error('ID kanal tidak ditemukan. Pakai URL berbentuk youtube.com/channel/UC… atau playlist.');
  return { id: ch[1], feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=' + ch[1] };
}

function sinkronVideo_(ids) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ringkas: 'Sinkron lain sedang berjalan.', detail: [] };
  var detail = [];
  try {
    var ts = new Tabel_('SumberVideo'), tv = new Tabel_('Video');
    var ada = {};
    tv.objek().forEach(function (v) { if (v.video_id) ada[v.video_id] = 1; });
    ts.objek().filter(function (s) { return s.url && s.aktif !== false && (!ids || ids.indexOf(s.id) >= 0); }).forEach(function (s) {
      var catatan;
      try {
        var f = feedYoutube_(s);
        var res = UrlFetchApp.fetch(f.feed, { muteHttpExceptions: true });
        if (res.getResponseCode() !== 200) throw new Error('Feed YouTube tidak bisa diambil (HTTP ' + res.getResponseCode() + ').');
        var items = parseFeedYoutube_(res.getContentText());
        var saring = String(s.saring || '').toLowerCase().split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        var baru = 0;
        items.forEach(function (it) {
          if (!it.video_id || ada[it.video_id]) return;
          if (saring.length && !saring.some(function (w) { return it.judul.toLowerCase().indexOf(w) >= 0; })) return;
          tv.set({ url: 'https://www.youtube.com/watch?v=' + it.video_id, video_id: it.video_id, judul: it.judul,
            kategori: s.kategori || '', pemateri: s.pemateri || '', status: s.status_baru || 'Tayang', unggulan: false,
            tanggal: it.tanggal || new Date(), deskripsi: potong_(it.deskripsi, 1500), kanal: it.kanal, sumber: s.nama });
          ada[it.video_id] = 1;
          baru++;
        });
        ts.set({ id: s.id, feed_id: f.id });
        catatan = 'OK · ' + baru + ' video baru';
      } catch (e) {
        catatan = 'Gagal: ' + pesanError_(e);
      }
      ts.set({ id: s.id, terakhir_sinkron: new Date(), catatan_sinkron: catatan });
      detail.push({ sumber: s.nama, hasil: catatan });
    });
    tv.simpan();
    ts.simpan();
    naikkanVersiCache();
  } finally {
    lock.releaseLock();
  }
  return { ringkas: detail.length ? 'Sinkron selesai untuk ' + detail.length + ' sumber.' : 'Belum ada sumber video aktif.', detail: detail };
}

function parseFeedYoutube_(xml) {
  var root = XmlService.parse(xml).getRootElement();
  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var yt = XmlService.getNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');
  var media = XmlService.getNamespace('media', 'http://search.yahoo.com/mrss/');
  return root.getChildren('entry', atom).map(function (e) {
    var g = e.getChild('group', media);
    var author = e.getChild('author', atom);
    return {
      video_id: teksAnak_(e, 'videoId', yt),
      judul: teksAnak_(e, 'title', atom),
      tanggal: tglFeed_(teksAnak_(e, 'published', atom)),
      deskripsi: g ? teksAnak_(g, 'description', media) : '',
      kanal: author ? teksAnak_(author, 'name', atom) : ''
    };
  });
}
