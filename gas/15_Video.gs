/**
 * MODUL VIDEO: katalog YouTube per channel, playlist, dan kategori.
 * ------------------------------------------------------------------
 * Cara mengisi:
 *   1. Otomatis — Admin › Channel & playlist YouTube › + Tambah: tempel URL channel
 *      (youtube.com/@nama) atau playlist (…list=PL…). Nama & foto channel terisi sendiri.
 *      Video baru ditarik tiap jam; daftar playlist channel diperbarui sehari sekali.
 *        • Bila layanan "YouTube Data API" aktif di proyek Apps Script: SEMUA video
 *          channel (impor awal bertahap) + seluruh playlist channel beserta urutannya.
 *        • Tanpa itu (cadangan RSS): ±15 video terbaru per channel/playlist setiap sinkron,
 *          terkumpul dari waktu ke waktu. Playlist channel tidak terbaca otomatis —
 *          tambahkan URL playlist sebagai baris sendiri bila perlu.
 *   2. Manual — Admin › Katalog video › + Tambah: cukup tempel URL video.
 *
 * Kuota YouTube Data API: 10.000 unit/hari; sinkron per jam ±1 unit per channel.
 */
var MODUL = MODUL || {};

MODUL.video = {
  judul: 'Video',
  urutan: 35,

  sheets: [
    {
      nama: 'Video',
      judul: 'Katalog video',
      keterangan: 'Tempel URL YouTube saja: judul & channel terisi otomatis saat disimpan.',
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
        { k: 'kanal', l: 'Channel', t: 'text' },
        { k: 'deskripsi', l: 'Deskripsi', t: 'textarea', daftar: false },
        { k: 'kanal_id', l: 'ID channel', t: 'text', ro: true, daftar: false },
        { k: 'video_id', l: 'ID video', t: 'text', ro: true, daftar: false },
        { k: 'sumber', l: 'Sumber', t: 'text', ro: true, daftar: false }
      ]
    },
    {
      nama: 'SumberVideo',
      judul: 'Channel & playlist YouTube',
      keterangan: 'Tempel URL channel (youtube.com/@nama) atau playlist. Nama & foto terisi otomatis. ' +
        'Video baru ditarik tiap jam — setelah menambah, klik "Sinkron sekarang".',
      urut: { k: 'urutan', arah: 'asc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'url', l: 'URL channel / playlist', t: 'url', wajib: true },
        { k: 'nama', l: 'Nama tampil', t: 'text', bantuan: 'Kosongkan untuk memakai nama dari YouTube' },
        { k: 'jenis', l: 'Jenis', t: 'text', ro: true },
        { k: 'foto', l: 'Foto channel', t: 'image', daftar: false, bantuan: 'Otomatis dari YouTube; boleh diganti' },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 10, bantuan: 'Urutan di navigasi channel (kecil = depan)' },
        { k: 'kategori', l: 'Kategori video', t: 'ref', ref: { sheet: 'KategoriVideo', nilai: 'slug', label: 'nama' } },
        { k: 'pemateri', l: 'Pemateri bawaan', t: 'text', daftar: false },
        { k: 'saring', l: 'Hanya judul yang memuat', t: 'text', daftar: false, bantuan: 'Opsional, mis. "kajian" — pisahkan beberapa kata dengan koma' },
        { k: 'status_baru', l: 'Status video baru', t: 'select', opsi: ['Tayang', 'Tidak tayang'], bawaan: 'Tayang', daftar: false },
        { k: 'aktif', l: 'Aktif', t: 'bool', bawaan: true },
        { k: 'feed_id', l: 'ID channel/playlist', t: 'text', ro: true, daftar: false },
        { k: 'nama_yt', l: 'Nama di YouTube', t: 'text', ro: true, daftar: false },
        { k: 'uploads_id', l: 'ID unggahan', t: 'text', ro: true, daftar: false },
        { k: 'video_terakhir', l: 'Video terbaru terbaca', t: 'datetime', ro: true, daftar: false },
        { k: 'token_lanjut', l: 'Penanda impor bertahap', t: 'text', ro: true, daftar: false },
        { k: 'playlist_sinkron', l: 'Playlist diperbarui', t: 'datetime', ro: true, daftar: false },
        { k: 'terakhir_sinkron', l: 'Terakhir sinkron', t: 'datetime', ro: true },
        { k: 'catatan_sinkron', l: 'Hasil', t: 'text', ro: true }
      ]
    },
    {
      nama: 'PlaylistVideo',
      judul: 'Playlist',
      keterangan: 'Terisi otomatis dari channel/playlist. Matikan "Tampil" untuk menyembunyikan playlist dari website; ubah "Urutan" untuk mengatur posisinya.',
      kunci: 'playlist_id',
      bisaTambah: false,
      urut: { k: 'urutan', arah: 'asc' },
      filterCepat: [
        { label: 'Tampil', k: 'tampil', v: 'true' },
        { label: 'Disembunyikan', k: 'tampil', v: 'false' }
      ],
      kolom: [
        { k: 'playlist_id', l: 'ID playlist', t: 'text', ro: true, daftar: false },
        { k: 'judul', l: 'Judul', t: 'text' },
        { k: 'kanal_nama', l: 'Channel', t: 'text', ro: true },
        { k: 'tampil', l: 'Tampil', t: 'bool', bawaan: true },
        { k: 'urutan', l: 'Urutan', t: 'number', bawaan: 100 },
        { k: 'jumlah', l: 'Jumlah di YouTube', t: 'number', ro: true },
        { k: 'judul_yt', l: 'Judul di YouTube', t: 'text', ro: true, daftar: false },
        { k: 'kanal_id', l: 'ID channel', t: 'text', ro: true, daftar: false },
        { k: 'gambar', l: 'Gambar', t: 'text', ro: true, daftar: false },
        { k: 'isi', l: 'Urutan video (otomatis)', t: 'textarea', ro: true, daftar: false },
        { k: 'sumber', l: 'Sumber', t: 'text', ro: true, daftar: false },
        { k: 'diperbarui', l: 'Diperbarui', t: 'datetime', ro: true, daftar: false }
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
    }
  ],

  publik: {
    /** ?action=video&kanal=&playlist=&kategori=&q=&halaman= */
    video: function (p) {
      var semua = videoTayang_(), kat = katalogVideo_();
      var pl = p.playlist ? kat.playlist.filter(function (x) { return x.id === p.playlist; })[0] : null;
      var kanalId = p.kanal || (pl ? pl.kanal : '');
      var kanalPl = kanalId || (kat.kanal.length === 1 ? kat.kanal[0].id : '');
      var basis;
      if (pl) {
        var per = {};
        semua.forEach(function (v) { per[v.video_id] = v; });
        basis = pl.isi.map(function (id) { return per[id]; }).filter(Boolean);
      } else {
        basis = kanalId ? semua.filter(function (v) { return v.kanal_key === kanalId; }) : semua;
      }
      var q = String(p.q || '').toLowerCase().trim();
      var list = basis.filter(function (v) {
        if (p.kategori && v.kategori !== p.kategori) return false;
        if (q && (v.judul + ' ' + v.pemateri + ' ' + v.kanal).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      var per2 = Math.min(Math.max(Number(p.per) || 12, 1), 48), hal = Math.max(Number(p.halaman) || 1, 1);
      var ringkasPl = function (x) { return { id: x.id, judul: x.judul, jumlah: x.jumlah, gambar: x.gambar, kanal: x.kanal }; };
      return {
        items: list.slice((hal - 1) * per2, hal * per2), total: list.length, halaman: hal,
        jumlahHalaman: Math.max(1, Math.ceil(list.length / per2)), awal: (hal - 1) * per2,
        kanal: kat.kanal,
        kanalAktif: kanalId ? (kat.kanal.filter(function (k) { return k.id === kanalId; })[0] || null) : null,
        playlist: kanalPl ? kat.playlist.filter(function (x) { return x.kanal === kanalPl; }).map(ringkasPl) : [],
        playlistAktif: pl ? ringkasPl(pl) : null
      };
    },

    /** ?action=video_detail&id=&playlist= */
    video_detail: function (p) {
      var semua = videoTayang_(), kat = katalogVideo_();
      var v = semua.filter(function (x) { return x.id === p.id; })[0];
      if (!v) throw new Error('Video tidak ditemukan.');
      var out = JSON.parse(JSON.stringify(v));
      out.kanalInfo = kat.kanal.filter(function (k) { return k.id === v.kanal_key; })[0] || null;
      var berisi = kat.playlist.filter(function (x) { return x.isi.indexOf(v.video_id) >= 0; });
      out.playlistDi = berisi.map(function (x) { return { id: x.id, judul: x.judul, jumlah: x.jumlah }; });
      var pl = p.playlist ? berisi.filter(function (x) { return x.id === p.playlist; })[0] : null;
      if (pl) {
        var per = {};
        semua.forEach(function (x) { per[x.video_id] = x; });
        var isi = pl.isi.map(function (id) { return per[id]; }).filter(Boolean);
        out.playlist = { id: pl.id, judul: pl.judul, jumlah: isi.length,
          posisi: isi.map(function (x) { return x.id; }).indexOf(v.id) + 1,
          items: isi.slice(0, 300).map(function (x) { return { id: x.id, judul: x.judul, video_id: x.video_id }; }) };
      }
      out.terkait = semua.filter(function (x) { return x.id !== v.id && x.kanal_key === v.kanal_key && x.kategori === v.kategori; })
        .concat(semua.filter(function (x) { return x.id !== v.id && (x.kanal_key !== v.kanal_key || x.kategori !== v.kategori) && x.kategori === v.kategori; }))
        .slice(0, 6);
      return out;
    }
  },

  bootstrap: function () {
    return { kategoriVideo: bacaTabel_('KategoriVideo').sort(function (a, b) { return (a.urutan || 0) - (b.urutan || 0); })
      .map(function (k) { return { slug: k.slug, nama: k.nama }; }) };
  },

  beranda: function () { return { video: videoTayang_().slice(0, 4) }; },

  tugasPerJam: function () {
    var paksa = prop_('VIDEO_PAKSA');
    if (paksa) prop_('VIDEO_PAKSA', null);
    sinkronVideo_(null, { paksa: !!paksa });
  },

  sebelumSimpan: function (nama, obj, lama) {
    if (nama !== 'Video') return;
    var url = obj.url || (lama && lama.url);
    var vid = idYoutube_(url);
    if (!vid) throw new Error('URL YouTube tidak dikenali. Contoh: https://www.youtube.com/watch?v=xxxxxxxxxxx');
    obj.video_id = vid;
    if (!lama) obj.sumber = obj.sumber || 'manual';
    var judul = obj.hasOwnProperty('judul') ? obj.judul : (lama && lama.judul);
    var kanal = obj.kanal || (lama && lama.kanal);
    if (!judul || !kanal || !(lama && lama.kanal_id) || (lama && lama.video_id !== vid)) {
      var info = infoVideo_(vid);
      if (!judul) obj.judul = info.judul || 'Video ' + vid;
      if (!kanal) obj.kanal = info.kanal;
      if (info.kanal_id) obj.kanal_id = info.kanal_id;
      if (!obj.tanggal && !(lama && lama.tanggal) && info.tanggal) obj.tanggal = info.tanggal;
    }
    if (!obj.tanggal && !(lama && lama.tanggal)) obj.tanggal = new Date();
  },

  alat: [
    {
      id: 'sinkron_video', sheet: 'SumberVideo', label: 'Sinkron sekarang', gaya: 'utama',
      run: function (ids) {
        var h = sinkronVideo_(ids && ids.length ? ids : null);
        return { pesan: h.ringkas, tabel: h.detail, url: h.url || '', labelUrl: 'Beri izin YouTube' };
      }
    },
    {
      id: 'tayangkan_v', sheet: 'Video', label: 'Tayangkan', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Video', ids, 'status', 'Tayang') + ' video ditayangkan.' }; }
    },
    {
      id: 'sembunyikan_v', sheet: 'Video', label: 'Tidak tayang', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('Video', ids, 'status', 'Tidak tayang') + ' video disembunyikan.' }; }
    },
    {
      id: 'tampilkan_pl', sheet: 'PlaylistVideo', label: 'Tampilkan', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('PlaylistVideo', ids, 'tampil', true) + ' playlist ditampilkan.' }; }
    },
    {
      id: 'sembunyikan_pl', sheet: 'PlaylistVideo', label: 'Sembunyikan', perluPilih: true,
      run: function (ids) { return { pesan: ubahKolom_('PlaylistVideo', ids, 'tampil', false) + ' playlist disembunyikan.' }; }
    }
  ]
};

