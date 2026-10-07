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

## 1. Pasang backend (sekali saja, ±10 menit)

Cukup **dua file** yang ditempel manual; sisanya ditarik otomatis dari repo GitHub.

1. Pastikan isi folder ini sudah ada di repo GitHub publik (`yysbinabaktibestari/web`). Repo lain: ubah `GITHUB_REPO` di `gas/00_Konfigurasi.gs` & `PEMBARU_BAWAAN` di `gas/98_Pembaru.gs`.
2. Buat **Google Sheet** baru (pakai akun Gmail pribadi bila akun lembaga membatasi berbagi publik) › **Ekstensi › Apps Script**.
3. **Setelan proyek** › centang *Tampilkan file manifes "appsscript.json"*. Ganti isi `appsscript.json` dengan file `gas/appsscript.json`.
4. Ganti isi `Kode.gs` dengan isi `gas/98_Pembaru.gs`.
5. Aktifkan **Google Apps Script API** di https://script.google.com/home/usersettings (sekali per akun).
6. Pilih fungsi **`perbaruiDariGitHub`** › **Jalankan** › izinkan akses. Semua kode ditarik dari GitHub dan deployment web app dibuat; **URL web app** muncul di Log eksekusi.
7. Muat ulang editor, pilih fungsi **`setup`** › Jalankan. Log menampilkan akun Superadmin pertama (username **`admin`** + password awal).
8. Tempel URL web app ke `assets/js/config.js` › `API_URL`, unggah ke GitHub. Panel admin: `URL/exec?admin`.

Cek koneksi kapan saja di `https://USERNAME.github.io/REPO/cek.html`.

## 2. Memperbarui (setelah ada versi baru)

1. Unggah file baru ke GitHub (atau biarkan Claude yang push bila GitHub tersambung). Website langsung ikut terbarui.
2. Backend: Superadmin klik **Perbarui sistem** di panel admin, atau menu Sheet **Yayasan › Perbarui dari GitHub**. URL web app tetap sama, dan sheet/kolom baru dibuat otomatis — tidak perlu salin file atau jalankan `setup()` lagi.
3. Kode buatan sendiri di proyek Apps Script beri awalan nama `lokal` (mis. `lokal_Catatan.gs`) agar tidak tertimpa.

Bila setelah pembaruan muncul pesan izin (scope) baru: buka editor, jalankan `perbaruiDariGitHub` sekali untuk menyetujui.

## 3. Website di GitHub Pages

1. **Settings › Pages › Deploy from a branch** (`main`, folder `/root`). Website aktif di `https://USERNAME.github.io/REPO/`.
2. Setiap mengubah JS/CSS, naikkan `VERSI` di `config.js`.

## 4. Admin, peran & password

- **Ganti password sendiri**: tombol **Ganti password** di bilah atas panel (semua admin).
- **Tambah personel**: Superadmin › *Pengelolaan Admin › Akun admin* › **+ Tambah admin** (nama, username, peran, password awal). Pemilik akun wajib mengganti password saat pertama masuk.
- **Cabut akses**: matikan *Aktif* di akun tersebut (sesinya langsung berakhir). **Reset password**: centang akun › *Reset password*.
- **Peran**: *Peran & hak akses* berisi daftar sheet yang boleh dibuka tiap peran, plus izin hapus & unduh Excel. Bawaan: Superadmin (`*`), Editor, Bendahara, Pengelola Kajian; bisa ditambah sendiri. Sistem selalu menjaga minimal satu Superadmin aktif.
- **Log aktivitas**: setiap masuk, gagal masuk, tambah/ubah/hapus, unduh, dan aksi tombol tercatat permanen.
- **Lupa password Superadmin**: di editor, isi `USERNAME` & `BARU` pada `resetPasswordAdmin()` (99_Setup.gs), jalankan, lalu kosongkan lagi `BARU`.
- Menu *Pengelolaan Admin* tampil di zona gelap terpisah di bawah sidebar, hanya untuk Superadmin.

## 5. Pemakaian harian

