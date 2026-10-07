/**
 * PEMBARUAN SEKALI KLIK DARI GITHUB
 * ------------------------------------------------------------------
 * File ini berdiri sendiri, sehingga juga bisa dipakai sebagai PEMASANG
 * PERTAMA: cukup tempel file ini + appsscript.json, aktifkan Apps Script API
 * (https://script.google.com/home/usersettings), lalu jalankan
 * perbaruiDariGitHub(). Seluruh kode di folder gas/ repo akan ditarik,
 * dijadikan versi baru, dan deployment web app diperbarui (URL tetap sama;
 * bila belum ada deployment, dibuatkan).
 *
 * Setelah itu, pembaruan cukup lewat menu Sheet "Yayasan › Perbarui dari GitHub"
 * atau tombol "Perbarui sistem" di panel admin (Superadmin).
 *
 * File di proyek yang namanya diawali "lokal" (mis. lokal_Catatan.gs) tidak
 * akan ditimpa — pakai awalan itu untuk kode tambahan buatan sendiri.
 */

var PEMBARU_BAWAAN = { REPO: 'yysbinabaktibestari/web', CABANG: 'main', FOLDER: 'gas' };

/** Jalankan dari editor atau menu Sheet. */
function perbaruiDariGitHub() {
  var aktif = '', efektif = '';
  try { aktif = Session.getActiveUser().getEmail(); efektif = Session.getEffectiveUser().getEmail(); } catch (e) { /* abaikan */ }
  if (!aktif || aktif !== efektif) throw new Error('Fungsi ini hanya bisa dijalankan pemilik dari editor Apps Script atau menu Sheet.');
  var h = pembaruanDariGitHub_();
  Logger.log(h.pesan + (h.url ? '\nURL web app: ' + h.url : ''));
  try { SpreadsheetApp.getUi().alert(h.pesan + (h.url ? '\n\nURL web app:\n' + h.url : '')); } catch (e) { /* dijalankan dari editor */ }
  return h;
}

function pembaruanDariGitHub_() {
  var cfg = (typeof CONFIG !== 'undefined' && CONFIG.GITHUB_REPO)
    ? { REPO: CONFIG.GITHUB_REPO, CABANG: CONFIG.GITHUB_CABANG || 'main', FOLDER: 'gas' } : PEMBARU_BAWAAN;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Pembaruan lain sedang berjalan.');
  try {
    var scriptId = ScriptApp.getScriptId();
    var api = 'https://script.googleapis.com/v1/projects/' + scriptId;

    // 1. Unduh repo (zip) dari GitHub
    var zipUrl = 'https://codeload.github.com/' + cfg.REPO + '/zip/refs/heads/' + cfg.CABANG;
    var r = UrlFetchApp.fetch(zipUrl, { muteHttpExceptions: true, followRedirects: true });
    if (r.getResponseCode() !== 200) throw new Error('Repo GitHub tidak bisa diunduh (HTTP ' + r.getResponseCode() + '). Pastikan repo ' + cfg.REPO + ' publik.');
    var blobs = Utilities.unzip(r.getBlob().setContentType('application/zip'));
    var files = [];
    blobs.forEach(function (b) {
      var m = String(b.getName()).match(new RegExp('^[^/]+/' + cfg.FOLDER + '/([^/]+)\\.(gs|html|json)$'));
      if (!m) return;
      var nama = m[1], ext = m[2];
      if (ext === 'json' && nama !== 'appsscript') return;
      files.push({ name: nama, type: ext === 'gs' ? 'SERVER_JS' : ext === 'html' ? 'HTML' : 'JSON', source: b.getDataAsString('UTF-8') });
    });
    var wajib = ['appsscript', '01_Inti', '98_Pembaru'];
    wajib.forEach(function (w) {
      if (!files.some(function (f) { return f.name === w; })) throw new Error('File "' + w + '" tidak ada di folder ' + cfg.FOLDER + '/ repo. Pembaruan dibatalkan.');
    });

    // 2. Pertahankan file lokal (awalan "lokal")
    var lama = panggilScriptApi_('get', api + '/content');
    (lama.files || []).forEach(function (f) {
      if (/^lokal/i.test(f.name) && !files.some(function (x) { return x.name === f.name; })) {
        files.push({ name: f.name, type: f.type, source: f.source });
      }
    });

    // 3. Ganti isi proyek, buat versi baru
    panggilScriptApi_('put', api + '/content', { files: files });
    var waktu = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm');
    var versi = panggilScriptApi_('post', api + '/versions', { description: 'GitHub ' + cfg.REPO + '@' + cfg.CABANG + ' · ' + waktu });

    // 4. Perbarui deployment web app (atau buat bila belum ada)
    var dep = (panggilScriptApi_('get', api + '/deployments').deployments || []).filter(function (d) {
      return d.deploymentConfig && d.deploymentConfig.versionNumber &&
        (d.entryPoints || []).some(function (e) { return e.entryPointType === 'WEB_APP'; });
    })[0];
    var konfig = { deploymentConfig: { scriptId: scriptId, versionNumber: versi.versionNumber, manifestFileName: 'appsscript',
      description: 'Website yayasan · versi ' + versi.versionNumber } };
    var hasil = dep
      ? panggilScriptApi_('put', api + '/deployments/' + dep.deploymentId, konfig)
      : panggilScriptApi_('post', api + '/deployments', konfig.deploymentConfig);
    var url = '';
    (hasil.entryPoints || []).forEach(function (e) { if (e.webApp && e.webApp.url) url = e.webApp.url; });

    try { CacheService.getScriptCache().remove('__ver'); } catch (e) { /* abaikan */ }
    return {
      pesan: 'Berhasil: ' + files.length + ' file diperbarui ke versi ' + versi.versionNumber + (dep ? ' (deployment lama, URL tetap).' : ' (deployment baru dibuat).') +
        ' Struktur sheet menyesuaikan otomatis pada akses berikutnya.',
      url: url, versi: versi.versionNumber
    };
  } finally {
    lock.releaseLock();
  }
}

function panggilScriptApi_(metode, url, isi) {
  var opsi = { method: metode, muteHttpExceptions: true, contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } };
  if (isi) opsi.payload = JSON.stringify(isi);
  var r = UrlFetchApp.fetch(url, opsi);
  var kode = r.getResponseCode(), teks = r.getContentText();
  if (kode >= 300) {
    var pesan = teks;
    try { pesan = JSON.parse(teks).error.message; } catch (e) { /* teks mentah */ }
    if (/Apps Script API has not been used|has not enabled the Apps Script API|SERVICE_DISABLED|User has not enabled/i.test(pesan)) {
      throw new Error('Apps Script API belum aktif. Buka https://script.google.com/home/usersettings lalu aktifkan "Google Apps Script API", tunggu ±2 menit, dan ulangi.');
    }
    if (kode === 403 && /insufficient|scope/i.test(pesan)) {
      throw new Error('Izin belum lengkap. Pastikan appsscript.json dari repo sudah terpasang, lalu jalankan perbaruiDariGitHub dari editor sekali untuk memberi izin.');
    }
    throw new Error('Apps Script API ' + kode + ': ' + String(pesan).slice(0, 300));
  }
  return teks ? JSON.parse(teks) : {};
}
