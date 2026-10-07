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

  /** GET data. opsi.segar = abaikan cache browser. */
  function get(aksi, params, opsi) {
    if (!KONFIG.API_URL) return Demo.get(aksi, params || {});
    var k = kunciCache(aksi, params);
    if (!(opsi && opsi.segar)) {
      var c = bacaCache(k);
      if (c) return Promise.resolve(c);
    }
    return fetch(urlAksi(aksi, params)).then(function (r) {
      if (!r.ok) throw new Error('Server tidak merespons (' + r.status + ').');
      return r.json();
    }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Gagal memuat data.');
      tulisCache(k, j.data);
      return j.data;
    });
  }

  /** POST data (tanpa preflight CORS: body dikirim sebagai text/plain). */
  function post(aksi, body) {
    if (!KONFIG.API_URL) return Demo.post(aksi, body || {});
    var isi = Object.assign({ action: aksi }, body || {});
    return fetch(KONFIG.API_URL, { method: 'POST', body: JSON.stringify(isi) }).then(function (r) {
      if (!r.ok) throw new Error('Server tidak merespons (' + r.status + ').');
      return r.json();
    }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Gagal mengirim data.');
      return j.data;
    });
  }

  function feed(format, params) {
    return KONFIG.API_URL ? urlAksi('feed', Object.assign({ format: format || 'rss' }, params || {})) : '';
  }

  return { get: get, post: post, feed: feed, url: urlAksi };
})();
