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
      '<span class="meta">' + (a.penulis ? '<span class="penulis-kecil">' + (a.kontributor ? U.avatar(a.penulis, a.kontributor.foto, 'kecil') : '') + esc(a.penulis) + '</span><span aria-hidden="true">·</span>' : '') +
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

  /** Baris filter penulis/kontributor + kartu perkenalan saat salah satu dipilih. */
  function filterPenulis(q) {
    var data = App.data(), kon = data.kontributor || [];
    if (!kon.length) return '';
    var nama = data.situs.nama_yayasan || 'Yayasan';
    var pilihan = [{ slug: '', nama: 'Semua penulis' }, { slug: 'yayasan', nama: nama, logo: data.situs.logo, yayasan: true }].concat(kon);
    var baris = pilihan.map(function (k) {
      var on = (q.kontributor || '') === k.slug;
      var ikon = k.slug === '' ? '' : k.yayasan
        ? '<span class="avatar kecil' + (k.logo ? ' avatar-logo' : '') + '" style="' + (k.logo ? '' : 'background:var(--biru);color:#fff') + '">' + (k.logo ? '<img src="' + esc(U.urlGambar(k.logo)) + '" alt="" class="gambar-lindung" draggable="false">' : U.ikon('buku', 14)) + '</span>'
        : U.avatar(k.nama, k.foto, 'kecil');
      return '<a class="pil pil-penulis' + (on ? ' aktif' : '') + '"' + (on ? ' aria-current="page"' : '') + ' href="' +
        U.hash('artikel', { kontributor: k.slug, kategori: q.kategori }) + '">' + ikon + '<span>' + esc(k.nama) + '</span>' +
        (k.jumlah_artikel ? '<span class="jumlah">' + k.jumlah_artikel + '</span>' : '') + '</a>';
    }).join('');
    var kenalan = '';
    var dipilih = kon.filter(function (k) { return k.slug === q.kontributor; })[0];
    if (dipilih) {
      kenalan = '<div class="kartu kenalan">' + U.avatar(dipilih.nama, dipilih.foto, 'besar') +
        '<div style="flex:1 1 280px;min-width:0;display:flex;flex-direction:column;gap:6px"><span class="chip c-biru">Kontributor</span>' +
        '<h2 class="display" style="font-size:26px">' + esc(dipilih.nama) + '</h2>' +
        (dipilih.bio ? '<p class="redup" style="margin:0">' + esc(dipilih.bio) + '</p>' : '') +
        '<span style="display:flex;flex-wrap:wrap;gap:8px 18px;font-weight:600;font-size:15px">' +
          '<a href="#/kontributor/' + encodeURIComponent(dipilih.slug) + '">Profil lengkap →</a>' +
          (dipilih.website ? '<a href="' + esc(dipilih.website) + '" target="_blank" rel="noopener">' + esc(U.domain(dipilih.website)) + '</a>' : '') +
        '</span></div></div>';
    } else if (q.kontributor === 'yayasan') {
      kenalan = '<div class="kartu kenalan"><div><span class="chip c-emas">Tulisan internal</span><h2 class="display" style="font-size:26px;margin-top:6px">' + esc(nama) + '</h2>' +
        '<p class="redup" style="margin:4px 0 0">Artikel yang ditulis pengurus dan tim ' + esc(nama) + '.</p></div></div>';
    }
    return '<div class="filter-penulis"><span class="label">Penulis</span><div class="baris-penulis" role="list" aria-label="Filter penulis">' + baris + '</div></div>' + kenalan;
  }

  function daftar(el, p, q) {
    var hal = Math.max(1, Number(q.halaman) || 1);
    return API.get('artikel', { kategori: q.kategori, kontributor: q.kontributor, q: q.q, halaman: hal }).then(function (d) {
      var kat = App.data().kategori || [];
      var aktif = kat.filter(function (k) { return k.slug === q.kategori; })[0];
      App.judul(aktif ? aktif.nama : 'Artikel');
      var pil = [{ slug: '', nama: 'Semua' }].concat(kat).map(function (k) {
        var on = (q.kategori || '') === k.slug;
        return '<a class="pil' + (on ? ' aktif' : '') + '"' + (on ? ' aria-current="page"' : '') + ' href="' + U.hash('artikel', { kategori: k.slug, kontributor: q.kontributor, q: q.q }) + '">' + esc(k.nama) + '</a>';
      }).join('');
      el.innerHTML = '<div class="wadah">' +
        '<header class="kepala-halaman"><h1>' + esc(aktif ? aktif.nama : 'Artikel') + '</h1>' +
          '<p>' + (q.q ? 'Hasil pencarian “' + esc(q.q) + '”' : 'Tulisan dari pengurus dan kontributor yayasan, disusun bergiliran antar penulis.') + '</p></header>' +
        '<div class="filter"><div class="chips" role="list" aria-label="Kategori">' + pil + '</div>' +
          '<form class="medan" id="cari-artikel" role="search" style="flex:0 1 320px"><label for="q-artikel">Cari artikel</label>' +
          '<input id="q-artikel" type="search" value="' + esc(q.q || '') + '" placeholder="Judul atau kata kunci"></form></div>' +
        filterPenulis(q) +
        (d.disematkan || []).map(kartuSematan).join('') +
        (d.items.length ? '<div class="grid">' + d.items.map(kartu).join('') + '</div>'
          : '<p class="kosong">Belum ada artikel' + (q.q || q.kategori || q.kontributor ? ' yang cocok' : '') + '.</p>') +
        paginasi(d.halaman, d.jumlahHalaman, function (n) { return U.hash('artikel', { kategori: q.kategori, kontributor: q.kontributor, q: q.q, halaman: n }); }) +
        '<div style="height:80px"></div></div>';
      el.querySelector('#cari-artikel').onsubmit = function (ev) {
        ev.preventDefault();
        location.hash = U.hash('artikel', { kategori: q.kategori, kontributor: q.kontributor, q: el.querySelector('#q-artikel').value.trim() });
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
          (a.sampul && !sampulDiIsi ? '<img src="' + esc(U.urlGambar(a.sampul)) + '" alt="" style="border-radius:20px;width:100%;max-height:480px;object-fit:cover">' : '') +
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
      modeBaca(el, a);
    });
  }

  /* ================================================================
   * MODE BACA: progres baca, bilah bawah (Kembali · Tampilan · Ke atas · Bagikan),
   * pilihan huruf serif/sans, ukuran huruf, tema terang/krem/gelap, dan
   * "lanjutkan membaca" dari posisi terakhir. Pilihan disimpan di perangkat pembaca.
   * ============================================================== */
  var UKURAN = [16, 17, 18, 19, 21, 23, 25];
  var TEMA = [{ id: 'terang', nama: 'Terang' }, { id: 'krem', nama: 'Krem' }, { id: 'gelap', nama: 'Gelap' }];

  function prefBaca() {
    var p = {};
    try { p = JSON.parse(U.bacaLokal('pref_baca') || '{}') || {}; } catch (e) { p = {}; }
    return { huruf: p.huruf === 'sans' ? 'sans' : 'serif', ukuran: UKURAN.indexOf(p.ukuran) >= 0 ? p.ukuran : null,
      tema: TEMA.some(function (t) { return t.id === p.tema; }) ? p.tema : 'terang' };
  }

  function terapkanPref(p) {
    var r = document.documentElement;
    if (p.tema === 'terang') delete r.dataset.tema; else r.dataset.tema = p.tema;
    r.style.setProperty('--f-isi', p.huruf === 'sans' ? 'var(--f-teks)' : 'var(--f-baca)');
    if (p.ukuran) r.style.setProperty('--ukuran-baca', p.ukuran + 'px'); else r.style.removeProperty('--ukuran-baca');
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', p.tema === 'gelap' ? '#12161C' : p.tema === 'krem' ? '#F4ECD8' : '#18548C');
  }

  function modeBaca(el, a) {
    var pref = prefBaca();
    terapkanPref(pref);
    var kunci = 'baca:' + a.slug;

    var bilah = document.createElement('div');
    bilah.innerHTML =
      '<div class="progres-baca" aria-hidden="true"><span></span></div>' +
      '<div class="lanjut-baca" hidden role="status"><span></span><button type="button" class="lanjut-ya">Lanjutkan</button>' +
        '<button type="button" class="lanjut-tutup" aria-label="Tutup">' + U.ikon('tutup', 16) + '</button></div>' +
      '<nav class="bilah-baca" aria-label="Alat baca">' +
        '<button type="button" data-aksi="kembali">' + U.ikon('kembali', 22) + '<span>Kembali</span></button>' +
        '<button type="button" data-aksi="tampilan" aria-haspopup="dialog" aria-expanded="false">' + U.ikon('huruf', 22) + '<span>Tampilan</span></button>' +
        '<button type="button" data-aksi="atas">' + U.ikon('atas', 22) + '<span>Ke atas</span></button>' +
        '<button type="button" data-aksi="bagikan" class="utama">' + U.ikon('bagikan', 22) + '<span>Bagikan</span></button>' +
      '</nav>' +
      '<div class="panel-tampilan" role="dialog" aria-modal="false" aria-label="Pengaturan tampilan" hidden>' +
        '<div class="panel-kepala"><strong>Tampilan</strong><button type="button" data-aksi="tutup-panel" aria-label="Tutup">' + U.ikon('tutup', 18) + '</button></div>' +
        '<div class="panel-baris"><span>Huruf</span><div class="segmen" role="group" aria-label="Jenis huruf">' +
          '<button type="button" data-huruf="serif" class="huruf-serif">Serif</button><button type="button" data-huruf="sans" class="huruf-sans">Sans</button></div></div>' +
        '<div class="panel-baris"><span>Ukuran</span><div class="segmen ukuran" role="group" aria-label="Ukuran huruf">' +
          '<button type="button" data-ukuran="-1" aria-label="Perkecil huruf">A−</button><output></output><button type="button" data-ukuran="1" aria-label="Perbesar huruf">A+</button></div></div>' +
        '<div class="panel-baris"><span>Tema</span><div class="segmen" role="group" aria-label="Tema warna">' +
          TEMA.map(function (t) { return '<button type="button" data-tema="' + t.id + '"><i class="contoh-tema t-' + t.id + '"></i>' + t.nama + '</button>'; }).join('') + '</div></div>' +
      '</div>';
    el.appendChild(bilah);
    el.classList.add('ada-bilah-baca');
    var isi = el.querySelector('.isi-artikel');
    var garis = bilah.querySelector('.progres-baca span'), panel = bilah.querySelector('.panel-tampilan');
    var tombolTampilan = bilah.querySelector('[data-aksi=tampilan]'), lanjut = bilah.querySelector('.lanjut-baca');

    function ukuranSekarang() {
      if (pref.ukuran) return pref.ukuran;
      return Math.round(parseFloat(getComputedStyle(isi).fontSize)) || 19;
    }
    function segarkanPanel() {
      panel.querySelectorAll('[data-huruf]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.huruf === pref.huruf)); });
      panel.querySelectorAll('[data-tema]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tema === pref.tema)); });
      var u = ukuranSekarang();
      panel.querySelector('output').textContent = u + ' px';
      panel.querySelector('[data-ukuran="-1"]').disabled = u <= UKURAN[0];
      panel.querySelector('[data-ukuran="1"]').disabled = u >= UKURAN[UKURAN.length - 1];
    }
    function simpan() { U.simpanLokal('pref_baca', JSON.stringify(pref)); terapkanPref(pref); segarkanPanel(); hitung(); }
    function bukaPanel(buka) {
      panel.hidden = !buka;
      tombolTampilan.setAttribute('aria-expanded', String(buka));
      if (buka) { segarkanPanel(); panel.querySelector('button[aria-pressed=true]').focus(); }
    }

    // posisi baca: 0 = awal isi artikel, 1 = akhir
    function batas() {
      var r = isi.getBoundingClientRect(), awal = r.top + window.scrollY - 80;
      return { awal: awal, akhir: Math.max(awal + 1, r.bottom + window.scrollY - window.innerHeight * 0.75) };
    }
    var tSimpan = 0;
    function hitung() {
      if (!document.body.contains(bilah)) return lepas();
      var b = batas(), p = Math.min(1, Math.max(0, (window.scrollY - b.awal) / (b.akhir - b.awal)));
      garis.style.transform = 'scaleX(' + p + ')';
      if (p > 0.03 && !lanjut.hidden && window.scrollY > 300) lanjut.hidden = true;
      var kini = Date.now();
      if (kini - tSimpan > 1500) {
        tSimpan = kini;
        if (p >= 0.97) U.simpanLokal(kunci, null);
        else if (p > 0.03) U.simpanLokal(kunci, JSON.stringify({ p: Math.round(p * 1000) / 1000, t: kini }));
      }
    }
    var antre = false;
    function gulir() { if (!antre) { antre = true; requestAnimationFrame(function () { antre = false; hitung(); }); } }
    function lepas() {
      window.removeEventListener('scroll', gulir);
      window.removeEventListener('resize', gulir);
      document.removeEventListener('keydown', esc);
    }
    function esc(ev) { if (ev.key === 'Escape' && !panel.hidden) { bukaPanel(false); tombolTampilan.focus(); } }
    window.addEventListener('scroll', gulir, { passive: true });
    window.addEventListener('resize', gulir);
    document.addEventListener('keydown', esc);
    App.saatPindah(function () {
      lepas();
      var r = document.documentElement;
      delete r.dataset.tema;
      r.style.removeProperty('--ukuran-baca'); r.style.removeProperty('--f-isi');
      var meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.setAttribute('content', '#18548C');
    });

    bilah.addEventListener('click', function (ev) {
      var t = ev.target.closest('button');
      if (!t) return;
      var aksi = t.dataset.aksi;
      if (aksi === 'kembali') { if (App.bisaKembali()) history.back(); else location.hash = '#/artikel'; }
      else if (aksi === 'tampilan') bukaPanel(panel.hidden);
      else if (aksi === 'tutup-panel') { bukaPanel(false); tombolTampilan.focus(); }
      else if (aksi === 'atas') { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (aksi === 'bagikan') {
        if (navigator.share) navigator.share({ title: a.judul, url: location.href }).catch(function () {});
        else U.salin(location.href).then(function () { U.toast('Tautan artikel disalin.'); });
      }
      else if (t.dataset.huruf) { pref.huruf = t.dataset.huruf; simpan(); }
      else if (t.dataset.tema) { pref.tema = t.dataset.tema; simpan(); }
      else if (t.dataset.ukuran) {
        var u = ukuranSekarang(), arah = Number(t.dataset.ukuran);
        var berikut = arah > 0 ? UKURAN.filter(function (x) { return x > u; })[0] : UKURAN.filter(function (x) { return x < u; }).pop();
        if (berikut) { pref.ukuran = berikut; simpan(); }
      }
      else if (t.classList.contains('lanjut-ya')) {
        var s = JSON.parse(U.bacaLokal(kunci) || '{}'), b = batas();
        lanjut.hidden = true;
        window.scrollTo({ top: b.awal + (s.p || 0) * (b.akhir - b.awal), behavior: 'smooth' });
      }
      else if (t.classList.contains('lanjut-tutup')) { lanjut.hidden = true; U.simpanLokal(kunci, null); }
    });
    document.addEventListener('click', function tutupLuar(ev) {
      if (!document.body.contains(bilah)) return document.removeEventListener('click', tutupLuar);
      if (!panel.hidden && !panel.contains(ev.target) && !tombolTampilan.contains(ev.target)) bukaPanel(false);
    });

    // tawarkan melanjutkan dari posisi terakhir
    var simpanan = null;
    try { simpanan = JSON.parse(U.bacaLokal(kunci) || 'null'); } catch (e) { simpanan = null; }
    if (simpanan && simpanan.p > 0.05 && simpanan.p < 0.95) {
      lanjut.querySelector('span').textContent = 'Terakhir dibaca ' + Math.round(simpanan.p * 100) + '%';
      lanjut.hidden = false;
      setTimeout(function () { lanjut.hidden = true; }, 12000);
    }
    setTimeout(hitung, 50);
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
