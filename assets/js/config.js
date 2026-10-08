/**
 * KONFIGURASI WEBSITE
 * Ubah file ini saja untuk menyambungkan website ke backend.
 */
window.KONFIG = {
  // URL Web App Google Apps Script (berakhiran /exec).
  // Biarkan kosong untuk MODE DEMO (memakai data/demo.json).
  API_URL: 'https://script.google.com/macros/s/AKfycbzgmqJkbkOmfzeFP6QO1a9yPxQsk5s4zSR6FexhLPsXa4Ah4WCGVYrfPJJOLI-79rYG/exec',

  // Modul aktif, berurutan. Setiap id = file assets/js/modules/<id>.js
  // Tambah modul baru: buat file-nya, lalu tulis id-nya di sini.
  MODUL: ['beranda', 'artikel', 'kajian', 'video', 'kontributor', 'profil', 'donasi'],

  // Lama data disimpan di browser (menit) agar perpindahan halaman cepat.
  CACHE_MENIT: 5,

  // Naikkan setiap kali file JS/CSS diubah agar browser memuat versi baru.
  VERSI: '1.4.1'
};
