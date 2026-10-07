# Website Yayasan — GitHub Pages + Google Apps Script

Website statis (GitHub Pages) yang mengambil data dari Google Sheet lewat Google Apps Script (GAS).
Bisa langsung dicoba tanpa backend: buka `index.html` lewat server lokal atau GitHub Pages, maka **mode demo** memakai `data/demo.json`.

```
index.html, assets/        → website (GitHub Pages)
  assets/js/config.js      → satu-satunya file yang perlu diubah: API_URL & daftar modul
  assets/js/core/          → inti: router, API, util, data demo
  assets/js/modules/       → satu file per modul halaman
data/demo.json             → data contoh mode demo
gas/                       → backend Apps Script (salin ke proyek GAS)
panduan/                   → template modul baru (backend + website)
```

## 1. Pasang backend (±10 menit)

1. Buat **Google Sheet** baru (mis. "Data Website Yayasan"). Buka **Ekstensi › Apps Script**.
2. Salin semua file dari folder `gas/` ke proyek. Nama file `.gs` boleh sama persis; `Admin.html` dibuat lewat **+ › HTML** dengan nama `Admin`.
   Aktifkan **Setelan proyek › Tampilkan file manifes**, lalu ganti isi `appsscript.json`.
3. Di `00_Konfigurasi.gs`, isi `SITE_URL` dengan alamat GitHub Pages Anda.
4. Pilih fungsi **`setup`** › **Jalankan** › izinkan akses. Buka **Log eksekusi**: catat **password admin awal**.
   Setup membuat semua sheet, folder Drive (Docs, gambar publik, cache, bukti transfer), dan pemicu sinkron tiap jam.
5. **Terapkan › Deployment baru › Aplikasi web** · Jalankan sebagai: **Saya** · Akses: **Siapa saja**. Salin URL `…/exec`.
6. Panel admin: buka `URL/exec?admin`. Ganti password: isi `BARU` di `gantiPasswordAdmin()` lalu jalankan.

> Setiap kali kode `.gs` diubah: **Terapkan › Kelola deployment › Edit (pensil) › Versi: Versi baru**. URL tetap sama.

## 2. Pasang website

1. Buat repositori GitHub, unggah semua isi folder ini (kecuali `gas/` boleh ikut, tidak berisi rahasia).
2. Isi `API_URL` di `assets/js/config.js` dengan URL `…/exec`.
3. **Settings › Pages › Deploy from a branch** (`main`, folder `/root`). Website aktif di `https://USERNAME.github.io/REPO/`.
4. Setiap mengubah JS/CSS, naikkan `VERSI` di `config.js`.

## 3. Pemakaian harian

| Kebutuhan | Caranya |
|---|---|
| **Menulis artikel** | Admin › Artikel › **Buat Google Doc** → tulis di Doc → ubah status ke **Tayang**. Hanya Doc yang terdaftar di sheet Artikel yang bisa tayang. Heading, tebal/miring, tautan, daftar, tabel, gambar didukung; paragraf berindentasi = kutipan; gambar pertama = sampul. |
| **Jadwal terbit** | Isi *Tanggal tayang* di masa depan. |
| **Artikel disematkan** | Centang artikel › **Sematkan** (opsional sampai tanggal tertentu). Tampil paling atas di daftar Artikel. |
| **Banner open/flash donasi** | Admin › Banner disematkan. Pilih *Program* agar progres dana tampil. Banner tampil di atas semua halaman sesuai tanggal mulai–selesai. |
| **Rekening & konfirmasi** | Admin › Rekening donasi (bisa banyak, masing-masing punya kontak konfirmasi & sakelar Tampil) dan Kontak konfirmasi. Konfirmasi dari website masuk ke *Konfirmasi donasi masuk*; bukti transfer tersimpan di folder Drive privat. *Terkumpul* dihitung otomatis dari konfirmasi berstatus Diterima, kecuali diisi manual. |
| **Kajian** | Admin › Jadwal kajian. Isi lat/lng (klik kanan di Google Maps › salin koordinat) agar muncul di peta & bisa diurutkan dari yang terdekat. |
| **Log lokasi** | Tersimpan permanen di sheet *LogLokasi*. Hapus hanya manual (centang › Hapus terpilih). **Unduh Excel (.xlsx)** tersedia di setiap tabel. |
| **Teks situs** | Admin › Pengaturan situs (nama, hero, visi, misi, alamat, QRIS, embed peta, dll.). |

