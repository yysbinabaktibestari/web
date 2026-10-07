/* Helper umum (tanpa dependensi). */
var U = (function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- HTML artikel (disaring DOMPurify) ---------- */
  var IFRAME_OK = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i;
  if (window.DOMPurify) {
    DOMPurify.addHook('afterSanitizeAttributes', function (node) {
      if (node.tagName === 'IFRAME' && !IFRAME_OK.test(node.getAttribute('src') || '')) {
        node.setAttribute('src', 'about:blank');
        node.setAttribute('hidden', '');
      }
      if (node.tagName === 'A') {
        var href = node.getAttribute('href') || '';
        node.setAttribute('rel', 'noopener');
        if (/^https?:/i.test(href) && href.indexOf(location.origin) !== 0) node.setAttribute('target', '_blank');
      }
      if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy');
    });
  }
  function html(s) {
    if (!window.DOMPurify) {
      return '<p>' + esc(String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) + '</p>';
    }
    return DOMPurify.sanitize(String(s || ''), {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allowfullscreen', 'frameborder', 'allow', 'target'],
      FORBID_ATTR: ['style']
    });
  }

  /* ---------- Tanggal & angka ---------- */
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function keTanggal(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function tgl(s, pendek) {
    var d = keTanggal(s);
    if (!d) return '';
    var b = BULAN[d.getMonth()];
    return d.getDate() + ' ' + (pendek ? b.slice(0, 3) : b) + ' ' + d.getFullYear();
  }
  function bagianTgl(s) {
    var d = keTanggal(s);
    if (!d) return { hari: '', tgl: '', bulan: '' };
    return { hari: HARI[d.getDay()], tgl: d.getDate(), bulan: BULAN[d.getMonth()].slice(0, 3) };
  }
  function rupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }

  /* ---------- Ikon garis (stroke = currentColor) ---------- */
  var IKON = {
    buku: '<path d="M3 6c3-1.6 6-1.6 9 0v13c-3-1.6-6-1.6-9 0z"/><path d="M12 6c3-1.6 6-1.6 9 0v13c-3-1.6-6-1.6-9 0z"/>',
    pendidikan: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    sosial: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    dakwah: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    kesehatan: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    ekonomi: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5v1.5M12 16v1.5"/>',
    lainnya: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    arah: '<path d="M3 11l18-8-8 18-2-8z"/>',
    target: '<circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    salin: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    whatsapp: '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1-5A8 8 0 1 1 21 12z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
    facebook: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.5 2.5 4.5 5 4.7"/>',
    telegram: '<path d="M21 4L3 11l6 2.5L19 7l-8 8.5V20l3-3.5 4.5 3.5z"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    tautan: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    rss: '<path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.2"/>',
    sematkan: '<path d="M9 4h6l-1 6 4 4H6l4-4z"/><path d="M12 14v7"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    tutup: '<path d="M6 6l12 12M18 6L6 18"/>',
    panah: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    jam: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    pengguna: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
  };
  function ikon(nama, ukuran, kelas) {
    var s = ukuran || 20;
    return '<svg class="' + (kelas || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IKON[nama] || IKON.tautan) + '</svg>';
  }

  /* ---------- Potongan tampilan ---------- */
  function chip(warna, teks, href) {
    var c = 'chip c-' + (warna || 'netral');
    return href ? '<a class="' + c + '" href="' + esc(href) + '">' + esc(teks) + '</a>' : '<span class="' + c + '">' + esc(teks) + '</span>';
  }
  /** Link berbagi (Google Drive, GitHub, Dropbox, Imgur) → URL gambar langsung. Sama dengan urlGambar_ di backend. */
  function urlGambar(u) {
    var s = String(u || '').trim();
    if (!s || /drive\.google\.com\/thumbnail\?/.test(s)) return s;
    var m = /^https?:\/\/(drive|docs)\.google\.com\//i.test(s) && (s.match(/\/file\/d\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/));
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1200';
    m = s.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (m) return 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/' + m[3];
    m = s.match(/^https?:\/\/(?:www\.)?imgur\.com\/([A-Za-z0-9]{5,8})$/);
    if (m) return 'https://i.imgur.com/' + m[1] + '.png';
    if (/^https?:\/\/(www\.)?dropbox\.com\//.test(s)) return s.replace(/([?&])dl=0\b/, '$1raw=1');
    return s;
  }
  function gambar(url, alt, label, kelas) {
    if (url) return '<div class="' + (kelas || '') + '" data-gambar><img src="' + esc(urlGambar(url)) + '" alt="' + esc(alt || '') + '" loading="lazy"></div>';
    return '<div class="' + (kelas || '') + ' sampul-kosong" aria-hidden="true">' + ikon('buku', 40) + '</div>';
  }
  function avatar(nama, foto, kelas) {
    var inisial = String(nama || '?').replace(/^[^A-Za-z0-9À-ɏ]+/, '').replace(/^(ust\.?|ustadz|dr\.?|h\.)\s*/i, '').trim().charAt(0).toUpperCase() || '?';
    return '<span class="avatar ' + (kelas || '') + '" data-inisial="' + esc(inisial) + '">' + (foto ? '<img src="' + esc(urlGambar(foto)) + '" alt="" loading="lazy">' : esc(inisial)) + '</span>';
  }

  /* Gambar yang gagal dimuat (link salah / belum publik) diganti tampilan cadangan, bukan ikon rusak. */
  document.addEventListener('error', function (ev) {
    var img = ev.target;
    if (!img || img.tagName !== 'IMG' || img.hasAttribute('onerror') || img.dataset.gagal) return;
    img.dataset.gagal = '1';
    if (window.console) console.warn('Gambar gagal dimuat (pastikan link publik & berupa gambar): ' + img.src);
    var p = img.parentNode;
    if (!p) return;
    if (p.classList.contains('logo-tanda')) { p.innerHTML = '<span style="color:#fff">' + ikon('buku', 22) + '</span>'; return; }
    if (p.classList.contains('avatar')) { p.textContent = p.getAttribute('data-inisial') || ''; return; }
    if (p.hasAttribute('data-gambar')) { p.classList.add('sampul-kosong'); p.innerHTML = ikon('buku', 40); return; }
    img.remove();
  }, true);
  function domain(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url || ''; } }

  /* ---------- Lain-lain ---------- */
  function muatSkrip(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
  }
  function muatCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
  function toast(teks) {
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = teks; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, 3200);
  }
  function normalWa(s) {
    var d = String(s || '').replace(/[^\d]/g, '');
    if (d.indexOf('0') === 0) d = '62' + d.slice(1); else if (d.indexOf('8') === 0) d = '62' + d;
    return /^628\d{7,12}$/.test(d) ? d : '';
  }
  function jarakKm(a, b, c, d) {
    var R = 6371, r = Math.PI / 180;
    var x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
    var h = x * x + Math.cos(a * r) * Math.cos(c * r) * y * y;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function hash(path, query) {
    var q = Object.keys(query || {}).filter(function (k) { return query[k] !== '' && query[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); }).join('&');
    return '#/' + path + (q ? '?' + q : '');
  }
  function salin(teks) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(teks);
    var t = document.createElement('textarea'); t.value = teks; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } finally { t.remove(); }
    return Promise.resolve();
  }
  function perangkat() {
    var ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iPhone/iPad';
    return /mobile/i.test(ua) ? 'Ponsel lain' : 'Desktop';
  }
  function simpanLokal(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function bacaLokal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  return { esc: esc, html: html, tgl: tgl, bagianTgl: bagianTgl, keTanggal: keTanggal, rupiah: rupiah, ikon: ikon,
    chip: chip, gambar: gambar, avatar: avatar, urlGambar: urlGambar, domain: domain, muatSkrip: muatSkrip, muatCss: muatCss, toast: toast,
    normalWa: normalWa, jarakKm: jarakKm, hash: hash, salin: salin, perangkat: perangkat,
    simpanLokal: simpanLokal, bacaLokal: bacaLokal };
})();
