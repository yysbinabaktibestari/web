/**
 * PEMBARUAN SISTEM
 * ------------------------------------------------------------------
 * Mesin update ada di pasang/Pemuat.gs (satu-satunya file kode di proyek
 * Apps Script). Pemuat menarik folder gas/ dari GitHub, menyimpannya, dan
 * menjalankannya — tanpa Apps Script API, Google Cloud, atau deploy ulang.
 *
 * Catatan: bila suatu saat sebuah file .gs tidak dipakai lagi, JANGAN dihapus
 * dari paket; kosongkan saja isinya (sisakan komentar). Unggahan ke GitHub
 * lewat browser tidak menghapus file lama, tetapi menimpa file bernama sama.
 */

function pembaruanSistem_() {
  if (typeof pmPasang_ !== 'function') {
    throw new Error('Pemuat.gs belum terpasang di proyek Apps Script. Ikuti README bagian 1.');
  }
  return pmPasang_();
}

/** Versi kode yang sedang berjalan (null bila dipasang manual tanpa Pemuat.gs). */
function infoSistem_() {
  try { return typeof pmInfoAktif_ === 'function' ? pmInfoAktif_() : null; } catch (e) { return null; }
}