| Kebutuhan | Caranya |
|---|---|
| **Menulis artikel** | Admin › Artikel › **Buat Google Doc** → tulis di Doc → ubah status ke **Tayang**. Hanya Doc yang terdaftar di sheet Artikel yang bisa tayang. Heading, tebal/miring, tautan, daftar, tabel, gambar didukung; paragraf berindentasi = kutipan; gambar pertama = sampul. |
| **Jadwal terbit** | Isi *Tanggal tayang* di masa depan. |
| **Artikel disematkan** | Centang artikel › **Sematkan** (opsional sampai tanggal tertentu). Tampil paling atas di daftar Artikel. |
| **Banner open/flash donasi** | Admin › Banner disematkan. Pilih *Program* agar progres dana tampil. Banner tampil di atas semua halaman sesuai tanggal mulai–selesai. |
| **Rekening & konfirmasi** | Admin › Rekening donasi (bisa banyak, masing-masing punya kontak konfirmasi & sakelar Tampil) dan Kontak konfirmasi. Konfirmasi dari website masuk ke *Konfirmasi donasi masuk*; bukti transfer tersimpan di folder Drive privat. *Terkumpul* dihitung otomatis dari konfirmasi berstatus Diterima, kecuali diisi manual. |
| **Kajian** | Admin › Jadwal kajian. Isi lat/lng (klik kanan di Google Maps › salin koordinat) agar muncul di peta & bisa diurutkan dari yang terdekat. |
| **Log lokasi** | Tersimpan permanen di sheet *LogLokasi*. Hapus hanya manual (centang › Hapus terpilih). **Unduh Excel (.xlsx)** tersedia di setiap tabel. |
| **Teks situs** | Admin › Pengaturan situs (nama, hero, visi, misi, alamat, QRIS, embed peta, dll.). Bagian yang belum diisi otomatis disembunyikan dari website. |
| **Katalog video** | Admin › Katalog video › + Tambah: tempel URL YouTube, judul & kanal terisi otomatis. Atau isi *Sumber video otomatis* (URL kanal `@nama` / playlist) agar video baru masuk tiap jam. Atur kategori di *Kategori video*; centang *Unggulan* agar tampil paling depan. |

Mengedit langsung di Google Sheet juga boleh; cache website segar otomatis.

## 6. Kontributor & mirroring tanpa hub

Kontributor cukup menyetor **satu sumber** (lewat formulir `#/kontributor/daftar` atau diisi admin):

- **Folder Google Drive** yang dibagikan *Siapa saja yang memiliki link · Pelihat*. Setiap Google Doc = 1 artikel, nama file = judul, subfolder = kategori (bila namanya cocok). Doc yang dihapus dari folder otomatis jadi *Tidak tayang*.
- **Feed website**: RSS 2.0, Atom, atau JSON Feed (WordPress `/feed`, Blogger `/feeds/posts/default`, atau website yayasan lain yang memakai sistem ini).

Sinkron berjalan tiap jam (atau tombol **Sinkron sekarang**). Bawaan kontributor & artikel barunya **Tayang**; ubah per kontributor atau per artikel ke **Tidak tayang** kapan saja. Profil kontributor (nama, foto, website, biografi) tampil di halaman artikel dan `#/kontributor/slug`. Email/WA kontributor tidak pernah dikirim ke publik.

**Kurasi editor.** Artikel kontributor baru berstatus kurasi *Belum dikurasi* (tetap tayang sesuai status). Di Admin › Artikel, filter cepat **Belum dikurasi** menampilkan antreannya. Isi **Judul tayang (kurasi)** / **Ringkasan tayang (kurasi)** untuk mengganti teks dari kontributor, misalnya nama file bernomor. Isian kurasi tidak tertimpa sinkron, dan nama editor + waktunya tercatat. Nomor urut di depan nama file (`01. Judul`, `3 - Judul`, `(2) Judul`, `Bab 2: Judul`) juga sudah dibersihkan otomatis (`BERSIHKAN_NOMOR_JUDUL`).

