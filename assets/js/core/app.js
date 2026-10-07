/**
 * INTI WEBSITE: registri modul, router, kerangka halaman (header, footer, banner).
 * ------------------------------------------------------------------
 * Modul mendaftar dengan:
 *
 *   App.modul({
 *     id: 'kajian',                     // = nama file modules/kajian.js
 *     butuh: 'kajian',                  // modul backend yang dibutuhkan (opsional)
 *     nav: { label: 'Kajian', href: '#/kajian', tombol: false },
 *     rute: [{ pola: 'kajian', render: function (el, params, query) { ... } }],
 *     beranda: [{ urutan: 20, render: function (data) { return '<section>…</section>'; } }]
 *   });
 */
var App = (function () {
  'use strict';

  var modul = {}, rute = [], data = {}, token = 0, galatAwal = '', langkah = 0, saatPindahCb = [];
  var V = '?v=' + encodeURIComponent(KONFIG.VERSI || '1');
  function $(id) { return document.getElementById(id); }

  function daftar(def) {
    if (!def || !def.id) return;
    if (data.modul && def.butuh && data.modul.indexOf(def.butuh) < 0) return; // backend mematikan modul ini
    modul[def.id] = def;
    (def.rute || []).forEach(function (r) {
      var segs = r.pola.split('/').filter(Boolean);
      rute.push({ modul: def.id, segs: segs, render: r.render,
        skor: segs.reduce(function (n, s) { return n + (s.charAt(0) === ':' ? 1 : 3); }, 0) });
    });
    rute.sort(function (a, b) { return b.skor - a.skor; });
  }

  var antre = [];
  /** Dipanggil oleh setiap file modul. Pendaftaran ditunda sampai bootstrap selesai. */
  function modulBaru(def) { antre.push(def); }

  function mulai() {
    var tunggu = [];
    if (!KONFIG.API_URL) {
      $('pita-demo').innerHTML = '<div class="demo-pita">Mode demo: memakai data contoh. Isi <code>API_URL</code> di <code>assets/js/config.js</code> untuk menyambung ke Google Apps Script.</div>';
      tunggu.push(U.muatSkrip('assets/js/core/demo.js' + V));
    }
    return Promise.all(tunggu).then(function () {
      return Promise.all(KONFIG.MODUL.map(function (id) {
        return U.muatSkrip('assets/js/modules/' + id + '.js' + V).catch(function (e) { console.warn(e.message); });
      }));
    }).then(function () {
      return API.get('bootstrap').catch(function (e) { galatAwal = e.message; return {}; });
    }).then(function (b) {
      data = b || {};
      data.situs = data.situs || {};
      antre.sort(function (a, b) { return KONFIG.MODUL.indexOf(a.id) - KONFIG.MODUL.indexOf(b.id); }).forEach(daftar);
      kerangka();
      window.addEventListener('hashchange', navigasi);
      navigasi();
    });
  }

  /* ---------------- Kerangka ---------------- */

  function kerangka() {
    var s = data.situs, nama = s.nama_yayasan || '';
    document.title = nama || 'Beranda';
    var meta = document.querySelector('meta[name=description]');
    if (meta && s.deskripsi) meta.setAttribute('content', s.deskripsi);
    if (data.feed) {
      var l = document.createElement('link');
      l.rel = 'alternate'; l.type = 'application/rss+xml'; l.title = nama || 'RSS'; l.href = data.feed;
      document.head.appendChild(l);
    }
    $('logo').innerHTML = '<span class="logo-tanda' + (s.logo ? ' ada-gambar' : '') + '">' + (s.logo ? '<img src="' + U.esc(U.urlGambar(s.logo)) + '" alt="Logo ' + U.esc(nama) + '">' : '<span style="color:#fff">' + U.ikon('buku', 22) + '</span>') + '</span>' +
      '<span class="logo-nama">' + U.esc(nama) + '</span>';

    var navs = Object.keys(modul).map(function (id) { return modul[id]; }).filter(function (m) { return m.nav; });
    $('nav').innerHTML = navs.map(function (m) {
      return '<a href="' + U.esc(m.nav.href) + '" data-modul="' + U.esc(m.id) + '"' + (m.nav.tombol ? ' class="nav-tombol"' : '') + '>' + U.esc(m.nav.label) + '</a>';
    }).join('');
    var btn = $('menu-btn');
    btn.innerHTML = U.ikon('menu', 22);
    btn.onclick = function () {
      var buka = $('nav').classList.toggle('buka');
      btn.setAttribute('aria-expanded', buka ? 'true' : 'false');
      btn.innerHTML = U.ikon(buka ? 'tutup' : 'menu', 22);
    };
    $('nav').addEventListener('click', function (ev) {
      if (ev.target.closest('a')) { $('nav').classList.remove('buka'); btn.setAttribute('aria-expanded', 'false'); btn.innerHTML = U.ikon('menu', 22); }
    });

    sematan();
    footer(navs);
  }

  function sematan() {
    var b = data.sematan, el = $('sematan');
    if (!b) { el.innerHTML = ''; return; }
    var kunci = 'tutup-sematan:' + b.judul;
    try { if (sessionStorage.getItem(kunci)) return; } catch (e) {}
    var luar = /^https?:/i.test(b.tautan || '');
    el.innerHTML = '<section class="sematan w-' + U.esc(b.warna || 'karat') + '" aria-label="Pengumuman disematkan"><div class="wadah">' +
      '<span class="sematan-label">' + U.ikon('sematkan', 16) + U.esc(b.jenis || 'Pengumuman') + '</span>' +
      '<span class="sematan-judul">' + U.esc(b.judul) +
        (b.target ? ' — terkumpul ' + U.rupiah(b.terkumpul) + ' dari ' + U.rupiah(b.target) : '') + '</span>' +
      (b.persen != null ? '<span class="sematan-progres"><span class="bar"><span style="width:' + Math.max(2, b.persen) + '%"></span></span>' + b.persen + '%</span>' : '') +
      '<span class="sematan-aksi"><a href="' + U.esc(b.tautan || '#/donasi') + '"' + (luar ? ' target="_blank" rel="noopener"' : '') + '>' + U.esc(b.teks_tombol || 'Selengkapnya') + '</a>' +
      '<button type="button" class="sematan-tutup" aria-label="Tutup pengumuman">' + U.ikon('tutup', 18) + '</button></span>' +
      '</div></section>';
    el.querySelector('.sematan-tutup').onclick = function () {
      try { sessionStorage.setItem(kunci, '1'); } catch (e) {}
      el.innerHTML = '';
    };
  }

  function footer(navs) {
    var s = data.situs, nama = s.nama_yayasan || '';
    var kontak = [];
    if (s.telepon_wa && U.normalWa(s.telepon_wa)) kontak.push('<a href="https://wa.me/' + U.normalWa(s.telepon_wa) + '" target="_blank" rel="noopener">' + U.ikon('whatsapp', 16) + U.esc(s.telepon_wa) + '</a>');
    if (s.email) kontak.push('<a href="mailto:' + U.esc(s.email) + '">' + U.ikon('email', 16) + U.esc(s.email) + '</a>');
    var tautan = navs.map(function (m) { return '<a href="' + U.esc(m.nav.href) + '">' + U.esc(m.nav.label) + '</a>'; });
    if (data.feed) tautan.push('<a href="' + U.esc(data.feed) + '" target="_blank" rel="noopener">' + U.ikon('rss', 16) + 'RSS</a>');
    $('footer').innerHTML = '<div class="wadah">' +
      '<div class="kiri">' + (nama ? '<span class="nama">' + U.esc(nama) + '</span>' : '') +
        (s.alamat ? '<span>' + U.esc(s.alamat) + '</span>' : '') +
        (s.sk_kemenkumham ? '<span>SK Kemenkumham: ' + U.esc(s.sk_kemenkumham) + '</span>' : '') +
        (kontak.length ? '<span style="display:flex;flex-wrap:wrap;gap:0 18px">' + kontak.join('') + '</span>' : '') +
      '</div>' +
      '<nav aria-label="Menu bawah">' + tautan.join('') + '</nav></div>' +
      '<div class="wadah bawah">© ' + new Date().getFullYear() + (nama ? ' ' + U.esc(nama) : '') + '</div>';
  }

  /* ---------------- Router ---------------- */

  function cocok(segs, path) {
    if (segs.length !== path.length) return null;
    var p = {};
    for (var i = 0; i < segs.length; i++) {
      if (segs[i].charAt(0) === ':') p[segs[i].slice(1)] = decodeURIComponent(path[i]);
      else if (segs[i] !== path[i]) return null;
    }
    return p;
  }

  function navigasi() {
    var h = location.hash || '';
    if (h && h.indexOf('#/') !== 0) {           // tautan jangkar biasa, mis. #app
      var t = document.getElementById(h.slice(1));
      if (t) t.focus();
      return;
    }
    // bersihkan sisa halaman sebelumnya (mis. tema mode baca, pendengar scroll)
    var cb = saatPindahCb; saatPindahCb = [];
    cb.forEach(function (f) { try { f(); } catch (e) { /* abaikan */ } });
    langkah++;
    var isi = h.replace(/^#\/?/, '').split('?');
    var path = isi[0].split('/').filter(Boolean);
    var query = {};
    new URLSearchParams(isi[1] || '').forEach(function (v, k) { query[k] = v; });

    var r = null, params = null;
    for (var i = 0; i < rute.length; i++) { params = cocok(rute[i].segs, path); if (params) { r = rute[i]; break; } }

    document.querySelectorAll('#nav a').forEach(function (a) {
      var aktif = r && a.getAttribute('data-modul') === r.modul;
      a.classList.toggle('aktif', !!aktif);
      if (aktif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    var app = $('app'), wadah = document.createElement('div');
    app.innerHTML = '';
    app.appendChild(wadah);
    var t2 = ++token;
    if (galatAwal && !data.situs.nama_yayasan) { wadah.innerHTML = galat(new Error(galatAwal)); return; }
    if (!r) {
      judul('Halaman tidak ditemukan');
      wadah.innerHTML = '<div class="wadah kosong"><h1 class="display" style="font-size:40px;margin-bottom:12px">Halaman tidak ditemukan</h1><p><a class="btn btn-utama" href="#/">Kembali ke beranda</a></p></div>';
      return;
    }
    wadah.innerHTML = muat();
    Promise.resolve().then(function () { return r.render(wadah, params, query); })
      .catch(function (e) { if (t2 === token) wadah.innerHTML = galat(e); })
      .then(function () {
        if (t2 !== token) return;
        var tujuan = query.bagian && document.getElementById(query.bagian);
        if (tujuan) tujuan.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo(0, 0);
      });
    app.focus({ preventScroll: true });
  }

  /* ---------------- Helper tampilan ---------------- */

  function judul(t) {
    var nama = data.situs.nama_yayasan || '';
    document.title = t ? t + (nama ? ' · ' + nama : '') : (nama || 'Beranda');
  }
  function muat() { return '<div class="muat" role="status" aria-label="Memuat"><span></span></div>'; }
  function galat(e) {
    return '<div class="wadah kosong"><p class="galat" style="display:inline-block"' + (e && e.teknis ? ' title="' + U.esc(e.teknis) + '"' : '') + '>' + U.esc((e && e.message) || 'Terjadi kesalahan.') +
      '</p><p><button class="btn btn-biru-garis btn-kecil" type="button" onclick="App.ulang()">Coba lagi</button></p></div>';
  }
  function ulang() {
    try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf('api:') === 0) sessionStorage.removeItem(k); }); } catch (e) {}
    navigasi();
  }

  /** Bagian beranda dari semua modul, terurut. */
  function bagianBeranda() {
    var out = [];
    Object.keys(modul).forEach(function (id) { (modul[id].beranda || []).forEach(function (b) { out.push(b); }); });
    return out.sort(function (a, b) { return (a.urutan || 50) - (b.urutan || 50); });
  }

  return {
    modul: modulBaru, mulai: mulai, judul: judul, muat: muat, galat: galat, ulang: ulang,
    bagianBeranda: bagianBeranda,
    punya: function (id) { return !!modul[id]; },
    /** Daftarkan fungsi yang dijalankan sekali saat pengunjung pindah halaman. */
    saatPindah: function (f) { saatPindahCb.push(f); },
    /** true bila pengunjung datang dari halaman lain di website ini (tombol Kembali aman). */
    bisaKembali: function () { return langkah > 1; },
    data: function () { return data; },
    bersama: {} // fungsi tampilan yang dipakai lintas modul, mis. App.bersama.kartuArtikel
  };
})();
