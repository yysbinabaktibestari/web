/**
 * KONVERSI GOOGLE DOC → HTML BERSIH
 * ------------------------------------------------------------------
 * Didukung: Heading 1–6, paragraf, tebal/miring/garis bawah/coret, tautan,
 * daftar bernomor & berpoin (bertingkat), tabel, gambar, garis horizontal.
 * Paragraf yang diberi indentasi kiri ≥ 1 tab ditampilkan sebagai kutipan.
 * Gambar disalin ke folder Drive publik agar tautannya tidak kedaluwarsa.
 * Hasil di-cache per revisi Doc (berdasarkan waktu terakhir diubah).
 */

function htmlDoc_(docId) {
  if (!docId) throw new Error('ID Google Doc kosong.');
  var file = DriveApp.getFileById(docId);
  var upd = String(file.getLastUpdated().getTime());
  var kunci = 'doc:' + docId + ':' + upd;
  var hit = cacheBaca_(kunci);
  if (hit !== null) return JSON.parse(hit);
  var f = cariFileCache_(docId + '.json');
  if (f && f.getDescription() === upd) {
    var s = f.getBlob().getDataAsString('UTF-8');
    cacheTulis_(kunci, s, 21600);
    return JSON.parse(s);
  }
  var hasil = docKeHtml_(docId);
  var json = JSON.stringify(hasil);
  simpanFileCache_(docId + '.json', json, upd);
  cacheTulis_(kunci, json, 21600);
  return hasil;
}

function docKeHtml_(docId) {
  var body = DocumentApp.openById(docId).getBody();
  var st = { out: [], list: [], gambar: [], teks: [], docId: docId };
  for (var i = 0; i < body.getNumChildren(); i++) elemenDoc_(body.getChild(i), st);
  tutupList_(st);
  var polos = st.teks.join(' ').replace(/\s+/g, ' ').trim();
  return {
    html: st.out.join('\n'),
    ringkasan: potong_(polos, 220),
    sampul: st.gambar[0] || '',
    kata: polos ? polos.split(' ').length : 0
  };
}

function elemenDoc_(el, st) {
  var T = DocumentApp.ElementType;
  var t = el.getType();
  if (t === T.LIST_ITEM) { itemList_(el.asListItem(), st); return; }
  tutupList_(st);
  if (t === T.PARAGRAPH) paragrafDoc_(el.asParagraph(), st);
  else if (t === T.TABLE) tabelDoc_(el.asTable(), st);
  else if (t === T.HORIZONTAL_RULE) st.out.push('<hr>');
}

function paragrafDoc_(p, st) {
  var H = DocumentApp.ParagraphHeading;
  var h = p.getHeading();
  var isi = inlineDoc_(p, st);
  if (!isi.replace(/<br>/g, '').trim()) return;
  if (h === H.TITLE) return; // judul diambil dari kolom Judul
  var tag = 'p', attr = '';
  if (h === H.HEADING1 || h === H.HEADING2) tag = 'h2';
  else if (h === H.HEADING3) tag = 'h3';
  else if (h === H.HEADING4 || h === H.HEADING5 || h === H.HEADING6) tag = 'h4';
  else if (h === H.SUBTITLE) attr = ' class="lead"';
  if (tag === 'p' && !attr && (p.getIndentStart() || 0) >= 30) tag = 'blockquote';
  if (tag === 'p' || tag === 'blockquote') { var tx = p.getText(); if (tx) st.teks.push(tx); }
  if (p.getAlignment() === DocumentApp.HorizontalAlignment.CENTER) attr += ' style="text-align:center"';
  st.out.push('<' + tag + attr + '>' + isi + '</' + tag + '>');
}

function itemList_(li, st) {
  var G = DocumentApp.GlyphType;
  var g = li.getGlyphType();
  var tag = (g === G.NUMBER || g === G.LATIN_LOWER || g === G.LATIN_UPPER || g === G.ROMAN_LOWER || g === G.ROMAN_UPPER) ? 'ol' : 'ul';
  var lvl = li.getNestingLevel() || 0;
  while (st.list.length > lvl + 1) st.out.push('</li></' + st.list.pop() + '>');
  if (st.list.length === lvl + 1) {
    if (st.list[lvl] !== tag) {
      st.out.push('</li></' + st.list.pop() + '>');
      st.out.push('<' + tag + '>');
      st.list.push(tag);
    } else {
      st.out.push('</li>');
    }
  }
  while (st.list.length < lvl + 1) { st.out.push('<' + tag + '>'); st.list.push(tag); }
  st.out.push('<li>' + inlineDoc_(li, st));
  var tx = li.getText();
  if (tx) st.teks.push(tx);
}

