/**
 * TEMPLATE MODUL WEBSITE
 * ------------------------------------------------------------------
 * 1. Salin ke assets/js/modules/galeri.js (nama file = id).
 * 2. Tambahkan 'galeri' ke KONFIG.MODUL di assets/js/config.js.
 * 3. Naikkan KONFIG.VERSI agar browser memuat file baru.
 */
App.modul({
  id: 'galeri',
  butuh: 'galeri',                                  // modul backend yang dipakai (disembunyikan bila backend mematikannya)
  nav: { label: 'Galeri', href: '#/galeri' },        // hapus bila tidak perlu muncul di menu

  rute: [{
    pola: 'galeri',                                 // #/galeri ; pakai ':param' untuk bagian dinamis, mis. 'video/:id'
    render: function (el, params, query) {
      App.judul('Galeri');
      return API.get('galeri', { kategori: query.kategori }).then(function (list) {
        el.innerHTML = '<div class="wadah"><header class="kepala-halaman"><h1>Galeri</h1></header>' +
          '<div class="grid" style="padding-bottom:80px">' + list.map(function (v) {
            var id = (String(v.url).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1];
            return '<div class="kartu" style="padding:14px;display:flex;flex-direction:column;gap:10px">' +
              (id ? '<iframe style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px" src="https://www.youtube-nocookie.com/embed/' + id + '" title="' + U.esc(v.judul) + '" allowfullscreen loading="lazy"></iframe>' : '') +
              '<strong>' + U.esc(v.judul) + '</strong>' + (v.kategori ? U.chip('biru', v.kategori) : '') + '</div>';
          }).join('') + '</div></div>';
      });
    }
  }],

  // Bagian di beranda (urutan: 10 info, 20 kajian, 30 bidang, 40 artikel, 45 kontributor, 50 tautan).
  beranda: [{
    urutan: 35,
    render: function (d) {
      if (!(d.galeri || []).length) return '';
      return '<section class="wadah" style="padding-bottom:72px"><div class="kepala-bagian"><h2>Video Terbaru</h2><a href="#/galeri">Semua video →</a></div></section>';
    }
  }]
});
