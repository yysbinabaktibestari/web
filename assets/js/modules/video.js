/* Modul VIDEO: katalog YouTube per kategori, pencarian, halaman tonton, bagian beranda. */
(function () {
  'use strict';
  var esc = U.esc;

  function gambarMini(v) {
    return v.video_id ? 'https://i.ytimg.com/vi/' + encodeURIComponent(v.video_id) + '/hqdefault.jpg' : '';
  }

  function kartu(v) {
    var g = gambarMini(v);
    return '<a class="kartu-video" href="#/video/' + encodeURIComponent(v.id) + '">' +
      '<span class="mini">' + (g ? '<img src="' + esc(g) + '" alt="" loading="lazy">' : '<span class="sampul-kosong" style="position:absolute;inset:0">' + U.ikon('youtube', 40) + '</span>') +
        '<span class="putar" aria-hidden="true">' + U.ikon('youtube', 30) + '</span>' +
        (v.unggulan ? '<span class="chip c-emas tanda">Unggulan</span>' : '') + '</span>' +
      '<span class="isi">' + (v.kategori_nama ? '<span class="chip c-biru">' + esc(v.kategori_nama) + '</span>' : '') +
        '<strong>' + esc(v.judul) + '</strong>' +
        '<span class="meta" style="padding:0">' + [v.pemateri || v.kanal, U.tgl(v.tanggal, true)].filter(Boolean).map(esc).join(' · ') + '</span></span></a>';
  }

  function katalog(el, p, q) {
    var hal = Math.max(1, Number(q.halaman) || 1);
    App.judul('Video');
    return API.get('video', { kategori: q.kategori, q: q.q, halaman: hal }).then(function (d) {
      var kat = App.data().kategoriVideo || [];
      var pil = [{ slug: '', nama: 'Semua' }].concat(kat).map(function (k) {
        var on = (q.kategori || '') === k.slug;
        return '<a class="pil' + (on ? ' aktif' : '') + '"' + (on ? ' aria-current="page"' : '') + ' href="' + U.hash('video', { kategori: k.slug, q: q.q }) + '">' + esc(k.nama) + '</a>';
      }).join('');
      el.innerHTML = '<div class="wadah">' +
        '<header class="kepala-halaman"><h1>Video</h1><p>' + (q.q ? 'Hasil pencarian “' + esc(q.q) + '”' : 'Kajian dan kegiatan yayasan dalam video.') + '</p></header>' +
        '<div class="filter"><div class="chips" role="list" aria-label="Kategori video">' + pil + '</div>' +
          '<form class="medan" id="cari-video" role="search" style="flex:0 1 320px"><label for="q-video">Cari video</label>' +
          '<input id="q-video" type="search" value="' + esc(q.q || '') + '" placeholder="Judul, pemateri, atau kanal"></form></div>' +
        (d.items.length ? '<div class="grid">' + d.items.map(kartu).join('') + '</div>'
          : '<p class="kosong">' + (q.q || q.kategori ? 'Tidak ada video yang cocok.' : 'Belum ada video.') + '</p>') +
        (App.bersama.paginasi ? App.bersama.paginasi(d.halaman, d.jumlahHalaman, function (n) { return U.hash('video', { kategori: q.kategori, q: q.q, halaman: n }); }) : '') +
        '<div style="height:80px"></div></div>';
      el.querySelector('#cari-video').onsubmit = function (ev) {
        ev.preventDefault();
        location.hash = U.hash('video', { kategori: q.kategori, q: el.querySelector('#q-video').value.trim() });
      };
    });
  }

  function tonton(el, p) {
    return API.get('video_detail', { id: p.id }).then(function (v) {
      App.judul(v.judul);
      var g = gambarMini(v);
      var teksBagikan = encodeURIComponent(v.judul + ' ' + location.href);
      el.innerHTML = '<div class="wadah"><div class="tata-baca">' +
        '<article>' +
          '<nav class="remah" aria-label="Jejak halaman"><a href="#/">Beranda</a><span aria-hidden="true">/</span><a href="#/video">Video</a>' +
            (v.kategori_nama ? '<span aria-hidden="true">/</span><a href="' + U.hash('video', { kategori: v.kategori }) + '">' + esc(v.kategori_nama) + '</a>' : '') + '</nav>' +
          '<div class="pemutar" id="pemutar">' +
            (v.video_id ? '<button type="button" class="pemutar-tombol" aria-label="Putar video: ' + esc(v.judul) + '">' +
              (g ? '<img src="' + esc(g.replace('hqdefault', 'maxresdefault')) + '" alt="" onerror="this.src=\'' + esc(g) + '\'">' : '') +
              '<span class="putar besar" aria-hidden="true">' + U.ikon('youtube', 44) + '</span></button>'
              : '<div class="sampul-kosong" style="position:absolute;inset:0">Video contoh</div>') +
          '</div>' +
          (v.kategori_nama ? U.chip('biru', v.kategori_nama) : '') +
          '<h1 class="judul-artikel" style="font-size:clamp(26px,3.4vw,38px)">' + esc(v.judul) + '</h1>' +
          '<div class="meta" style="font-size:15px;padding:0;gap:6px 18px">' +
            (v.pemateri ? '<strong style="color:var(--tinta)">' + esc(v.pemateri) + '</strong>' : '') +
            (v.kanal ? '<span>' + U.ikon('youtube', 16) + ' ' + esc(v.kanal) + '</span>' : '') +
            (v.tanggal ? '<time datetime="' + esc(v.tanggal) + '">' + U.tgl(v.tanggal) + '</time>' : '') + '</div>' +
          (v.deskripsi ? '<p class="isi-artikel" style="font-size:17px;white-space:pre-line;margin:0">' + esc(v.deskripsi) + '</p>' : '') +
          '<div class="bagikan"><strong style="margin-right:6px">Bagikan</strong>' +
            '<a class="btn btn-biru-garis btn-kecil" href="https://wa.me/?text=' + teksBagikan + '" target="_blank" rel="noopener">' + U.ikon('whatsapp', 18) + 'WhatsApp</a>' +
            (v.video_id ? '<a class="btn btn-biru-garis btn-kecil" href="https://www.youtube.com/watch?v=' + encodeURIComponent(v.video_id) + '" target="_blank" rel="noopener">' + U.ikon('youtube', 18) + 'Buka di YouTube</a>' : '') +
          '</div>' +
        '</article>' +
        '<aside>' + (v.terkait && v.terkait.length ? '<div class="kartu sisi"><h2>Video terkait</h2>' + v.terkait.map(function (t) {
          return '<a class="item item-video" href="#/video/' + encodeURIComponent(t.id) + '">' +
            (t.video_id ? '<img src="' + esc(gambarMini(t)) + '" alt="" loading="lazy">' : '') + '<span>' + esc(t.judul) + '</span></a>';
        }).join('') + '</div>' : '') + '</aside>' +
      '</div></div>';
      var tombol = el.querySelector('.pemutar-tombol');
      if (tombol) tombol.onclick = function () {
        el.querySelector('#pemutar').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.video_id) +
          '?autoplay=1&rel=0" title="' + esc(v.judul) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      };
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
          '<div class="grid">' + list.map(kartu).join('') + '</div></div></section>';
      }
    }]
  });
})();