function tutupList_(st) {
  while (st.list.length) st.out.push('</li></' + st.list.pop() + '>');
}

function tabelDoc_(tb, st) {
  var baris = [];
  for (var r = 0; r < tb.getNumRows(); r++) {
    var row = tb.getRow(r), sel = [];
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c), isi = [];
      for (var k = 0; k < cell.getNumChildren(); k++) {
        var ch = cell.getChild(k);
        if (ch.getNumChildren) isi.push(inlineDoc_(ch, st));
      }
      var tag = r === 0 ? 'th' : 'td';
      sel.push('<' + tag + '>' + isi.join('<br>') + '</' + tag + '>');
    }
    baris.push('<tr>' + sel.join('') + '</tr>');
  }
  st.out.push('<div class="tabel"><table>' + baris.join('') + '</table></div>');
}

function inlineDoc_(c, st) {
  var T = DocumentApp.ElementType, out = '';
  for (var i = 0; i < c.getNumChildren(); i++) {
    var ch = c.getChild(i), t = ch.getType();
    if (t === T.TEXT) out += teksDoc_(ch.asText());
    else if (t === T.INLINE_IMAGE) out += gambarDoc_(ch.asInlineImage(), st);
    else if (t === T.HORIZONTAL_RULE) out += '<hr>';
  }
  return out;
}

function teksDoc_(tx) {
  var s = tx.getText();
  if (!s) return '';
  var idx = tx.getTextAttributeIndices(), out = '';
  var TA = DocumentApp.TextAlignment;
  for (var i = 0; i < idx.length; i++) {
    var a = idx[i], b = i + 1 < idx.length ? idx[i + 1] : s.length;
    var bag = esc_(s.substring(a, b)).replace(/[\r\n\u000b]/g, '<br>');
    if (!bag) continue;
    var link = tx.getLinkUrl(a);
    if (tx.isBold(a)) bag = '<strong>' + bag + '</strong>';
    if (tx.isItalic(a)) bag = '<em>' + bag + '</em>';
    if (tx.isUnderline(a) && !link) bag = '<u>' + bag + '</u>';
    if (tx.isStrikethrough(a)) bag = '<s>' + bag + '</s>';
    var al = tx.getTextAlignment(a);
    if (al === TA.SUPERSCRIPT) bag = '<sup>' + bag + '</sup>';
    else if (al === TA.SUBSCRIPT) bag = '<sub>' + bag + '</sub>';
    if (link && /^(https?:|mailto:|#)/i.test(link)) bag = '<a href="' + esc_(link) + '">' + bag + '</a>';
    out += bag;
  }
  return out;
}

function gambarDoc_(img, st) {
  try {
    var url = simpanGambar_(img.getBlob(), st.docId);
    st.gambar.push(url);
    var alt = img.getAltTitle() || img.getAltDescription() || '';
    return '<img src="' + url + '" alt="' + esc_(alt) + '" loading="lazy">';
  } catch (e) {
    return '';
  }
}

/* ================================================================
 * Helper HTML (dipakai juga oleh sinkron feed)
 * ============================================================== */

/** Pembersihan dasar di server. Website tetap menyaring ulang dengan DOMPurify. */
function bersihkanHtml_(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|form|object|embed|svg|math)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|link|meta|base|input|button|textarea|select|object|embed)\b[^>]*>/gi, '')
    .replace(/<iframe\b(?![^>]*\bsrc=["']https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\/)[^>]*>([\s\S]*?<\/iframe>)?/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data):[^"']*\2/gi, '$1="#"');
}

/** Ubah src/href relatif menjadi absolut berdasarkan URL artikel asli. */
function absolutkan_(html, dasar) {
  var m = String(dasar || '').match(/^(https?:\/\/[^\/?#]+)([^?#]*)/i);
  if (!m) return html;
  var asal = m[1], dir = m[2].replace(/[^\/]*$/, '') || '/';
  return String(html).replace(/(src|href)=(["'])(?!https?:|mailto:|tel:|#|data:)([^"']*)\2/gi, function (_, a, q, u) {
    var abs = u.indexOf('//') === 0 ? 'https:' + u : (u.charAt(0) === '/' ? asal + u : asal + dir + u);
    return a + '=' + q + abs + q;
  });
}

function gambarPertama_(html) {
  var m = String(html || '').match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function ringkasDariHtml_(html) {
  var teks = String(html || '').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return potong_(teks, 220);
}