/* ================================================================
 * Data publik
 * ============================================================== */

/** Profil channel dari sheet SumberVideo, dipetakan per ID channel & per nama. */
function profilKanalVideo_() {
  var perId = {}, perNama = {};
  bacaTabel_('SumberVideo').forEach(function (s) {
    if (!/^UC[\w-]{22}$/.test(String(s.feed_id || ''))) return;
    var pf = { id: s.feed_id, nama: s.nama || s.nama_yt || '', foto: s.foto || '', url: s.url || '',
      urutan: s.urutan === '' || s.urutan == null ? 10 : Number(s.urutan) };
    perId[s.feed_id] = pf;
    [s.nama, s.nama_yt].forEach(function (n) { if (n) perNama[String(n).toLowerCase().trim()] = s.feed_id; });
  });
  return { perId: perId, perNama: perNama };
}

function videoTayang_() {
  return dariCache_('videoTayang', CONFIG.CACHE_DETIK, function () {
    var kat = {}, pf = profilKanalVideo_();
    bacaTabel_('KategoriVideo').forEach(function (k) { kat[k.slug] = k.nama; });
    return bacaTabel_('Video').filter(function (v) { return v.status !== 'Tidak tayang' && v.video_id; })
      .sort(function (a, b) {
        if (!!b.unggulan !== !!a.unggulan) return b.unggulan ? 1 : -1;
        return String(b.tanggal).localeCompare(String(a.tanggal));
      })
      .map(function (v) {
        var kid = v.kanal_id || pf.perNama[String(v.kanal || '').toLowerCase().trim()] || '';
        return { id: v.id, video_id: v.video_id, judul: v.judul, kategori: v.kategori, kategori_nama: kat[v.kategori] || '',
          pemateri: v.pemateri, kanal: (pf.perId[kid] && pf.perId[kid].nama) || v.kanal, kanal_id: kid,
          kanal_key: kid || (v.kanal ? 'n-' + slug_(v.kanal) : 'lainnya'),
          tanggal: v.tanggal, deskripsi: v.deskripsi, unggulan: !!v.unggulan };
      });
  });
}

