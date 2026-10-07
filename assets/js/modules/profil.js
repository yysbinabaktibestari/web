/* Modul PROFIL: halaman Tentang (sejarah, visi-misi, legalitas, pengurus, bidang, tautan, kontak). */
(function () {
  'use strict';
  var esc = U.esc;

  function kartuBidang(b) {
    var tag = b.tautan ? 'a' : 'div';
    return '<' + tag + ' class="kartu bidang"' + (b.tautan ? ' href="' + esc(b.tautan) + '"' : '') + '>' +
      '<span style="color:var(--biru)">' + U.ikon(b.ikon || 'lainnya', 32) + '</span>' +
      '<h3>' + esc(b.judul) + '</h3>' + (b.deskripsi ? '<p>' + esc(b.deskripsi) + '</p>' : '') + '</' + tag + '>';
  }

  function tautanSosmed(t) {
    return '<a href="' + esc(t.url) + '" target="_blank" rel="noopener"><span style="color:var(--biru);display:inline-flex">' + U.ikon(t.ikon || 'tautan', 22) + '</span>' + esc(t.label) + '</a>';
  }

  function halaman(el) {
    var s = App.data().situs, tautan = App.data().tautan || [];
    App.judul('Tentang');
    return API.get('profil').then(function (d) {
      var misi = String(s.misi || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
      var legal = [['Akta pendirian', s.akta], ['SK Kemenkumham', s.sk_kemenkumham]].filter(function (x) { return x[1]; })
        .concat((d.pengurus || []).map(function (p) { return [p.jabatan, p.nama]; }));
      var peta = /^https:\/\/www\.google\.com\/maps\/embed/.test(s.maps_embed || '')
        ? '<iframe class="peta-embed" src="' + esc(s.maps_embed) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Peta lokasi sekretariat"></iframe>'
        : '<div class="arsir peta-embed">Peta lokasi (isi maps_embed di Pengaturan)</div>';
      var waUmum = U.normalWa(s.telepon_wa);
      el.innerHTML = '<div class="wadah">' +
        '<header class="kepala-halaman"><span class="label-atas">Tentang Kami</span><h1>' + esc(s.nama_yayasan || '') + '</h1>' +
          (s.sejarah ? '<p style="white-space:pre-line">' + esc(s.sejarah) + '</p>' : '') + '</header>' +
        '<section class="grid-3" aria-label="Visi dan misi" style="padding-bottom:56px">' +
          '<div class="visi"><h2>Visi</h2><p style="margin:0;font-size:18px">' + esc(s.visi || '') + '</p></div>' +
          '<div class="kartu misi"><h2>Misi</h2><ol>' + misi.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol></div>' +
        '</section>' +
        (legal.length ? '<section aria-labelledby="h-legal" style="padding-bottom:56px"><div class="kepala-bagian"><h2 id="h-legal">Legalitas &amp; Pengurus</h2></div>' +
          '<div class="grid-3">' + legal.map(function (x) { return '<div class="kartu data-kecil"><span>' + esc(x[0]) + '</span><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div></section>' : '') +
        ((d.bidang || []).length ? '<section aria-labelledby="h-bidang2" style="padding-bottom:64px"><div class="kepala-bagian"><h2 id="h-bidang2">Bidang Kegiatan</h2></div>' +
          '<div class="grid-3">' + d.bidang.map(kartuBidang).join('') + '</div></section>' : '') +
      '</div>' +
      (tautan.length ? '<section id="tautan" class="bagian bagian-putih" aria-labelledby="h-tautan"><div class="wadah"><div class="tautan-list">' +
        '<h2 id="h-tautan" class="display" style="font-size:30px;text-align:center;margin-bottom:8px">Tautan Yayasan</h2>' +
        tautan.map(function (t) {
          return '<a class="tautan-item" href="' + esc(t.url) + '" target="_blank" rel="noopener"><span style="color:var(--biru);display:inline-flex">' + U.ikon(t.ikon || 'tautan', 22) + '</span>' +
            '<span>' + esc(t.label) + '</span>' + (t.keterangan ? '<span class="ket">' + esc(t.keterangan) + '</span>' : '') + '</a>';
        }).join('') + '</div></div></section>' : '') +
      '<section id="kontak" class="wadah dua-kolom" aria-labelledby="h-kontak" style="padding-top:64px">' +
        '<div style="display:flex;flex-direction:column;gap:16px"><h2 id="h-kontak" class="display" style="font-size:30px">Kontak</h2>' +
          (s.alamat ? '<div class="data-kecil" style="padding:0"><span>Alamat</span><span>' + esc(s.alamat) + '</span></div>' : '') +
          (waUmum ? '<div class="data-kecil" style="padding:0"><span>WhatsApp</span><a href="https://wa.me/' + waUmum + '" target="_blank" rel="noopener">' + esc(s.telepon_wa) + '</a></div>' : '') +
          (s.email ? '<div class="data-kecil" style="padding:0"><span>Email</span><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></div>' : '') +
        '</div>' + peta + '</section>';
    });
  }

  App.modul({
    id: 'profil',
    nav: { label: 'Tentang', href: '#/tentang' },
    rute: [{ pola: 'tentang', render: halaman }],
    beranda: [
      {
        urutan: 30,
        render: function (d) {
          var b = d.bidang || [];
          if (!b.length) return '';
          return '<section class="wadah" aria-labelledby="h-bidang" style="padding-bottom:72px"><div class="kepala-bagian"><h2 id="h-bidang">Bidang Kegiatan</h2></div>' +
            '<div class="grid-3">' + b.map(kartuBidang).join('') + '</div></section>';
        }
      },
      {
        urutan: 50,
        render: function () {
          var t = App.data().tautan || [];
          if (!t.length) return '';
          return '<section class="bagian" aria-labelledby="h-ikuti"><div class="wadah"><div class="kepala-bagian"><h2 id="h-ikuti">Ikuti Kami</h2>' +
            '<a href="' + U.hash('tentang', { bagian: 'tautan' }) + '">Semua tautan →</a></div>' +
            '<div class="sosmed">' + t.slice(0, 4).map(tautanSosmed).join('') + '</div></div></section>';
        }
      }
    ]
  });
})();
