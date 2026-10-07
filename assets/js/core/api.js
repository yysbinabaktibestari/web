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

  function tunggu(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** Penjelasan teknis untuk admin (tampil di console browser & halaman cek.html). */
  function diagnosa(e) {
    if (!/\/exec(\?|$)/.test(KONFIG.API_URL)) return 'API_URL di config.js harus berakhiran /exec (URL "Aplikasi web" dari deployment).';
    if (e.status === 404) return 'HTTP 404 dari Google: deployment tidak ditemukan/diarsipkan, atau akses web app bukan "Siapa saja". Buka cek.html.';
    if (e.status) return 'HTTP ' + e.status + ' dari server Apps Script.';
    if (e instanceof TypeError) return 'Gagal terhubung. Biasanya akses web app bukan "Siapa saja" (anonim) atau koneksi terputus. Buka cek.html.';
    return String(e.message || e);
  }

  /** fetch + 1x coba ulang untuk gangguan sementara. Galat jaringan diganti pesan ramah pengunjung. */
  function ambil(url, opsi, ke) {
    return fetch(url, opsi).then(function (r) {
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

  /** GET data. opsi.segar = abaikan cache browser. */
  function get(aksi, params, opsi) {
    if (!KONFIG.API_URL) return Demo.get(aksi, params || {});
    var k = kunciCache(aksi, params);
    if (!(opsi && opsi.segar)) {
      var c = bacaCache(k);
      if (c) return Promise.resolve(c);
    }
    return ambil(urlAksi(aksi, params)).then(hasil).then(function (d) {
      tulisCache(k, d);
      return d;
    });
  }

  /** POST data (tanpa preflight CORS: body dikirim sebagai text/plain). */
  function post(aksi, body) {
    if (!KONFIG.API_URL) return Demo.post(aksi, body || {});
    var isi = Object.assign({ action: aksi }, body || {});
    return ambil(KONFIG.API_URL, { method: 'POST', body: JSON.stringify(isi) }, 1).then(hasil);
  }

  function feed(format, params) {
    return KONFIG.API_URL ? urlAksi('feed', Object.assign({ format: format || 'rss' }, params || {})) : '';
  }

  return { get: get, post: post, feed: feed, url: urlAksi, diagnosa: diagnosa };
})();