/** Daftar channel (yang punya video tayang) dan playlist tampil beserta urutan videonya. */
function katalogVideo_() {
  return dariCache_('katalogVideo', CONFIG.CACHE_DETIK, function () {
    var vids = videoTayang_(), pf = profilKanalVideo_();
    var kanal = {}, ada = {};
    vids.forEach(function (v) {
      ada[v.video_id] = 1;
      var k = kanal[v.kanal_key];
      if (!k) {
        var p = pf.perId[v.kanal_id] || {};
        k = kanal[v.kanal_key] = { id: v.kanal_key, nama: p.nama || v.kanal || 'Lainnya', foto: urlGambar_(p.foto || ''),
          url: p.url || (v.kanal_id ? 'https://www.youtube.com/channel/' + v.kanal_id : ''),
          urutan: p.urutan != null ? p.urutan : 1000, jumlah: 0, playlist: 0 };
      }
      k.jumlah++;
    });
    var playlist = bacaTabel_('PlaylistVideo').filter(function (x) { return x.tampil !== false && x.isi; }).map(function (x) {
      var isi = String(x.isi).split(',').filter(function (id) { return ada[id]; });
      return { id: x.playlist_id, judul: x.judul || x.judul_yt || 'Playlist', kanal: x.kanal_id || '', gambar: x.gambar || '',
        urutan: x.urutan === '' || x.urutan == null ? 100 : Number(x.urutan), isi: isi, jumlah: isi.length };
    }).filter(function (x) { return x.jumlah; }).sort(function (a, b) {
      return (a.urutan - b.urutan) || String(a.judul).localeCompare(String(b.judul));
    });
    playlist.forEach(function (x) { if (kanal[x.kanal]) kanal[x.kanal].playlist++; });
    var daftar = Object.keys(kanal).map(function (k) { return kanal[k]; }).sort(function (a, b) {
      return (a.urutan - b.urutan) || (b.jumlah - a.jumlah) || String(a.nama).localeCompare(String(b.nama));
    });
    return { kanal: daftar, playlist: playlist };
  });
}

/* ================================================================
 * Helper YouTube
 * ============================================================== */

/** Layanan lanjutan "YouTube Data API" (Layanan + di editor) bila aktif; null bila tidak. */
function youtubeApi_() {
  try { return (typeof YouTube !== 'undefined' && YouTube && YouTube.PlaylistItems) ? YouTube : null; } catch (e) { return null; }
}

