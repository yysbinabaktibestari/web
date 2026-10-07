/* Modul BERANDA: hero + bagian-bagian yang disumbang modul lain. */
App.modul({
  id: 'beranda',
  nav: { label: 'Beranda', href: '#/' },
  rute: [{
    pola: '',
    render: function (el) {
      var s = App.data().situs;
      App.judul('');
      return API.get('beranda').then(function (d) {
        var aksi = [];
        if (App.punya('artikel')) aksi.push('<a class="btn btn-utama" href="#/artikel">Baca Artikel</a>');
        if (App.punya('profil')) aksi.push('<a class="btn btn-garis" href="#/tentang">Kenali Yayasan</a>');
        var hero = '<div class="wadah"><section class="hero' + (s.foto_hero ? '' : ' hero-tanpa-foto') + '">' +
          '<div class="hero-teks">' +
            (s.tagline ? '<span class="label-atas">' + U.esc(s.tagline) + '</span>' : '') +
            '<h1>' + U.esc(s.judul_hero || s.nama_yayasan || 'Selamat datang') + '</h1>' +
            (s.deskripsi ? '<p>' + U.esc(s.deskripsi) + '</p>' : '') +
            (aksi.length ? '<div class="hero-aksi">' + aksi.join('') + '</div>' : '') +
          '</div>' +
          (s.foto_hero ? U.gambar(s.foto_hero, 'Kegiatan ' + (s.nama_yayasan || ''), '', 'hero-gambar') : '') +
        '</section></div>';
        var bagian = App.bagianBeranda().map(function (b) {
          try { return b.render(d) || ''; } catch (e) { console.warn(e); return ''; }
        });
        el.innerHTML = hero + bagian.join('');
      });
    }
  }]
});