Mengedit langsung di Google Sheet juga boleh; cache website segar otomatis.

## 4. Kontributor & mirroring tanpa hub

Kontributor cukup menyetor **satu sumber** (lewat formulir `#/kontributor/daftar` atau diisi admin):

- **Folder Google Drive** yang dibagikan *Siapa saja yang memiliki link · Pelihat*. Setiap Google Doc = 1 artikel, nama file = judul, subfolder = kategori (bila namanya cocok). Doc yang dihapus dari folder otomatis jadi *Tidak tayang*.
- **Feed website**: RSS 2.0, Atom, atau JSON Feed (WordPress `/feed`, Blogger `/feeds/posts/default`, atau website yayasan lain yang memakai sistem ini).

Sinkron berjalan tiap jam (atau tombol **Sinkron sekarang**). Bawaan kontributor & artikel barunya **Tayang**; ubah per kontributor atau per artikel ke **Tidak tayang** kapan saja. Profil kontributor (nama, foto, website, biografi) tampil di halaman artikel dan `#/kontributor/slug`. Email/WA kontributor tidak pernah dikirim ke publik.

Atur bawaan di `00_Konfigurasi.gs`: `KONTRIBUTOR_STATUS_DEFAULT`, `ARTIKEL_KONTRIBUTOR_STATUS_DEFAULT`, `PENDAFTARAN_KONTRIBUTOR_TERBUKA`.

## 5. API & feed (untuk mitra yang ingin mirror)

Basis: `https://script.google.com/macros/s/…/exec`

| Endpoint | Isi |
|---|---|
| `?action=info` | Deskripsi API & daftar endpoint |
| `?action=feed&format=rss` | RSS 2.0 (isi lengkap di `content:encoded`) |
| `?action=feed&format=json` | JSON Feed 1.1 + ekstensi `_kontributor` |
| `?action=artikel&halaman=1&per=12&kategori=&kontributor=&q=` | Daftar artikel (JSON) |
| `?action=artikel_detail&slug=` | Satu artikel lengkap |
| `?action=kontributor` / `kontributor_detail&slug=` | Kontributor |
| `?action=kategori` | Kategori + jumlah artikel |

Parameter feed: `kategori`, `kontributor`, `limit` (maks 100), `konten=0` (tanpa isi), `semua=1`.
Feed bawaan **hanya berisi artikel asli yayasan**, sehingga dua situs yang saling mirror tidak menggandakan tulisan berulang. Respons JSON juga mendukung `&callback=fn` (JSONP).

## 6. Menambah modul

Contoh lengkap ada di `panduan/` (modul *Video*):

1. **Backend**: salin `panduan/template-modul.gs` ke proyek GAS → jalankan `setup()` → sheet & menu admin terbentuk otomatis → deploy versi baru.
2. **Website**: salin `panduan/template-modul.js` ke `assets/js/modules/video.js` → tambahkan `'video'` ke `KONFIG.MODUL` → naikkan `VERSI`.

Modul dapat menambah: sheet + kolom (form admin dibuat otomatis), endpoint GET/POST publik, tombol aksi admin, data beranda/bootstrap, tugas per jam, halaman + menu + bagian beranda. Matikan modul tanpa menghapus file lewat `MODUL_NONAKTIF` (backend) atau `KONFIG.MODUL` (website).

## 7. Catatan teknis

- Apps Script punya kuota harian (pengambilan URL, geocoding, durasi eksekusi; lihat halaman *Quotas for Google Services*). Data publik di-cache 5 menit di server dan di browser, dan hasil geocoding di-cache per area, sehingga pemakaian kuota hemat. Bila kuota geocoding habis, koordinat tetap tercatat tanpa nama kecamatan.
- Gambar artikel disalin ke folder Drive publik `Gambar Artikel (publik)`; jangan ubah izin bagikannya.
- Fitur kajian terdekat mewajibkan nomor WA + izin lokasi. Teks pemberitahuan pencatatan di halaman Kajian sebaiknya dipertahankan sebagai dasar persetujuan pengunjung (UU PDP).
- Isi artikel dari kontributor disaring dua kali: di server dan di browser (DOMPurify, `assets/vendor/purify.min.js`). Hanya iframe YouTube/Vimeo yang diizinkan.
- Peta memakai Leaflet + OpenStreetMap dari CDN; bila gagal dimuat, daftar kajian tetap berfungsi.
