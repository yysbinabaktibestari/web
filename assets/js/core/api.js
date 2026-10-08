/* Penghubung ke backend Google Apps Script (atau data demo bila API_URL kosong). */
var API = (function () {
  'use strict';

  function urlAksi(aksi, params) {
    var q = new URLSearchParams();
    q.set('action', aksi);
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') q.set(k, params[k]);
    });
    return KONFIG.API_URL + (KONFIG.API_URL.indexOf('?') >= 0 ? '&' : '?') + q.toString();
  }

  function kunciCache(aksi, params) { return 'api:' + KONFIG.VERSI + ':' + aksi + ':' + JSON.stringify(params || {}); }
  function bacaCache(k) {
    try {
      var v = JSON.parse(sessionStorage.getItem(k) || 'null');
      if (v && v.t > Date.now() - KONFIG.CACHE_MENIT * 60000) return v.d;
    } catch (e) {}
    return null;
  }
  function tulisCache(k, d) {
    try { sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* penuh: abaikan */ }
  }

  /* Salinan di perangkat pengunjung (localStorage, maks. 7 hari): kunjungan berikutnya langsung tampil,
     data terbaru diambil diam-diam lalu halaman diperbarui bila ada perubahan. */
  var SIMPAN_HARI = 7;
  function bacaLokal(k) {
    try {
      var v = JSON.parse(localStorage.getItem(k) || 'null');
      if (v && v.t > Date.now() - SIMPAN_HARI * 864e5) return v;
    } catch (e) {}
    return null;
  }
  function tulisLokal(k, d) {
    try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d: d })); }
    catch (e) {   // penuh: buang salinan lama lalu coba sekali lagi
      try {
        Object.keys(localStorage).filter(function (x) { return x.indexOf('api:') === 0; }).forEach(function (x) { localStorage.removeItem(x); });
        localStorage.setItem(k, JSON.stringify({ t: Date.now(), d: d }));
      } catch (x) { /* abaikan */ }
    }
  }
  try {   // buang salinan dari versi website sebelumnya
    Object.keys(localStorage).forEach(function (x) { if (x.indexOf('api:') === 0 && x.indexOf('api:' + KONFIG.VERSI + ':') !== 0) localStorage.removeItem(x); });
  } catch (e) {}

  var jalan = {};        // permintaan yang sedang berjalan (agar tidak dobel)
  var dipakai = null;    // kunci data yang dipakai halaman aktif (diisi App)

  function tunggu(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** fetch dengan batas waktu (server Apps Script kadang lambat saat "bangun"). */
  function fetchBatas(url, opsi, ms) {
    if (typeof AbortController === 'undefined') return fetch(url, opsi);
    var ac = new AbortController(), t = setTimeout(function () { ac.abort(); }, ms);
    return fetch(url, Object.assign({}, opsi || {}, { signal: ac.signal })).then(function (r) { clearTimeout(t); return r; },
      function (e) { clearTimeout(t); if (e && e.name === 'AbortError') { var x = new Error('Waktu tunggu habis (' + Math.round(ms / 1000) + ' detik)'); x.batasWaktu = true; throw x; } throw e; });
  }

  /** Penjelasan teknis untuk admin (tampil di console browser & halaman cek.html). */
  function diagnosa(e) {
    if (!/\/exec(\?|$)/.test(KONFIG.API_URL)) return 'API_URL di config.js harus berakhiran /exec (URL "Aplikasi web" dari deployment).';
    if (e.status === 404) return 'HTTP 404 dari Google: deployment tidak ditemukan/diarsipkan, atau akses web app bukan "Siapa saja". Buka cek.html.';
    if (e.status) return 'HTTP ' + e.status + ' dari server Apps Script.';
    if (e instanceof TypeError) return 'Gagal terhubung. Biasanya akses web app bukan "Siapa saja" (anonim) atau koneksi terputus. Buka cek.html.';
    return String(e.message || e);
  }

  /**
   * fetch + 1x coba ulang untuk gangguan sementara. Percobaan pertama dibatasi 25 detik; percobaan kedua
   * 50 detik (biasanya cepat karena server sudah selesai menyiapkan cache). Galat diganti pesan ramah pengunjung.
   */
  function ambil(url, opsi, ke) {
    return fetchBatas(url, opsi, ke ? 50000 : 25000).then(function (r) {
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return r.json();
    }).catch(function (e) {
      if (e.dariServer) throw e;
      if (!ke && e.status !== 404) return tunggu(900).then(function () { return ambil(url, opsi, 1); });
      console.error('[Website Yayasan] ' + diagnosa(e), e);
      var x = new Error('Data belum dapat dimuat. Silakan coba lagi beberapa saat.');
      x.teknis = diagnosa(e);
      throw x;
    });
  }
  function hasil(j) {
    if (!j || !j.ok) { var e = new Error((j && j.error) || 'Terjadi kesalahan.'); e.dariServer = true; throw e; }
    return j.data;
  }

  function ambilData(aksi, params, k) {
    if (jalan[k]) return jalan[k];
    var p = ambil(urlAksi(aksi, params)).then(hasil).then(function (d) {
      tulisCache(k, d);
      tulisLokal(k, d);
      return d;
    });
    jalan[k] = p;
    var lepas = function () { delete jalan[k]; };
    p.then(lepas, lepas);
    return p;
  }

  /** GET data. opsi.segar = abaikan cache browser. */
  function get(aksi, params, opsi) {
    if (!KONFIG.API_URL) return Demo.get(aksi, params || {});
    var k = kunciCache(aksi, params);
    if (dipakai) dipakai[k] = aksi;
    if (!(opsi && opsi.segar)) {
      var c = bacaCache(k);
      if (c) return Promise.resolve(c);
      var l = bacaLokal(k);
      if (l) {
        // tampilkan salinan terakhir sekarang, perbarui diam-diam
        if (!jalan[k]) {
          var lama = JSON.stringify(l.d);
          ambilData(aksi, params, k).then(function (d) {
            if (JSON.stringify(d) !== lama) window.dispatchEvent(new CustomEvent('api:segar', { detail: { kunci: k, aksi: aksi } }));
          }).catch(function () { /* tetap pakai salinan lama */ });
        }
        return Promise.resolve(l.d);
      }
    }
    return ambilData(aksi, params, k);
  }

  /** App: mulai/ambil daftar kunci data yang dipakai halaman aktif. */
  function lacak(obj) { dipakai = obj; }

  /** POST data (tanpa preflight CORS: body dikirim sebagai text/plain). */
  function post(aksi, body) {
    if (!KONFIG.API_URL) return Demo.post(aksi, body || {});
    var isi = Object.assign({ action: aksi }, body || {});
    return ambil(KONFIG.API_URL, { method: 'POST', body: JSON.stringify(isi) }, 1).then(hasil);
  }

  function feed(format, params) {
    return KONFIG.API_URL ? urlAksi('feed', Object.assign({ format: format || 'rss' }, params || {})) : '';
  }

  return { get: get, post: post, feed: feed, url: urlAksi, diagnosa: diagnosa, lacak: lacak, kunci: kunciCache };
})();
