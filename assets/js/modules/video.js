/* Modul VIDEO: katalog YouTube per channel, playlist & kategori; halaman tonton; bagian beranda. */
(function () {
  'use strict';
  var esc = U.esc;

  function gambarMini(v) {
    return v.video_id ? 'https://i.ytimg.com/vi/' + encodeURIComponent(v.video_id) + '/hqdefault.jpg' : '';
  }

  /** opsi: { nomor, playlist, tanpaKanal } */
  function kartu(v, opsi) {
    opsi = opsi || {};
    var g = gambarMini(v);
    var href = U.hash('video/' + v.id, { playlist: opsi.playlist });
    return '<a class="kartu-video" href="' + esc(href) + '">' +
      '<span class="mini">' + (g ? '<img src="' + esc(g) + '" alt="" loading="lazy">' : '<span class="sampul-kosong" style="position:absolute;inset:0">' + U.ikon('youtube', 40) + '</span>') +
        '<span class="putar" aria-hidden="true">' + U.ikon('youtube', 30) + '</span>' +
        (opsi.nomor ? '<span class="nomor-video">' + opsi.nomor + '</span>' : (v.unggulan ? '<span class="chip c-emas tanda">Unggulan</span>' : '')) + '</span>' +
      '<span class="isi">' + (v.kategori_nama ? '<span class="chip c-biru">' + esc(v.kategori_nama) + '</span>' : '') +
        '<strong>' + esc(v.judul) + '</strong>' +
        '<span class="meta" style="padding:0">' + [v.pemateri, opsi.tanpaKanal ? '' : v.kanal, U.tgl(v.tanggal, true)].filter(Boolean).map(esc).join(' · ') + '</span></span></a>';
  }

  function pilKanal(k, aktif, href) {
    return '<a class="pil pil-penulis' + (aktif ? ' aktif' : '') + '"' + (aktif ? ' aria-current="page"' : '') + ' href="' + esc(href) + '">' +
      U.avatar(k.nama, k.foto, 'kecil') + '<span>' + esc(k.nama) + '</span><span class="jumlah">' + k.jumlah + '</span></a>';
  }

  function katalog(el, p, q) {
    var hal = Math.max(1, Number(q.halaman) || 1);
    return API.get('video', { kanal: q.kanal, playlist: q.playlist, kategori: q.kategori, q: q.q, halaman: hal }).then(function (d) {
      var kanal = d.kanal || [], ka = d.kanalAktif, pa = d.playlistAktif, pls = d.playlist || [];
      var kTampil = ka || (kanal.length === 1 ? kanal[0] : null);
      var kanalQ = ka ? ka.id : '';
      App.judul(pa ? pa.judul : ka ? ka.nama : 'Video');

      // Navigasi channel (bila lebih dari satu)
      var navKanal = kanal.length > 1 ? '<div class="filter-penulis"><span class="label">Channel YouTube</span>' +
        '<div class="baris-penulis" role="list" aria-label="Pilih channel">' +
          '<a class="pil pil-penulis' + (!ka ? ' aktif' : '') + '"' + (!ka ? ' aria-current="page"' : '') + ' href="' + esc(U.hash('video', { kategori: q.kategori, q: q.q })) + '">' +
            '<span class="avatar kecil" style="background:var(--biru);color:#fff">' + U.ikon('youtube', 15) + '</span><span>Semua channel</span></a>' +
          kanal.map(function (k) { return pilKanal(k, ka && ka.id === k.id, U.hash('video', { kanal: k.id, kategori: q.kategori })); }).join('') +
        '</div></div>' : '';

      // Profil channel terpilih
      var profil = kTampil ? '<section class="kartu profil-kanal">' + U.avatar(kTampil.nama, kTampil.foto, 'sedang') +
        '<div class="profil-kanal-teks"><span class="label-kecil">Channel YouTube</span><h2>' + esc(kTampil.nama) + '</h2>' +
          '<p>' + kTampil.jumlah + ' video' + (kTampil.playlist ? ' · ' + kTampil.playlist + ' playlist' : '') + '</p></div>' +
        (kTampil.url ? '<a class="btn btn-biru-garis btn-kecil" href="' + esc(kTampil.url) + '" target="_blank" rel="noopener">' + U.ikon('youtube', 18) + 'Buka di YouTube</a>' : '') +
        '</section>' : '';

      // Navigasi playlist channel
      var navPl = pls.length ? '<div class="filter-penulis"><span class="label">Playlist</span>' +
        '<div class="baris-penulis" role="list" aria-label="Pilih playlist">' +
          '<a class="pil pil-penulis pil-playlist' + (!pa ? ' aktif' : '') + '" href="' + esc(U.hash('video', { kanal: kanalQ, kategori: q.kategori })) + '">Semua video</a>' +
          pls.map(function (x) {
            var on = pa && pa.id === x.id;
            return '<a class="pil pil-penulis pil-playlist' + (on ? ' aktif' : '') + '"' + (on ? ' aria-current="page"' : '') +
              ' href="' + esc(U.hash('video', { kanal: kanalQ, playlist: x.id })) + '"><span>' + esc(x.judul) + '</span><span class="jumlah">' + x.jumlah + '</span></a>';
          }).join('') +
        '</div></div>' : '';

      // Kepala playlist terpilih
      var kepalaPl = pa ? '<div class="kepala-playlist"><div><span class="label-kecil">Playlist</span><h2>' + esc(pa.judul) + '</h2><p>' + pa.jumlah + ' video, urut sesuai playlist di YouTube</p></div>' +
        (d.items.length && hal === 1 ? '<a class="btn btn-utama btn-kecil" href="' + esc(U.hash('video/' + d.items[0].id, { playlist: pa.id })) + '">' + U.ikon('youtube', 18) + 'Putar dari awal</a>' : '') + '</div>' : '';

      // Kategori & pencarian
      var kat = App.data().kategoriVideo || [];
      var pilKat = kat.length && !pa ? '<div class="chips" role="list" aria-label="Kategori video">' + [{ slug: '', nama: 'Semua kategori' }].concat(kat).map(function (k) {
        var on = (q.kategori || '') === k.slug;
        return '<a class="pil' + (on ? ' aktif' : '') + '"' + (on ? ' aria-current="page"' : '') + ' href="' + esc(U.hash('video', { kanal: kanalQ, kategori: k.slug, q: q.q })) + '">' + esc(k.nama) + '</a>';
      }).join('') + '</div>' : '<div></div>';

      var opsiKartu = function (v, i) { return kartu(v, { nomor: pa ? (d.awal || 0) + i + 1 : 0, playlist: pa ? pa.id : '', tanpaKanal: !!kTampil }); };
      el.innerHTML = '<div class="wadah">' +
        '<header class="kepala-halaman"><h1>Video</h1><p>' + (q.q ? 'Hasil pencarian “' + esc(q.q) + '”' : 'Kajian dan kegiatan yayasan dalam video.') + '</p></header>' +
        navKanal + profil + navPl + kepalaPl +
        '<div class="filter">' + pilKat +
          '<form class="medan" id="cari-video" role="search" style="flex:0 1 320px"><label for="q-video">Cari video</label>' +
          '<input id="q-video" type="search" value="' + esc(q.q || '') + '" placeholder="Judul, pemateri, atau channel"></form></div>' +
        (d.items.length ? '<div class="grid">' + d.items.map(opsiKartu).join('') + '</div>'
          : '<p class="kosong">' + (q.q || q.kategori ? 'Tidak ada video yang cocok.' : 'Belum ada video.') + '</p>') +
        (App.bersama.paginasi ? App.bersama.paginasi(d.halaman, d.jumlahHalaman, function (n) {
          return U.hash('video', { kanal: kanalQ, playlist: pa ? pa.id : '', kategori: q.kategori, q: q.q, halaman: n });
        }) : '') +
        '<div style="height:80px"></div></div>';
      el.querySelector('#cari-video').onsubmit = function (ev) {
        ev.preventDefault();
        location.hash = U.hash('video', { kanal: kanalQ, kategori: q.kategori, q: el.querySelector('#q-video').value.trim() });
      };
      var aktif = el.querySelectorAll('.baris-penulis .aktif');
      aktif.forEach(function (a) { if (a.scrollIntoView && a.parentNode.scrollWidth > a.parentNode.clientWidth) a.parentNode.scrollLeft = a.offsetLeft - 16; });
    });
  }

  function tonton(el, p, q) {
    return API.get('video_detail', { id: p.id, playlist: q.playlist }).then(function (v) {
      App.judul(v.judul);
      var g = gambarMini(v), ki = v.kanalInfo, pl = v.playlist;
      var teksBagikan = encodeURIComponent(v.judul + ' ' + location.href);
      var berikut = pl && pl.posisi && pl.items[pl.posisi] ? pl.items[pl.posisi] : null;
      var sebelum = pl && pl.posisi > 1 ? pl.items[pl.posisi - 2] : null;

      var samping = pl ? '<div class="kartu sisi daftar-playlist"><span class="label-kecil">Playlist · ' + pl.posisi + ' / ' + pl.jumlah + '</span>' +
          '<h2><a href="' + esc(U.hash('video', { kanal: ki ? ki.id : '', playlist: pl.id })) + '">' + esc(pl.judul) + '</a></h2>' +
          '<ol class="gulir-playlist">' + pl.items.map(function (t, i) {
            var ini = t.id === v.id;
            return '<li><a class="item item-video' + (ini ? ' sedang' : '') + '"' + (ini ? ' aria-current="true"' : '') + ' href="' + esc(U.hash('video/' + t.id, { playlist: pl.id })) + '">' +
              '<span class="urut">' + (i + 1) + '</span>' + (t.video_id ? '<img src="' + esc(gambarMini(t)) + '" alt="" loading="lazy">' : '') + '<span>' + esc(t.judul) + '</span></a></li>';
          }).join('') + '</ol></div>'
        : (v.terkait && v.terkait.length ? '<div class="kartu sisi"><h2>Video terkait</h2>' + v.terkait.map(function (t) {
            return '<a class="item item-video" href="' + esc(U.hash('video/' + t.id)) + '">' +
              (t.video_id ? '<img src="' + esc(gambarMini(t)) + '" alt="" loading="lazy">' : '') + '<span>' + esc(t.judul) + '</span></a>';
          }).join('') + '</div>' : '');

      el.innerHTML = '<div class="wadah"><div class="tata-baca">' +
        '<article>' +
          '<nav class="remah" aria-label="Jejak halaman"><a href="#/">Beranda</a><span aria-hidden="true">/</span><a href="#/video">Video</a>' +
            (ki ? '<span aria-hidden="true">/</span><a href="' + esc(U.hash('video', { kanal: ki.id })) + '">' + esc(ki.nama) + '</a>' : '') +
            (pl ? '<span aria-hidden="true">/</span><a href="' + esc(U.hash('video', { kanal: ki ? ki.id : '', playlist: pl.id })) + '">' + esc(pl.judul) + '</a>' : '') + '</nav>' +
          '<div class="pemutar" id="pemutar">' +
            (v.video_id ? '<button type="button" class="pemutar-tombol" aria-label="Putar video: ' + esc(v.judul) + '">' +
              (g ? '<img src="' + esc(g.replace('hqdefault', 'maxresdefault')) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(g) + '\'">' : '') +
              '<span class="putar besar" aria-hidden="true">' + U.ikon('youtube', 44) + '</span></button>'
              : '<div class="sampul-kosong" style="position:absolute;inset:0">' + U.ikon('youtube', 44) + '</div>') +
          '</div>' +
          (pl ? '<div class="langkah-playlist">' +
            (sebelum ? '<a class="btn btn-biru-garis btn-kecil" href="' + esc(U.hash('video/' + sebelum.id, { playlist: pl.id })) + '">‹ Sebelumnya</a>' : '<span></span>') +
            '<span class="redup">' + pl.posisi + ' dari ' + pl.jumlah + '</span>' +
            (berikut ? '<a class="btn btn-utama btn-kecil" href="' + esc(U.hash('video/' + berikut.id, { playlist: pl.id })) + '">Berikutnya ›</a>' : '<span></span>') + '</div>' : '') +
          (v.kategori_nama ? U.chip('biru', v.kategori_nama) : '') +
          '<h1 class="judul-artikel" style="font-size:clamp(26px,3.4vw,38px)">' + esc(v.judul) + '</h1>' +
          '<div class="meta" style="font-size:15px;padding:0;gap:6px 18px;align-items:center">' +
            (ki ? '<a class="penulis-kecil" href="' + esc(U.hash('video', { kanal: ki.id })) + '">' + U.avatar(ki.nama, ki.foto, 'kecil') + '<strong>' + esc(ki.nama) + '</strong></a>'
              : (v.kanal ? '<span>' + U.ikon('youtube', 16) + ' ' + esc(v.kanal) + '</span>' : '')) +
            (v.pemateri ? '<span>' + esc(v.pemateri) + '</span>' : '') +
            (v.tanggal ? '<time datetime="' + esc(v.tanggal) + '">' + U.tgl(v.tanggal) + '</time>' : '') + '</div>' +
          (v.playlistDi && v.playlistDi.length ? '<div class="chips" aria-label="Ada di playlist"><span class="redup" style="font-size:14px;align-self:center">Ada di playlist:</span>' +
            v.playlistDi.map(function (x) { return U.chip('netral', x.judul, U.hash('video/' + v.id, { playlist: x.id })); }).join('') + '</div>' : '') +
          (v.deskripsi ? '<p class="isi-artikel" style="font-size:17px;white-space:pre-line;margin:0">' + esc(v.deskripsi) + '</p>' : '') +
          '<div class="bagikan"><strong style="margin-right:6px">Bagikan</strong>' +
            '<a class="btn btn-biru-garis btn-kecil" href="https://wa.me/?text=' + teksBagikan + '" target="_blank" rel="noopener">' + U.ikon('whatsapp', 18) + 'WhatsApp</a>' +
            (v.video_id ? '<a class="btn btn-biru-garis btn-kecil" href="https://www.youtube.com/watch?v=' + encodeURIComponent(v.video_id) + '" target="_blank" rel="noopener">' + U.ikon('youtube', 18) + 'Buka di YouTube</a>' : '') +
          '</div>' +
        '</article>' +
        '<aside>' + samping + '</aside>' +
      '</div></div>';
      var tombol = el.querySelector('.pemutar-tombol');
      if (tombol) tombol.onclick = function () {
        el.querySelector('#pemutar').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.video_id) +
          '?autoplay=1&rel=0" title="' + esc(v.judul) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      };
      var sedang = el.querySelector('.gulir-playlist .sedang');
      if (sedang) { var box = sedang.closest('.gulir-playlist'); box.scrollTop = sedang.parentNode.offsetTop - box.offsetTop - 8; }
    });
  }

  App.modul({
    id: 'video',
    butuh: 'video',
    nav: { label: 'Video', href: '#/video' },
    rute: [
      { pola: 'video', render: katalog },
      { pola: 'video/:id', render: tonton }
    ],
    beranda: [{
      urutan: 42,
      render: function (d) {
        var list = d.video || [];
        if (!list.length) return '';
        return '<section class="bagian" aria-labelledby="h-video"><div class="wadah">' +
          '<div class="kepala-bagian"><h2 id="h-video">Video Terbaru</h2><a href="#/video">Semua video →</a></div>' +
          '<div class="grid">' + list.map(function (v) { return kartu(v); }).join('') + '</div></div></section>';
      }
    }]
  });
})();
