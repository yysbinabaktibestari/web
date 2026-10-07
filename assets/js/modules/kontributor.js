/* Modul KONTRIBUTOR: daftar kontributor, profil + artikelnya, formulir pendaftaran (setor link folder / feed). */
(function () {
  'use strict';
  var esc = U.esc;

  function kartu(k) {
    return '<a class="kartu kartu-kontributor" href="#/kontributor/' + encodeURIComponent(k.slug) + '">' +
      '<span class="atas">' + U.avatar(k.nama, k.foto) + '<span><h3>' + esc(k.nama) + '</h3>' +
        (k.website ? '<span class="redup" style="font-size:14px">' + esc(U.domain(k.website)) + '</span>' : '') + '</span></span>' +
      (k.bio ? '<p>' + esc(k.bio) + '</p>' : '') +
      '<span class="meta" style="padding:0">' + (k.jumlah_artikel || 0) + ' artikel</span></a>';
  }

  function kartuAjak() {
    if (!(App.data().fitur || {}).pendaftaranKontributor) return '';
    return '<a class="kartu kartu-ajak" href="#/kontributor/daftar" style="text-decoration:none;color:var(--tinta)">' +
      '<span style="color:var(--biru)">' + U.ikon('lainnya', 28) + '</span><h3 style="font-size:19px">Jadi kontributor</h3>' +
      '<p class="redup" style="margin:0;font-size:15px">Cukup setor link folder Google Drive atau feed website Anda.</p></a>';
  }

  function daftar(el) {
    App.judul('Kontributor');
    return API.get('kontributor').then(function (list) {
      el.innerHTML = '<div class="wadah"><header class="kepala-halaman"><h1>Kontributor</h1>' +
        '<p>Penulis dan lembaga mitra yang tulisannya ikut ditayangkan di sini. Setiap artikel tetap mencantumkan penulis dan situs aslinya.</p></header>' +
        '<div class="grid" style="padding-bottom:80px">' + list.map(kartu).join('') + kartuAjak() + '</div></div>';
      if (!list.length && !kartuAjak()) el.querySelector('.grid').outerHTML = '<p class="kosong">Belum ada kontributor.</p>';
    });
  }

  function profil(el, p, q) {
    var hal = Math.max(1, Number(q.halaman) || 1);
    return API.get('kontributor_detail', { slug: p.slug, halaman: hal }).then(function (k) {
      App.judul(k.nama);
      var kartuA = App.bersama.kartuArtikel || function (a) { return '<a href="#/artikel/' + encodeURIComponent(a.slug) + '">' + esc(a.judul) + '</a>'; };
      el.innerHTML = '<div class="wadah">' +
        '<section class="profil-atas">' + U.avatar(k.nama, k.foto, 'besar') +
          '<div class="teks"><span class="chip c-biru">Kontributor</span><h1>' + esc(k.nama) + '</h1>' +
          (k.bio ? '<p>' + esc(k.bio) + '</p>' : '') +
          (k.website ? '<a href="' + esc(k.website) + '" target="_blank" rel="noopener" style="display:inline-flex;gap:8px;align-items:center;font-weight:600">' + U.ikon('web', 18) + esc(U.domain(k.website)) + '</a>' : '') +
          '</div></section>' +
        '<div class="kepala-bagian"><h2>Artikel (' + k.total + ')</h2></div>' +
        (k.artikel.length ? '<div class="grid">' + k.artikel.map(kartuA).join('') + '</div>' : '<p class="kosong">Belum ada artikel yang tayang.</p>') +
        (App.bersama.paginasi ? App.bersama.paginasi(k.halaman, k.jumlahHalaman, function (n) { return U.hash('kontributor/' + k.slug, { halaman: n }); }) : '') +
        '<div style="height:80px"></div></div>';
    });
  }

  function formDaftar(el) {
    App.judul('Jadi Kontributor');
    if (!(App.data().fitur || {}).pendaftaranKontributor) {
      el.innerHTML = '<div class="wadah kosong"><p>Pendaftaran kontributor sedang ditutup.</p><a class="btn btn-utama" href="#/kontributor">Lihat kontributor</a></div>';
      return;
    }
    el.innerHTML = '<div class="wadah">' +
      '<header class="kepala-halaman"><span class="label-atas">Mirroring tanpa hub</span><h1>Jadi Kontributor</h1>' +
      '<p>Tetap menulis di tempat Anda sendiri. Kami menayangkan ulang tulisan Anda lengkap dengan nama, biografi, dan tautan ke situs asli.</p></header>' +
      '<div class="dua-kolom">' +
        '<div style="display:flex;flex-direction:column;gap:20px">' +
          '<section class="kartu" style="padding:24px;display:flex;flex-direction:column;gap:14px"><h2 class="display" style="font-size:24px">Cara 1 · Folder Google Drive</h2>' +
            '<ol class="langkah">' +
              '<li><span>Buat satu folder di Google Drive. Isi dengan <strong>Google Docs</strong>: satu Doc = satu artikel, nama file = judul.</span></li>' +
              '<li><span>Opsional: buat subfolder dengan nama kategori (mis. <em>Pendidikan</em>) untuk mengelompokkan tulisan.</span></li>' +
              '<li><span>Klik <strong>Bagikan › Akses umum › Siapa saja yang memiliki link › Pelihat</strong>, lalu salin link folder.</span></li>' +
              '<li><span>Tempel link folder di formulir. Gambar pertama di Doc otomatis menjadi sampul.</span></li>' +
            '</ol></section>' +
          '<section class="kartu" style="padding:24px;display:flex;flex-direction:column;gap:12px"><h2 class="display" style="font-size:24px">Cara 2 · Feed website</h2>' +
            '<p style="margin:0">Punya website sendiri? Tempel alamat feed-nya. Didukung RSS, Atom, dan JSON Feed, misalnya:</p>' +
            '<ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px;font-size:15px">' +
              '<li>WordPress: <code>https://situsanda.com/feed</code></li>' +
              '<li>Blogger: <code>https://namablog.blogspot.com/feeds/posts/default</code></li>' +
              '<li>Website yayasan lain dengan sistem ini: URL <em>JSON Feed</em>-nya</li>' +
            '</ul></section>' +
          '<p class="catatan">Tulisan baru dan perubahan tersinkron otomatis kira-kira tiap jam. Admin dapat menyembunyikan (tidak tayang) artikel tertentu kapan saja.</p>' +
        '</div>' +
        '<form class="kartu form-grid" id="form-kontributor" novalidate style="padding:24px">' +
          '<div class="medan penuh"><label for="k-nama">Nama / nama lembaga <span class="wajib">*</span></label><input id="k-nama" name="nama" required autocomplete="name"></div>' +
          '<div class="medan"><label for="k-email">Email <span class="wajib">*</span></label><input id="k-email" name="email" type="email" required autocomplete="email"></div>' +
          '<div class="medan"><label for="k-wa">WhatsApp</label><input id="k-wa" name="wa" type="tel" inputmode="tel" placeholder="08xx"></div>' +
          '<div class="medan"><label for="k-web">Website</label><input id="k-web" name="website" type="url" placeholder="https://"></div>' +
          '<div class="medan"><label for="k-foto">URL foto profil</label><input id="k-foto" name="foto" type="url" placeholder="https://"></div>' +
          '<div class="medan penuh"><label for="k-bio">Biografi singkat <span class="wajib">*</span></label><textarea id="k-bio" name="bio" required maxlength="1500"></textarea></div>' +
          '<div class="medan penuh"><label for="k-sumber">Link folder Google Drive / URL feed <span class="wajib">*</span></label><input id="k-sumber" name="sumber_url" type="url" required placeholder="https://drive.google.com/drive/folders/…"></div>' +
          '<div style="position:absolute;left:-9999px" aria-hidden="true"><label for="k-alt">Kosongkan</label><input id="k-alt" name="situs_alt" tabindex="-1" autocomplete="off"></div>' +
          '<label class="cek penuh"><input type="checkbox" name="setuju" required> <span>Saya penulis/pemilik hak tulisan tersebut dan setuju tulisan ditayangkan ulang di website ini dengan mencantumkan nama dan sumbernya.</span></label>' +
          '<div class="penuh" id="k-pesan" aria-live="polite"></div>' +
          '<button class="btn btn-utama penuh" type="submit">Kirim Pendaftaran</button>' +
        '</form>' +
      '</div></div>';

    var f = el.querySelector('#form-kontributor');
    f.onsubmit = function (ev) {
      ev.preventDefault();
      var d = {};
      Array.prototype.forEach.call(f.elements, function (x) { if (x.name) d[x.name] = x.type === 'checkbox' ? x.checked : x.value.trim(); });
      var pesan = el.querySelector('#k-pesan');
      var salah = !d.nama ? 'Nama wajib diisi.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) ? 'Email belum valid.'
        : (d.wa && !U.normalWa(d.wa)) ? 'Nomor WhatsApp belum valid.' : !d.bio ? 'Biografi wajib diisi.'
        : !/^https?:\/\//i.test(d.sumber_url) ? 'Link folder / URL feed belum valid.' : !d.setuju ? 'Mohon centang persetujuan.' : '';
      if (salah) { pesan.innerHTML = '<p class="galat" role="alert" style="margin:0">' + esc(salah) + '</p>'; return; }
      var tombol = f.querySelector('[type=submit]');
      tombol.disabled = true; tombol.textContent = 'Mengirim…';
      API.post('daftar_kontributor', d).then(function (r) {
        f.innerHTML = '<div class="penuh sukses">' + esc(r.pesan) + '</div><a class="btn btn-utama penuh" href="#/kontributor">Lihat kontributor</a>';
      }).catch(function (e) {
        tombol.disabled = false; tombol.textContent = 'Kirim Pendaftaran';
        pesan.innerHTML = '<p class="galat" role="alert" style="margin:0">' + esc(e.message) + '</p>';
      });
    };
  }

  App.modul({
    id: 'kontributor',
    butuh: 'kontributor',
    nav: { label: 'Kontributor', href: '#/kontributor' },
    rute: [
      { pola: 'kontributor', render: daftar },
      { pola: 'kontributor/daftar', render: formDaftar },
      { pola: 'kontributor/:slug', render: profil }
    ],
    beranda: [{
      urutan: 45,
      render: function (d) {
        var list = d.kontributor || [];
        if (!list.length) return '';
        return '<section class="bagian" aria-labelledby="h-kontributor"><div class="wadah">' +
          '<div class="kepala-bagian"><h2 id="h-kontributor">Kontributor</h2><a href="#/kontributor">Semua kontributor →</a></div>' +
          '<div class="grid-3">' + list.slice(0, 3).map(kartu).join('') + kartuAjak() + '</div></div></section>';
      }
    }]
  });
})();
