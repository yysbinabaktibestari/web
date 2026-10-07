/* Modul ARTIKEL: daftar + kategori + pencarian, halaman baca, bagian beranda. */
(function () {
  'use strict';
  var esc = U.esc;

  function kartu(a) {
    return '<a class="kartu-artikel" href="#/artikel/' + encodeURIComponent(a.slug) + '">' +
      U.gambar(a.sampul, '', 'Gambar sampul', 'sampul') +
      (a.kategori_nama ? U.chip(a.warna, a.kategori_nama) : '') +
      '<h3>' + esc(a.judul) + '</h3>' +
      (a.ringkasan ? '<p>' + esc(a.ringkasan) + '</p>' : '') +
      '<span class="meta">' + (a.penulis ? '<span>' + esc(a.penulis) + '</span><span aria-hidden="true">·</span>' : '') +
        '<time datetime="' + esc(a.tanggal) + '">' + U.tgl(a.tanggal, true) + '</time></span>' +
    '</a>';
  }

  function kartuSematan(a) {
    return '<a class="kartu-sematan" href="#/artikel/' + encodeURIComponent(a.slug) + '">' +
      U.gambar(a.sampul, '', 'Gambar sampul', 'sampul') +
      '<div class="isi"><span class="chips"><span class="chip c-emas">' + U.ikon('sematkan', 14) + 'Disematkan</span>' +
        (a.kategori_nama ? U.chip(a.warna, a.kategori_nama) : '') + '</span>' +
        '<h2>' + esc(a.judul) + '</h2>' + (a.ringkasan ? '<p>' + esc(a.ringkasan) + '</p>' : '') +
        '<span class="meta" style="padding:0">' + U.tgl(a.tanggal) + '</span></div></a>';
  }

  function paginasi(hal, jumlah, href) {
    if (jumlah <= 1) return '';
    var h = '<nav class="paginasi" aria-label="Halaman">';
    if (hal > 1) h += '<a href="' + href(hal - 1) + '" aria-label="Sebelumnya">‹</a>';
    for (var i = 1; i <= jumlah; i++) {
      if (i === 1 || i === jumlah || Math.abs(i - hal) <= 1) h += i === hal ? '<span class="aktif" aria-current="page">' + i + '</span>' : '<a href="' + href(i) + '">' + i + '</a>';
      else if (Math.abs(i - hal) === 2) h += '<span aria-hidden="true">…</span>';
    }
    if (hal < jumlah) h += '<a href="' + href(hal + 1) + '" aria-label="Berikutnya">›</a>';
    return h + '</nav>';
  }

  App.bersama.kartuArtikel = kartu;
  App.bersama.paginasi = paginasi;

  function daftar(el, p, q) {
    var hal = Math.max(1, Number(q.halaman) || 1);
    return API.get('artikel', { kategori: q.kategori, q: q.q, halaman: hal }).then(function (d) {
      var kat = App.data().kategori || [];
      var aktif = kat.filter(function (k) { return k.slug === q.kategori; })[0];
      App.judul(aktif ? aktif.nama : 'Artikel');
      var pil = [{ slug: '', nama: 'Semua' }].concat(kat).map(function (k) {
        var on = (q.kategori || '') === k.slug;
        return '<a class="pil' + (on ? ' aktif' : '') + '"' + (on ? ' aria-current="page"' : '') + ' href="' + U.hash('artikel', { kategori: k.slug, q: q.q }) + '">' + esc(k.nama) + '</a>';
      }).join('');
      el.innerHTML = '<div class="wadah">' +
        '<header class="kepala-halaman"><h1>' + esc(aktif ? aktif.nama : 'Artikel') + '</h1>' +
          '<p>' + (q.q ? 'Hasil pencarian “' + esc(q.q) + '”' : 'Tulisan dari pengurus dan kontributor yayasan.') + '</p></header>' +
        '<div class="filter"><div class="chips" role="list" aria-label="Kategori">' + pil + '</div>' +
          '<form class="medan" id="cari-artikel" role="search" style="flex:0 1 320px"><label for="q-artikel">Cari artikel</label>' +
          '<input id="q-artikel" type="search" value="' + esc(q.q || '') + '" placeholder="Judul atau kata kunci"></form></div>' +
        (d.disematkan || []).map(kartuSematan).join('') +
        (d.items.length ? '<div class="grid">' + d.items.map(kartu).join('') + '</div>'
          : '<p class="kosong">Belum ada artikel' + (q.q || q.kategori ? ' yang cocok' : '') + '.</p>') +
        paginasi(d.halaman, d.jumlahHalaman, function (n) { return U.hash('artikel', { kategori: q.kategori, q: q.q, halaman: n }); }) +
        '<div style="height:80px"></div></div>';
      el.querySelector('#cari-artikel').onsubmit = function (ev) {
        ev.preventDefault();
        location.hash = U.hash('artikel', { kategori: q.kategori, q: el.querySelector('#q-artikel').value.trim() });
      };
    });
  }

  function baca(el, p) {
    return API.get('artikel_detail', { slug: p.slug }).then(function (a) {
      App.judul(a.judul);
      var k = a.kontributor;
      var sampulDiIsi = a.sampul && a.konten && a.konten.indexOf(a.sampul) >= 0;
      var mirror = (a.sumber !== 'internal' && k) ?
        '<div class="mirror">' + U.ikon('tautan', 18) + '<span>Dimirror dari kontributor <a href="#/kontributor/' + encodeURIComponent(k.slug) + '">' + esc(k.nama) + '</a>' +
        (a.url_asli ? ' · <a href="' + esc(a.url_asli) + '" target="_blank" rel="noopener">Baca di situs asli</a>' : '') + '</span></div>' : '';
      var teksBagikan = encodeURIComponent(a.judul + ' ' + location.href);
      var kat = App.data().kategori || [];
      el.innerHTML = '<div class="wadah"><div class="tata-baca">' +
        '<article>' +
          '<nav class="remah" aria-label="Jejak halaman"><a href="#/">Beranda</a><span aria-hidden="true">/</span><a href="#/artikel">Artikel</a>' +
            (a.kategori_nama ? '<span aria-hidden="true">/</span><a href="' + U.hash('artikel', { kategori: a.kategori }) + '">' + esc(a.kategori_nama) + '</a>' : '') + '</nav>' +
          (a.kategori_nama ? U.chip(a.warna, a.kategori_nama) : '') +
          '<h1 class="judul-artikel">' + esc(a.judul) + '</h1>' +
          '<div class="meta" style="font-size:15px;padding:0;gap:10px 20px">' +
            '<span style="display:flex;align-items:center;gap:10px">' + U.avatar(a.penulis, k && k.foto) + '<strong style="color:var(--tinta)">' + esc(a.penulis || '') + '</strong></span>' +
            '<time datetime="' + esc(a.tanggal) + '">' + U.tgl(a.tanggal) + '</time><span>' + a.menit_baca + ' menit baca</span></div>' +
          mirror +
          (a.sampul && !sampulDiIsi ? '<img src="' + esc(a.sampul) + '" alt="" style="border-radius:20px;width:100%;max-height:480px;object-fit:cover">' : '') +
          '<div class="isi-artikel">' + U.html(a.konten) + '</div>' +
          '<div class="bagikan"><strong style="margin-right:6px">Bagikan</strong>' +
            '<a class="btn btn-biru-garis btn-kecil" href="https://wa.me/?text=' + teksBagikan + '" target="_blank" rel="noopener">' + U.ikon('whatsapp', 18) + 'WhatsApp</a>' +
            '<button class="btn btn-biru-garis btn-kecil" type="button" id="salin-tautan">' + U.ikon('tautan', 18) + 'Salin tautan</button></div>' +
          (k ? '<div class="kartu profil-penulis">' + U.avatar(k.nama, k.foto, 'besar') + '<div><a href="#/kontributor/' + encodeURIComponent(k.slug) + '" style="font-weight:700;font-size:18px;color:var(--tinta);text-decoration:none">' + esc(k.nama) + '</a>' +
            (k.bio ? '<p>' + esc(k.bio) + '</p>' : '') +
            (k.website ? '<p><a href="' + esc(k.website) + '" target="_blank" rel="noopener">' + esc(U.domain(k.website)) + '</a></p>' : '') + '</div></div>' : '') +
        '</article>' +
        '<aside>' +
          (a.terkait && a.terkait.length ? '<div class="kartu sisi"><h2>Artikel terkait</h2>' + a.terkait.map(function (t) {
            return '<a class="item" href="#/artikel/' + encodeURIComponent(t.slug) + '"><span class="chip c-' + esc(t.warna) + '" style="font-size:12px">' + esc(t.kategori_nama || '') + '</span><span>' + esc(t.judul) + '</span></a>';
          }).join('') + '</div>' : '') +
          (kat.length ? '<div class="kartu sisi"><h2>Kategori</h2><div class="chips">' + kat.map(function (c) { return U.chip(c.warna, c.nama, U.hash('artikel', { kategori: c.slug })); }).join('') + '</div></div>' : '') +
        '</aside></div></div>';
      el.querySelector('#salin-tautan').onclick = function () {
        U.salin(location.href).then(function () { U.toast('Tautan disalin.'); });
      };
    });
  }

  App.modul({
    id: 'artikel',
    butuh: 'artikel',
    nav: { label: 'Artikel', href: '#/artikel' },
    rute: [
      { pola: 'artikel', render: daftar },
      { pola: 'artikel/:slug', render: baca }
    ],
    beranda: [
      {
        urutan: 10,
        render: function (d) {
          var list = (d.artikel && d.artikel.pengumuman) || [];
          if (!list.length) return '';
          return '<div class="wadah" style="padding-bottom:64px"><section class="kartu info" aria-labelledby="h-info">' +
            '<div class="info-kepala"><h2 id="h-info">Info Yayasan</h2><span class="redup" style="font-size:15px">Pengumuman dan kabar terbaru.</span>' +
            '<a href="' + U.hash('artikel', { kategori: list[0].kategori }) + '" style="font-weight:700;text-decoration:none;font-size:15px">Semua pengumuman →</a></div>' +
            '<ul>' + list.map(function (a) {
              return '<li><time datetime="' + esc(a.tanggal) + '">' + U.tgl(a.tanggal, true) + '</time><a href="#/artikel/' + encodeURIComponent(a.slug) + '">' + esc(a.judul) + '</a></li>';
            }).join('') + '</ul></section></div>';
        }
      },
      {
        urutan: 40,
        render: function (d) {
          var list = ((d.artikel && d.artikel.terbaru) || []).slice(0, 3);
          if (!list.length) return '';
          return '<section class="bagian bagian-putih" aria-labelledby="h-terbaru"><div class="wadah">' +
            '<div class="kepala-bagian"><h2 id="h-terbaru">Artikel Terbaru</h2><a href="#/artikel">Semua artikel →</a></div>' +
            '<div class="grid">' + list.map(kartu).join('') + '</div></div></section>';
        }
      }
    ]
  });
})();