function idYoutube_(url) {
  var s = String(url || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  var m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : '';
}

/** Judul, channel & tanggal video: lewat API bila aktif, selain itu oEmbed (tanpa ID channel). */
function infoVideo_(vid) {
  var api = youtubeApi_();
  if (api) {
    try {
      var it = (api.Videos.list('snippet', { id: vid }).items || [])[0];
      if (it) return { judul: it.snippet.title, kanal: it.snippet.channelTitle, kanal_id: it.snippet.channelId,
        tanggal: it.snippet.publishedAt ? new Date(it.snippet.publishedAt) : null };
    } catch (e) { /* cadangan oEmbed */ }
  }
  var o = oembedYoutube_(vid);
  return { judul: o.judul, kanal: o.kanal, kanal_id: '', tanggal: null };
}

function oembedYoutube_(vid) {
  try {
    var r = UrlFetchApp.fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + vid), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return { judul: '', kanal: '' };
    var j = JSON.parse(r.getContentText());
    return { judul: j.title || '', kanal: j.author_name || '' };
  } catch (e) { return { judul: '', kanal: '' }; }
}

/** URL kanal/playlist → URL feed RSS YouTube (dipakai bila API tidak aktif). */
function feedYoutube_(src) {
  var url = String(src.url || '');
  var pl = url.match(/[?&]list=([\w-]+)/);
  if (pl) return { id: pl[1], feed: 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + pl[1] };
  var ch = url.match(/\/channel\/(UC[\w-]{22})/) || String(src.feed_id || '').match(/^(UC[\w-]{22})$/);
  var id = ch ? ch[1] : halamanKanal_(url).id;
  if (!id) throw new Error('ID channel tidak ditemukan. Pakai URL berbentuk youtube.com/@nama, youtube.com/channel/UC… atau playlist.');
  return { id: id, feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=' + id };
}

/** Baca halaman channel: ID (UC…), nama & foto dari meta og:. */
function halamanKanal_(url) {
  var html = '';
  try {
    html = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true,
      headers: { 'Accept-Language': 'id,en;q=0.8', 'User-Agent': 'Mozilla/5.0' } }).getContentText();
  } catch (e) { return { id: '', nama: '', foto: '' }; }
  var id = html.match(/feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/) || html.match(/"(?:externalId|channelId|browseId)":"(UC[\w-]{22})"/) ||
    html.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  var meta = function (p) {
    var m = html.match(new RegExp('<meta[^>]+property="' + p + '"[^>]+content="([^"]*)"'));
    return m ? m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : '';
  };
  return { id: id ? id[1] : '', nama: meta('og:title'), foto: meta('og:image') };
}

function gambarTerbaik_(t) {
  t = t || {};
  return ((t.medium || t.high || t['default'] || t.standard || {}).url) || '';
}

