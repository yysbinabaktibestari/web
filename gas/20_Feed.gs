/**
 * FEED RSS 2.0 & JSON Feed 1.1 — pintu keluar untuk mirroring.
 * ------------------------------------------------------------------
 *   ?action=feed&format=rss         (bawaan)
 *   ?action=feed&format=json
 * Parameter opsional:
 *   kategori=slug  kontributor=slug  limit=30 (maks 100)
 *   semua=1        sertakan artikel hasil mirror (bawaan: hanya artikel asli
 *                  yayasan, supaya situs yang saling mirror tidak menggandakan
 *                  tulisan berulang-ulang)
 *   konten=0       tanpa isi lengkap (lebih cepat)
 */

function responsFeed_(p) {
  var format = String(p.format || 'rss').toLowerCase() === 'json' ? 'json' : 'rss';
  var teks = dariCache_('feed:' + kunciParam_(p), CONFIG.CACHE_DETIK, function () { return buatFeed_(p, format); });
  return ContentService.createTextOutput(teks)
    .setMimeType(format === 'json' ? ContentService.MimeType.JSON : ContentService.MimeType.RSS);
}

function buatFeed_(p, format) {
  var mulai = Date.now();
  var situs = pengaturan_();
  var nama = situs.nama_yayasan || 'Yayasan';
  var base = CONFIG.SITE_URL.replace(/\/?$/, '/');
  var self = ScriptApp.getService().getUrl() + '?action=feed&format=' + format;
  var limit = Math.min(Math.max(Number(p.limit) || CONFIG.FEED_JUMLAH, 1), 100);
  var profil = {};
  if (modulAktif_('kontributor')) {
    publikSaja_('Kontributor', bacaTabel_('Kontributor')).forEach(function (k) { profil[k.slug] = k; });
  }

  var items = artikelTayang_().filter(function (a) {
    if (p.semua !== '1' && p.kontributor === undefined && a.sumber !== 'internal') return false;
    if (p.kategori && a.kategori !== p.kategori) return false;
    if (p.kontributor && (!a.kontributor || a.kontributor.slug !== p.kontributor)) return false;
    return true;
  }).slice(0, limit).map(function (a) {
    var html = '';
    if (p.konten !== '0' && Date.now() - mulai < 20000) {
      try { html = kontenArtikel_(a); } catch (e) { html = ''; }
    }
    return { a: a, html: html || '<p>' + esc_(a.ringkasan) + '</p>', url: base + '#/artikel/' + a.slug };
  });

  if (format === 'json') {
    return JSON.stringify({
      version: 'https://jsonfeed.org/version/1.1',
      title: nama,
      home_page_url: base,
      feed_url: self,
      description: situs.deskripsi || '',
      language: 'id',
      icon: situs.logo || undefined,
      _yayasan: { versi_api: 1, api: ScriptApp.getService().getUrl() + '?action=info' },
      items: items.map(function (x) {
        var a = x.a, k = a.kontributor ? profil[a.kontributor.slug] : null;
        return {
          id: 'yys:' + a.id,
          url: x.url,
          external_url: a.url_asli || undefined,
          title: a.judul,
          content_html: x.html,
          summary: a.ringkasan,
          image: a.sampul || undefined,
          date_published: a.tanggal || undefined,
          date_modified: a.diperbarui || undefined,
          tags: a.kategori_nama ? [a.kategori_nama] : [],
          authors: [{
            name: a.penulis || nama,
            url: k ? (k.website || base + '#/kontributor/' + k.slug) : base,
            avatar: k && k.foto ? k.foto : undefined
          }],
          _kontributor: k ? { nama: k.nama, slug: k.slug, website: k.website, bio: k.bio, foto: k.foto } : undefined
        };
      })
    });
  }

  var x = [];
  x.push('<?xml version="1.0" encoding="UTF-8"?>');
  x.push('<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">');
  x.push('<channel>');
  x.push('<title>' + xml_(nama) + '</title>');
  x.push('<link>' + xml_(base) + '</link>');
  x.push('<description>' + xml_(situs.deskripsi || nama) + '</description>');
  x.push('<language>id</language>');
  x.push('<lastBuildDate>' + rfc822_(new Date()) + '</lastBuildDate>');
  x.push('<atom:link href="' + xml_(self) + '" rel="self" type="application/rss+xml"/>');
  if (situs.logo) x.push('<image><url>' + xml_(situs.logo) + '</url><title>' + xml_(nama) + '</title><link>' + xml_(base) + '</link></image>');
  items.forEach(function (it) {
    var a = it.a, k = a.kontributor ? profil[a.kontributor.slug] : null;
    x.push('<item>');
    x.push('<title>' + xml_(a.judul) + '</title>');
    x.push('<link>' + xml_(it.url) + '</link>');
    x.push('<guid isPermaLink="false">yys:' + xml_(a.id) + '</guid>');
    if (a.tanggal) x.push('<pubDate>' + rfc822_(new Date(a.tanggal)) + '</pubDate>');
    x.push('<dc:creator>' + xml_(a.penulis || nama) + '</dc:creator>');
    if (a.kategori_nama) x.push('<category>' + xml_(a.kategori_nama) + '</category>');
    if (k) x.push('<source url="' + xml_(k.website || base + '#/kontributor/' + k.slug) + '">' + xml_(k.nama) + '</source>');
    x.push('<description>' + xml_(a.ringkasan) + '</description>');
    x.push('<content:encoded><![CDATA[' + cdata_(it.html) + ']]></content:encoded>');
    if (a.sampul) x.push('<media:content url="' + xml_(a.sampul) + '" medium="image"/>');
    x.push('</item>');
  });
  x.push('</channel></rss>');
  return x.join('\n');
}

function xml_(s) {
  return esc_(String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''));
}
function cdata_(s) {
  return String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\]\]>/g, ']]]]><![CDATA[>');
}
function rfc822_(d) {
  return Utilities.formatDate(d, 'GMT', "EEE, dd MMM yyyy HH:mm:ss 'GMT'");
}