**Filter penulis & pemerataan.** Halaman Artikel punya baris filter per penulis (yayasan + tiap kontributor) dengan kartu perkenalan kontributor. Daftar artikel dan beranda menyusun tulisan 30 hari terakhir bergiliran antar penulis agar tidak didominasi satu kontributor (`PEMERATAAN_ARTIKEL`, `PEMERATAAN_HARI`). Feed RSS tetap urut tanggal.

Atur bawaan di `00_Konfigurasi.gs`: `KONTRIBUTOR_STATUS_DEFAULT`, `ARTIKEL_KONTRIBUTOR_STATUS_DEFAULT`, `PENDAFTARAN_KONTRIBUTOR_TERBUKA`.

## 7. API & feed (untuk mitra yang ingin mirror)

Basis: `https://script.google.com/macros/s/…/exec`

| Endpoint | Isi |
|---|---|
| `?action=info` | Deskripsi API & daftar endpoint |
| `?action=feed&format=rss` | RSS 2.0 (isi lengkap di `content:encoded`) |
| `?action=feed&format=json` | JSON Feed 1.1 + ekstensi `_kontributor` |
| `?action=artikel&halaman=1&per=12&kategori=&kontributor=&q=` | Daftar artikel (JSON). `kontributor=yayasan` = tulisan internal |
| `?action=artikel_detail&slug=` | Satu artikel lengkap |
| `?action=kontributor` / `kontributor_detail&slug=` | Kontributor |
| `?action=kategori` | Kategori + jumlah artikel |

Parameter feed: `kategori`, `kontributor`, `limit` (maks 100), `konten=0` (tanpa isi), `semua=1`.
Feed bawaan **hanya berisi artikel asli yayasan**, sehingga dua situs yang saling mirror tidak menggandakan tulisan berulang. Respons JSON juga mendukung `&callback=fn` (JSONP).

## 8. Menambah modul

Contoh lengkap ada di `panduan/` (modul *Galeri*):

1. **Backend**: salin `panduan/template-modul.gs` ke proyek GAS → jalankan `setup()` → sheet & menu admin terbentuk otomatis → deploy versi baru.
2. **Website**: salin `panduan/template-modul.js` ke `assets/js/modules/video.js` → tambahkan `'video'` ke `KONFIG.MODUL` → naikkan `VERSI`.

Modul dapat menambah: sheet + kolom (form admin dibuat otomatis), endpoint GET/POST publik, tombol aksi admin, data beranda/bootstrap, tugas per jam, halaman + menu + bagian beranda. Matikan modul tanpa menghapus file lewat `MODUL_NONAKTIF` (backend) atau `KONFIG.MODUL` (website).

## 9. Catatan teknis

- Keamanan: hanya fungsi tanpa akhiran `_` yang bisa dipanggil dari browser. Fungsi internal baru di modul tambahan **wajib** diberi akhiran `_` (contoh di `panduan/`). `setup` dan `resetPasswordAdmin` hanya berjalan dari editor oleh pemilik.

- Apps Script punya kuota harian (pengambilan URL, geocoding, durasi eksekusi; lihat halaman *Quotas for Google Services*). Data publik di-cache 5 menit di server dan di browser, dan hasil geocoding di-cache per area, sehingga pemakaian kuota hemat. Bila kuota geocoding habis, koordinat tetap tercatat tanpa nama kecamatan.
- Gambar artikel disalin ke folder Drive publik `Gambar Artikel (publik)`; jangan ubah izin bagikannya.
- Fitur kajian terdekat mewajibkan nomor WA + izin lokasi. Teks pemberitahuan pencatatan di halaman Kajian sebaiknya dipertahankan sebagai dasar persetujuan pengunjung (UU PDP).
- Isi artikel dari kontributor disaring dua kali: di server dan di browser (DOMPurify, `assets/vendor/purify.min.js`). Hanya iframe YouTube/Vimeo yang diizinkan.
- Peta memakai Leaflet + OpenStreetMap dari CDN; bila gagal dimuat, daftar kajian tetap berfungsi.