function daftarSaring_(s) {
  return String(s || '').toLowerCase().split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

/* ================================================================
 * Sinkron
 * ============================================================== */

/**
 * ids: daftar id SumberVideo (null = semua). opsi.paksa: perbarui profil & playlist sekarang.
 * Dari panel admin (web app), izin YouTube mengikuti versi yang di-deploy. Bila izin itu belum ada,
 * video terbaru tetap masuk lewat RSS dan sinkron lengkap otomatis dialihkan ke latar belakang
 * (trigger, memakai izin pemilik) — admin tidak perlu deploy ulang.
 */
function sinkronVideo_(ids, opsi) {
  opsi = opsi || {};
  var dariPanel = typeof ADMIN_AKTIF !== 'undefined' && !!ADMIN_AKTIF;
  if (!ambilGiliran_('video')) return { ringkas: 'Sinkron video sedang berjalan (bisa jadi di latar belakang). Hasilnya akan tercatat di kolom "Hasil sinkron"; coba lagi beberapa menit lagi bila perlu.', detail: [] };
  var detail = [], ctx = null;
  try {
    var mulai = Date.now();
    var ts = new Tabel_('SumberVideo');
    ctx = { tv: new Tabel_('Video'), tp: new Tabel_('PlaylistVideo'), ada: {}, api: youtubeApi_(), apiGagal: '',
      batas: mulai + CONFIG.BATAS_WAKTU_MS, paksa: !!ids || !!opsi.paksa, dariPanel: dariPanel, lanjut: false };
    ctx.tv.objek().forEach(function (v) { if (v.video_id) ctx.ada[v.video_id] = v; });
    var daftar = ts.objek().filter(function (s) { return s.url && s.aktif !== false && (!ids || ids.indexOf(s.id) >= 0); })
      .sort(function (a, b) { return String(a.terakhir_sinkron || '').localeCompare(String(b.terakhir_sinkron || '')); });
    daftar.forEach(function (s) {
      var label = s.nama || s.url, catatan;
      if (Date.now() > ctx.batas) { detail.push({ sumber: label, hasil: 'Menyusul pada sinkron berikutnya (batas waktu).' }); return; }
      try {
        var h = sinkronSumberVideo_(s, ctx);
        if (['nama', 'foto', 'feed_id'].some(function (k) { return h.ubah[k] !== undefined && String(h.ubah[k]) !== String(s[k] || ''); })) ctx.berubah = true;
        h.ubah.id = s.id;
        ts.set(h.ubah);
        label = h.ubah.nama || label;
        catatan = 'OK · ' + h.baru + ' video baru' + (h.playlist != null ? ' · ' + h.playlist + ' playlist' : '') +
          (h.lanjut ? ' · impor video lama berlanjut' : '') + (h.catatan ? ' · ' + h.catatan : '');
        if (h.lanjut) ctx.lanjut = true;
      } catch (e) {
        catatan = 'Gagal: ' + pesanError_(e);
      }
      ts.set({ id: s.id, terakhir_sinkron: new Date(), catatan_sinkron: catatan });
      detail.push({ sumber: label, hasil: catatan });
    });
    ctx.tv.simpan();
    ctx.tp.simpan();
    ts.simpan();
    if (ctx.berubah) naikkanVersiCache();     // cache website hanya dikosongkan bila katalog berubah
  } finally {
    lepasGiliran_('video');
  }
  var ringkas = detail.length ? 'Sinkron selesai untuk ' + detail.length + ' sumber.' : 'Belum ada channel/playlist aktif.';
  var jenis = ctx && ctx.apiGagal ? jenisGagalApi_(ctx.apiGagal) : '';
  // catat apakah sinkron latar belakang (izin pemilik) sudah bisa memakai YouTube API
  var tautanIzin = '';
  if (!dariPanel && ctx) {
    if (jenis === 'izin') { prop_('YT_IZIN_LATAR', 'gagal'); urlIzinYoutube_(); }
    else if (ctx.api) { prop_('YT_IZIN_LATAR', null); prop_('YT_IZIN_URL', null); }
  }
  if (jenis === 'izin' && dariPanel && typeof jadwalkanSegera_ === 'function') {
    // Selalu jadwalkan sinkron lengkap di latar belakang (memakai izin akun pemilik)
    var macet = latarMacet_();
    prop_('VIDEO_PAKSA', '1');
    jadwalkanSegera_('video');
    if (prop_('YT_IZIN_LATAR') === 'gagal') {
      tautanIzin = prop_('YT_IZIN_URL') || '';
      ringkas = 'Video terbaru (±15 per channel) sudah masuk. Untuk semua video & playlist, izin YouTube di akun pemilik belum dicentang. ' +
        (tautanIzin
          ? 'Klik tombol "Beri izin YouTube" di bawah (pakai akun Google pemilik), centang izin YouTube atau "Pilih semua", lalu Lanjutkan. ' +
            'Sesudahnya sinkron lengkap berjalan sendiri di latar belakang dalam 1–3 menit.'
          : 'Di editor Apps Script jalankan perbaruiSistem — Log eksekusi akan memberi tautan untuk mencentang izin YouTube.');
    } else {
      ringkas = 'Video terbaru (±15 per channel) sudah masuk. ' + (macet
        ? 'Sinkron lengkap di latar belakang sebelumnya belum berjalan — biasanya karena izin belum diberikan. ' +
          'Sekali saja: di editor Apps Script pilih fungsi perbaruiSistem › Jalankan › Izinkan (centang "Pilih semua").'
        : 'Sinkron lengkap (semua video & playlist) berjalan otomatis di latar belakang dalam 1–3 menit; muat ulang tabel sesudahnya.');
    }
  } else if (jenis) {
    ringkas += ' ' + jelaskanGagalApi_(ctx.apiGagal);
  }
  // Masih ada video lama yang belum terimpor → lanjutkan 1 menit lagi, tidak menunggu sejam
  if (ctx && ctx.lanjut && typeof jadwalkanSegera_ === 'function') jadwalkanSegera_('video');
  return { ringkas: ringkas, detail: detail, url: tautanIzin };
}

/** Satu baris SumberVideo. Mengembalikan kolom yang perlu diperbarui + ringkasan. */
function sinkronSumberVideo_(s, ctx) {
  var url = String(s.url).trim();
  var h = { baru: 0, ubah: {}, playlist: null, lanjut: false, catatan: '' };
  var bawaan = { kategori: s.kategori || '', pemateri: s.pemateri || '', status: s.status_baru || 'Tayang',
    sumber: s.nama || s.nama_yt || '', saring: daftarSaring_(s.saring) };
  var plId = (url.match(/[?&]list=([\w-]+)/) || [])[1];
  var halamanKanalUrl = /youtube\.com\/(@|channel\/|c\/|user\/)/.test(url.replace(/\?.*$/, ''));

  // ---- Sumber berupa playlist
  if (plId && !halamanKanalUrl) {
    var p = ambilPlaylist_(plId, ctx);
    simpanPlaylist_(p, s, ctx);
    h.baru = imporVideo_(p.items, bawaan, ctx);
    h.playlist = 1;
    h.ubah = { jenis: 'Playlist', feed_id: plId, nama_yt: p.judul };
    if (!s.nama || s.nama === s.nama_yt) h.ubah.nama = p.judul;
    if (!ctx.api) h.catatan = catatanTanpaApi_(ctx, 'hanya ±15 video teratas playlist');
    return h;
  }

  // ---- Sumber berupa channel
  var k = profilKanal_(s, ctx);
  h.ubah = { jenis: 'Channel', feed_id: k.id, uploads_id: k.uploads, nama_yt: k.nama };
  if (k.nama && (!s.nama || s.nama === s.nama_yt)) h.ubah.nama = k.nama;
  if (k.foto && (!s.foto || /^https:\/\/yt\d\.(ggpht|googleusercontent)\.com\//.test(s.foto))) h.ubah.foto = k.foto;
  bawaan.sumber = h.ubah.nama || bawaan.sumber || k.nama;

  var u = null;
  if (ctx.api) {
    try { u = unggahanApi_(k, s, ctx); } catch (e) { ctx.api = null; ctx.apiGagal = pesanError_(e); }
  }
  if (!u) u = unggahanRss_(k);
  h.baru += imporVideo_(u.items, bawaan, ctx);
  if (u.terbaru) h.ubah.video_terakhir = u.terbaru;
  h.ubah.token_lanjut = u.token || '';
  h.lanjut = !!u.token;

  if (ctx.api) {
    var umur = s.playlist_sinkron ? Date.now() - new Date(s.playlist_sinkron).getTime() : Infinity;
    if ((ctx.paksa || !(umur < 20 * 3600 * 1000)) && Date.now() < ctx.batas) {
      try {
        var r = sinkronPlaylistKanal_(k, s, ctx, bawaan);
        h.playlist = r.jumlah;
        h.baru += r.baru;
        if (r.selesai) h.ubah.playlist_sinkron = new Date();
      } catch (e) {
        h.catatan = 'playlist gagal dibaca: ' + pesanError_(e);
      }
    }
  } else {
    h.catatan = catatanTanpaApi_(ctx, '±15 video terbaru per sinkron, playlist channel tidak terbaca');
  }
  return h;
}

function catatanTanpaApi_(ctx, teks) {
  if (ctx.apiGagal && ctx.dariPanel && jenisGagalApi_(ctx.apiGagal) === 'izin') return 'video terbaru via RSS; sinkron lengkap dijadwalkan di latar belakang';
  return 'mode RSS (' + teks + ')' + (ctx.apiGagal ? ' — ' + jelaskanGagalApi_(ctx.apiGagal) : '');
}

function jenisGagalApi_(m) {
  m = String(m || '');
  if (/youtube\.readonly|do not have permission|insufficient[^.]*(scope|permission)|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(m)) return 'izin';
  if (/has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(m)) return 'nonaktif';
  if (/quota/i.test(m)) return 'kuota';
  return 'lain';
}

/** Dipanggil setup()/perbaruiSistem dari editor: memastikan YouTube Data API benar-benar bisa dipakai. */
function cekYoutube_() {
  var api = youtubeApi_();
  if (!api) return 'YouTube: memakai RSS (±15 video terbaru per channel). Untuk semua video & playlist, tambahkan Layanan › YouTube Data API v3.';
  try {
    api.Channels.list('id', { id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' });
    prop_('YT_IZIN_LATAR', null);
    prop_('YT_IZIN_URL', null);
    return 'YouTube Data API: siap — semua video & playlist channel akan diambil.';
  } catch (e) {
    if (jenisGagalApi_(pesanError_(e)) !== 'izin') return 'YouTube: ' + jelaskanGagalApi_(pesanError_(e));
    var url = urlIzinYoutube_();
    if (url) {
      return 'YouTube: izin "Lihat akun YouTube Anda" belum dicentang. Layar izin Google kini memakai kotak centang per izin, dan kotak YouTube terlewat.\n' +
        'Buka tautan ini dengan akun Google pemilik, centang izin YouTube (atau "Pilih semua"), lalu klik Lanjutkan:\n' + url +
        '\nSesudahnya jalankan perbaruiSistem sekali lagi — harus muncul "YouTube Data API: siap".';
    }
    return 'YouTube: izin belum tercantum. Tempel ulang appsscript.json dari folder pasang/ di paket terbaru, simpan, lalu jalankan perbaruiSistem lagi. ' +
      'Bila tetap begini: buka myaccount.google.com/connections, hapus akses proyek Apps Script ini, lalu jalankan perbaruiSistem dan pilih "Pilih semua" di layar izin.';
  }
}

/**
 * Tautan Google untuk memberi izin YouTube yang belum dicentang (layar izin per kotak centang).
 * Kosong bila izin sudah ada atau tidak bisa diperiksa. Disimpan agar bisa ditampilkan di panel.
 */
function urlIzinYoutube_() {
  var lingkup = 'https://www.googleapis.com/auth/youtube.readonly', url = '';
  try {
    var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL, [lingkup]);
    if (info.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) url = info.getAuthorizationUrl() || '';
  } catch (e) {
    try {   // runtime lama: periksa semua izin proyek
      var semua = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
      if (semua.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) url = semua.getAuthorizationUrl() || '';
    } catch (x) { /* abaikan */ }
  }
  prop_('YT_IZIN_URL', url || null);
  return url;
}

/** Galat YouTube Data API → penjelasan + langkah perbaikan yang bisa dilakukan admin. */
function jelaskanGagalApi_(m) {
  m = String(m || '');
  if (jenisGagalApi_(m) === 'izin') {
    return 'Izin YouTube di akun pemilik belum dicentang. Di editor Apps Script jalankan perbaruiSistem: Log eksekusi memberi tautan ' +
      'untuk mencentangnya (atau tekan Sinkron di panel lalu tombol "Beri izin YouTube").';
  }
  if (/has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(m)) {
    return 'YouTube Data API belum aktif. Di editor Apps Script: Layanan (+) › YouTube Data API v3 › Tambahkan, lalu jalankan perbaruiSistem.';
  }
  if (/quota/i.test(m)) return 'Kuota harian YouTube Data API habis; otomatis dilanjutkan besok.';
  return 'YouTube Data API gagal: ' + potong_(m, 160);
}

/** ID, nama, foto & playlist unggahan channel. */
function profilKanal_(s, ctx) {
  var url = String(s.url);
  // Profil tersimpan masih segar (diperbarui harian bersama playlist) → hemat kuota API
  var umur = s.playlist_sinkron ? Date.now() - new Date(s.playlist_sinkron).getTime() : Infinity;
  if (ctx.api && !ctx.paksa && s.uploads_id && /^UC[\w-]{22}$/.test(String(s.feed_id || '')) && s.nama_yt && umur < 20 * 3600 * 1000) {
    return { id: s.feed_id, nama: s.nama_yt, foto: '', uploads: s.uploads_id };
  }
  var id = (url.match(/\/channel\/(UC[\w-]{22})/) || [])[1] || (/^UC[\w-]{22}$/.test(String(s.feed_id || '')) ? s.feed_id : '');
  if (ctx.api) {
    try {
      var arg = id ? { id: id } : null;
      var hd = url.match(/youtube\.com\/(@[^/?#]+)/);
      if (!arg && hd) arg = { forHandle: decodeURIComponent(hd[1]) };
      var us = url.match(/youtube\.com\/user\/([^/?#]+)/);
      if (!arg && us) arg = { forUsername: us[1] };
      if (!arg) { id = halamanKanal_(url).id; if (id) arg = { id: id }; }
      if (arg) {
        var it = (ctx.api.Channels.list('snippet,contentDetails', arg).items || [])[0];
        if (!it && hd) { id = halamanKanal_(url).id; it = id ? (ctx.api.Channels.list('snippet,contentDetails', { id: id }).items || [])[0] : null; }
        if (!it) throw new Error('Channel tidak ditemukan di YouTube. Periksa URL-nya.');
        return { id: it.id, nama: it.snippet.title, foto: gambarTerbaik_(it.snippet.thumbnails),
          uploads: (it.contentDetails.relatedPlaylists || {}).uploads || 'UU' + it.id.slice(2) };
      }
    } catch (e) {
      if (/tidak ditemukan/.test(pesanError_(e))) throw e;
      ctx.api = null;
      ctx.apiGagal = pesanError_(e);
    }
  }
  var hal = (!id || !s.foto || !s.nama_yt) ? halamanKanal_(url) : { id: '', nama: '', foto: '' };
  id = id || hal.id;
  if (!id) throw new Error('ID channel tidak ditemukan. Pakai URL berbentuk youtube.com/@nama atau youtube.com/channel/UC…');
  return { id: id, nama: hal.nama || s.nama_yt || '', foto: hal.foto, uploads: 'UU' + id.slice(2) };
}

/**
 * Video unggahan channel lewat API. Dari yang terbaru sampai bertemu video yang sudah
 * terbaca sebelumnya; impor awal channel besar dilanjutkan bertahap (token_lanjut).
 */
function unggahanApi_(k, s, ctx) {
  var batasTgl = s.video_terakhir ? new Date(s.video_terakhir).getTime() : 0;
  var out = { items: [], token: '', terbaru: null }, pt = '', putaran = 0;
  var halaman = function (token) {
    var arg = { playlistId: k.uploads, maxResults: 50 };
    if (token) arg.pageToken = token;
    return ctx.api.PlaylistItems.list('snippet,contentDetails', arg);
  };
  // 1) dari atas
  do {
    var r = halaman(pt), lewat = false;
    (r.items || []).forEach(function (it) {
      var v = itemApi_(it, k);
      if (!v) return;
      var t = new Date(v.tanggal).getTime();
      if (!out.terbaru || t > out.terbaru.getTime()) out.terbaru = new Date(t);
      if (batasTgl && t <= batasTgl) lewat = true;
      out.items.push(v);
    });
    pt = r.nextPageToken || '';
    if (lewat) { pt = ''; break; }
  } while (pt && Date.now() < ctx.batas && ++putaran < 400);
  if (pt) { out.token = pt; return out; }               // impor awal belum selesai
  // 2) lanjutkan impor bertahap sebelumnya
  pt = s.token_lanjut || '';
  while (pt && Date.now() < ctx.batas && ++putaran < 400) {
    var r2 = halaman(pt);
    (r2.items || []).forEach(function (it) { var v = itemApi_(it, k); if (v) out.items.push(v); });
    pt = r2.nextPageToken || '';
  }
  out.token = pt;
  if (batasTgl && (!out.terbaru || out.terbaru.getTime() < batasTgl)) out.terbaru = new Date(batasTgl);
  return out;
}

function itemApi_(it, k) {
  var sn = it.snippet || {}, cd = it.contentDetails || {};
  var vid = cd.videoId || (sn.resourceId || {}).videoId;
  if (!vid || (!cd.videoPublishedAt && /^(private|deleted) video$/i.test(sn.title || ''))) return null;
  return { video_id: vid, judul: sn.title || '', tanggal: cd.videoPublishedAt || sn.publishedAt || '', deskripsi: sn.description || '',
    kanal: sn.videoOwnerChannelTitle || (k && k.nama) || '', kanal_id: sn.videoOwnerChannelId || (k && k.id) || '' };
}

/** Cadangan tanpa API: feed RSS channel (±15 video terbaru). */
function unggahanRss_(k) {
  var res = UrlFetchApp.fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + k.id, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Feed YouTube tidak bisa diambil (HTTP ' + res.getResponseCode() + ').');
  var f = parseFeedYoutube_(res.getContentText());
  if (!k.nama && f.kanal) k.nama = f.kanal;
  return { items: f.items.map(function (it) { it.kanal_id = it.kanal_id || k.id; it.kanal = it.kanal || k.nama; return it; }), token: '', terbaru: null };
}

/** Isi playlist: lewat API (lengkap, maks 1000) atau RSS (±15). */
function ambilPlaylist_(plId, ctx) {
  if (ctx.api) {
    try {
      var p = (ctx.api.Playlists.list('snippet,contentDetails', { id: plId }).items || [])[0];
      if (!p) throw new Error('Playlist tidak ditemukan atau bersifat pribadi.');
      return { id: plId, judul: p.snippet.title, kanal_id: p.snippet.channelId, kanal_nama: p.snippet.channelTitle,
        gambar: gambarTerbaik_(p.snippet.thumbnails), jumlah: (p.contentDetails || {}).itemCount, items: itemPlaylistApi_(plId, ctx), lengkap: true };
    } catch (e) {
      if (/tidak ditemukan/.test(pesanError_(e))) throw e;
      ctx.api = null;
      ctx.apiGagal = pesanError_(e);
    }
  }
  var res = UrlFetchApp.fetch('https://www.youtube.com/feeds/videos.xml?playlist_id=' + plId, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Playlist tidak bisa dibaca (HTTP ' + res.getResponseCode() + '). Pastikan playlist publik.');
  var f = parseFeedYoutube_(res.getContentText());
  return { id: plId, judul: f.judul || 'Playlist', kanal_id: f.kanal_id || (f.items[0] || {}).kanal_id || '', kanal_nama: f.kanal,
    gambar: f.items[0] ? 'https://i.ytimg.com/vi/' + f.items[0].video_id + '/hqdefault.jpg' : '', jumlah: f.items.length, items: f.items, lengkap: false };
}

function itemPlaylistApi_(plId, ctx) {
  var items = [], pt = '', n = 0;
  do {
    var arg = { playlistId: plId, maxResults: 50 };
    if (pt) arg.pageToken = pt;
    var r = ctx.api.PlaylistItems.list('snippet,contentDetails', arg);
    (r.items || []).forEach(function (it) { var v = itemApi_(it, null); if (v) items.push(v); });
    pt = r.nextPageToken || '';
  } while (pt && ++n < 100 && Date.now() < ctx.batas);
  return items;
}

/** Semua playlist milik channel (API). Isi playlist yang jumlahnya berubah dibaca ulang. */
function sinkronPlaylistKanal_(k, s, ctx, bawaan) {
  var res = { jumlah: 0, baru: 0, selesai: false }, semua = [], pt = '', n = 0;
  do {
    var arg = { channelId: k.id, maxResults: 50 };
    if (pt) arg.pageToken = pt;
    var r = ctx.api.Playlists.list('snippet,contentDetails', arg);
    semua = semua.concat(r.items || []);
    pt = r.nextPageToken || '';
  } while (pt && ++n < 20);
  var dilihat = {};
  for (var i = 0; i < semua.length; i++) {
    if (Date.now() > ctx.batas) return res;
    var p = semua[i], lama = ctx.tp.ambil(p.id), jumlah = (p.contentDetails || {}).itemCount || 0;
    dilihat[p.id] = 1;
    var segar = lama && lama.isi && Number(lama.jumlah) === jumlah && lama.diperbarui &&
      Date.now() - new Date(lama.diperbarui).getTime() < 7 * 24 * 3600 * 1000;
    var data = { id: p.id, judul: p.snippet.title, kanal_id: k.id, kanal_nama: k.nama, gambar: gambarTerbaik_(p.snippet.thumbnails),
      jumlah: jumlah, lengkap: true, items: null };
    if (!segar) {
      data.items = itemPlaylistApi_(p.id, ctx);
      res.baru += imporVideo_(data.items, bawaan, ctx);
    }
    simpanPlaylist_(data, s, ctx);
    res.jumlah++;
  }
  // playlist yang sudah dihapus dari channel → dikosongkan (hilang dari website)
  ctx.tp.objek().forEach(function (x) {
    if (x.kanal_id === k.id && x.sumber === s.id && !dilihat[x.playlist_id] && x.isi) { ctx.tp.set({ playlist_id: x.playlist_id, isi: '', jumlah: 0 }); ctx.berubah = true; }
  });
  res.selesai = true;
  return res;
}

function simpanPlaylist_(p, s, ctx) {
  var lama = ctx.tp.ambil(p.id);
  var row = { playlist_id: p.id, judul_yt: p.judul, kanal_id: p.kanal_id || '', kanal_nama: p.kanal_nama || '', gambar: p.gambar || '',
    jumlah: p.jumlah || 0, sumber: s.id, diperbarui: new Date() };
  if (p.items) {
    var ids = p.items.map(function (v) { return v.video_id; });
    if (!p.lengkap && lama && lama.isi) {               // RSS: gabungkan dengan isi yang sudah terkumpul
      var ada = {};
      String(lama.isi).split(',').forEach(function (id) { ada[id] = 1; });
      ids = String(lama.isi).split(',').concat(ids.filter(function (id) { return !ada[id]; }));
    }
    row.isi = ids.join(',');
  }
  if (!lama || !lama.judul || lama.judul === lama.judul_yt) row.judul = p.judul;
  if (!lama) { row.tampil = true; row.urutan = 100; }
  if (!lama || ['isi', 'judul', 'gambar', 'kanal_id'].some(function (k) { return row[k] !== undefined && String(row[k]) !== String(lama[k] || ''); })) ctx.berubah = true;
  ctx.tp.set(row);
}

/** Tambah video yang belum ada; video lama dilengkapi ID channel-nya. */
function imporVideo_(items, bawaan, ctx) {
  var baru = 0;
  (items || []).forEach(function (it) {
    if (!it || !it.video_id) return;
    var lama = ctx.ada[it.video_id];
    if (lama) {
      if (!lama.kanal_id && it.kanal_id && lama.id) {
        ctx.tv.set({ id: lama.id, kanal_id: it.kanal_id, kanal: lama.kanal || it.kanal });
        lama.kanal_id = it.kanal_id;
        ctx.berubah = true;
      }
      return;
    }
    if (bawaan.saring.length && !bawaan.saring.some(function (w) { return String(it.judul).toLowerCase().indexOf(w) >= 0; })) return;
    var row = { url: 'https://www.youtube.com/watch?v=' + it.video_id, video_id: it.video_id, judul: it.judul,
      kategori: bawaan.kategori, pemateri: bawaan.pemateri, status: bawaan.status, unggulan: false,
      tanggal: it.tanggal ? new Date(it.tanggal) : new Date(), deskripsi: potong_(it.deskripsi, 1500),
      kanal: it.kanal || '', kanal_id: it.kanal_id || '', sumber: bawaan.sumber };
    ctx.tv.set(row);
    ctx.ada[it.video_id] = row;
    baru++;
    ctx.berubah = true;
  });
  return baru;
}

/** Feed RSS YouTube (channel atau playlist). */
function parseFeedYoutube_(xml) {
  if (halamanHtml_(xml)) throw new Error('YouTube mengirim halaman web, bukan feed (channel/playlist mungkin pribadi atau sementara tidak tersedia).');
  var root;
  try { root = XmlService.parse(xml).getRootElement(); }
  catch (e) { throw new Error('Feed YouTube tidak bisa dibaca saat ini; dicoba lagi pada sinkron berikutnya.'); }
  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var yt = XmlService.getNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');
  var media = XmlService.getNamespace('media', 'http://search.yahoo.com/mrss/');
  var penulis = root.getChild('author', atom);
  return {
    judul: teksAnak_(root, 'title', atom),
    kanal: penulis ? teksAnak_(penulis, 'name', atom) : '',
    kanal_id: teksAnak_(root, 'channelId', yt),
    items: root.getChildren('entry', atom).map(function (e) {
      var g = e.getChild('group', media);
      var author = e.getChild('author', atom);
      return {
        video_id: teksAnak_(e, 'videoId', yt),
        judul: teksAnak_(e, 'title', atom),
        tanggal: tglFeed_(teksAnak_(e, 'published', atom)),
        deskripsi: g ? teksAnak_(g, 'description', media) : '',
        kanal: author ? teksAnak_(author, 'name', atom) : '',
        kanal_id: teksAnak_(e, 'channelId', yt)
      };
    })
  };
}
