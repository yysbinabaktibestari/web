# Website Yayasan — GitHub Pages + Google Apps Script

Website statis (GitHub Pages) yang mengambil data dari Google Sheet lewat Google Apps Script (GAS).
Bisa langsung dicoba tanpa backend: buka `index.html` lewat server lokal atau GitHub Pages, maka **mode demo** memakai `data/demo.json`.

```
index.html, assets/        → website (GitHub Pages)
  assets/js/config.js      → satu-satunya file yang perlu diubah: API_URL & daftar modul
  assets/js/core/          → inti: router, API, util, data demo
  assets/js/modules/       → satu file per modul halaman
data/demo.json             → data contoh mode demo
gas/                       → backend Apps Script (ditarik otomatis oleh Pemuat.gs)
pasang/                    → 2 file yang ditempel sekali di proyek Apps Script
panduan/                   → template modul baru (backend + website)
```

## 1. Pasang backend (sekali saja, ±10 menit)

Di proyek Apps Script hanya ada **dua file**: `appsscript.json` dan `Pemuat.gs` (folder `pasang/`). Seluruh kode sistem ditarik pemuat dari folder `gas/` di GitHub — tidak perlu Apps Script API maupun Google Cloud.

1. Pastikan isi folder ini sudah ada di repo GitHub **publik** (`yysbinabaktibestari/web`). Repo lain: ubah `PEMUAT.REPO` di `Pemuat.gs`.
2. Buka **Google Sheet** yayasan › **Ekstensi › Apps Script** (pakai akun Gmail pribadi bila akun lembaga membatasi akses publik).
3. **Hapus semua file kode lain** di editor (⋮ › Hapus), termasuk `Kode.gs` / file versi lama.
4. **Setelan proyek** (ikon roda gigi) › centang *Tampilkan file manifes "appsscript.json"*. Ganti isi `appsscript.json` dengan `pasang/appsscript.json`.
5. Buat file skrip **`Pemuat`**, tempel isi `pasang/Pemuat.gs`, simpan.
6. Pilih fungsi **`perbaruiSistem`** › **Jalankan** › izinkan akses. Di layar izin Google yang berisi kotak centang, pilih **Pilih semua** — izin yang tidak dicentang (mis. YouTube) membuat fitur terkait tidak jalan; Log eksekusi akan memberi tautan untuk melengkapinya. Kode ditarik dari GitHub, sheet/folder/trigger disiapkan, dan akun login muncul di *Log eksekusi* (username **`admin`** + password awal, atau password lama bila pernah dipasang).
7. **Terapkan › Kelola deployment** › ✎ pada deployment *Aplikasi web* › Versi: **Versi baru** · Jalankan sebagai: **Saya** · Yang memiliki akses: **Siapa saja** › Terapkan. (Belum ada deployment? **Terapkan › Deployment baru** › Aplikasi web, pengaturan sama.)
8. URL web app (berakhiran `/exec`) harus sama dengan `API_URL` di `assets/js/config.js`. Bila berbeda, ubah file itu langsung di GitHub (ikon ✎). Panel admin: `URL/exec?admin`.

Cek koneksi kapan saja di `https://USERNAME.github.io/REPO/cek.html`.

## 2. Memperbarui (setelah ada versi baru)

1. Unggah isi paket baru ke GitHub (**Add file › Upload files**, seret semua isi folder). Website langsung ikut terbarui.
2. Backend: Superadmin klik **Perbarui sistem** di panel admin (atau menu Sheet **Yayasan › Perbarui sistem dari GitHub**). Berlaku saat itu juga — **tidak perlu deploy ulang**, salin file, atau `setup()`; sheet/kolom baru dibuat otomatis.
3. Bila versi baru bermasalah: menu Sheet **Yayasan › Kembalikan versi sebelumnya** (atau jalankan `kembalikanVersiSebelumnya` di editor).

`Pemuat.gs` sendiri hampir tidak pernah berubah. Bila suatu saat berubah, catatan rilis akan menyebutkannya.

**Bila `pasang/appsscript.json` berubah** (izin baru, mis. YouTube): tempel ulang isinya → jalankan `perbaruiSistem` dari editor & klik **Izinkan**. Hasilnya (termasuk status YouTube) tampil di *Log eksekusi*. Pekerjaan yang butuh izin baru otomatis dijalankan di latar belakang dengan izin itu, jadi deploy ulang tidak diperlukan.

## 3. Website di GitHub Pages

1. **Settings › Pages › Deploy from a branch** (`main`, folder `/root`). Website aktif di `https://USERNAME.github.io/REPO/`.
2. Setiap mengubah JS/CSS, naikkan `VERSI` di `config.js`.

## 4. Admin, peran & password

- **Ganti password sendiri**: tombol **Ganti password** di bilah atas panel (semua admin).
- **Tambah personel**: Superadmin › *Pengelolaan Admin › Akun admin* › **+ Tambah admin** (nama, username, peran, password awal). Pemilik akun wajib mengganti password saat pertama masuk.
- **Cabut akses**: matikan *Aktif* di akun tersebut (sesinya langsung berakhir). **Reset password**: centang akun › *Reset password*.
- **Peran**: *Peran & hak akses* berisi daftar sheet yang boleh dibuka tiap peran, plus izin hapus & unduh Excel. Bawaan: Superadmin (`*`), Editor, Bendahara (donasi + buku kas), Pengelola Kajian; bisa ditambah sendiri. Sistem selalu menjaga minimal satu Superadmin aktif.
- **Log aktivitas**: setiap masuk, gagal masuk, tambah/ubah/hapus, unduh, dan aksi tombol tercatat permanen.
- **Lupa password Superadmin**: buka Google Sheet › menu **Yayasan › Reset password admin**. (Alternatif: isi `RESET_SANDI` di `Pemuat.gs`, jalankan `resetPasswordAdmin`, lalu kosongkan lagi.)
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
| **Logo** | Tempel link Google Drive logo di Pengaturan `logo`. Website hanya memakai **salinan kecil** (maks. 400 px) di folder gambar publik; file asli tetap privat & ID-nya tidak terlihat. Di website logo tidak bisa diseret, diklik-kanan "Simpan gambar", atau ditekan-lama untuk disimpan, dan footer memuat pernyataan perlindungan. (Tangkapan layar tetap mungkin — tidak ada website yang bisa mencegahnya.) Mengganti isi file logo di Drive: simpan ulang Pengaturan `logo` di panel. |
| **Gambar lain** | Tempel link berbagi Google Drive apa adanya (`…/file/d/…/view`) — diubah otomatis jadi link gambar, dan file Drive milik akun yayasan langsung dibagikan *Siapa saja yang memiliki link* saat disimpan dari panel admin. Link GitHub (`…/blob/…`), Dropbox, dan Imgur juga dikenali. Link Google Photos/Instagram/Facebook tidak bisa dipakai. Form admin menampilkan pratinjau; bila gambar gagal dimuat, website menampilkan ikon cadangan (bukan gambar rusak). |
| **Katalog video** | Lihat bagian 6b. |
| **Mode baca artikel** | Otomatis di setiap artikel: garis progres tipis di atas layar, bilah bawah (*Kembali · Tampilan · Ke atas · Bagikan*; di laptop berupa bilah melayang), pilihan huruf Serif/Sans, ukuran huruf, tema Terang/Krem/Gelap, dan tawaran *Lanjutkan* dari posisi terakhir. Pilihan tersimpan di perangkat pembaca. |
| **Buku kas & laporan** | Lihat bagian 6c. |

Mengedit langsung di Google Sheet juga boleh; cache website segar otomatis.

## 6. Kontributor & mirroring tanpa hub

Kontributor cukup menyetor **satu sumber** (lewat formulir `#/kontributor/daftar` atau diisi admin):

- **Folder Google Drive** yang dibagikan *Siapa saja yang memiliki link · Pelihat*. Setiap Google Doc = 1 artikel, nama file = judul. **Subfolder dibaca sampai 5 tingkat**, termasuk pintasan (shortcut) ke Doc; kategori diambil dari nama subfolder terdalam yang cocok dengan nama kategori (mis. `Opini/2026/Pendidikan` → Pendidikan; nomor di depan nama folder diabaikan). Hanya format Google Docs yang dibaca (bukan .docx/PDF). Doc yang dihapus dari folder otomatis jadi *Tidak tayang*.
- **Feed website**: RSS 2.0, Atom, atau JSON Feed (WordPress `/feed`, Blogger `/feeds/posts/default`, atau website yayasan lain yang memakai sistem ini).

Sinkron berjalan **tiap jam** (atau tombol **Sinkron sekarang**). Selama masih ada antrean, putaran berikutnya **otomatis menyusul ±1 menit kemudian** (tidak menunggu sejam) sampai habis.
- Folder: semua Doc, tanpa batas jumlah; hanya Doc baru/berubah yang diproses (±5 menit per putaran).
- Feed: halaman terbaru tiap putaran, lalu **seluruh arsip lama halaman demi halaman** (WordPress `?paged=`, Blogger/Atom `rel="next"`, JSON Feed `next_url`; hingga 30 halaman per putaran). Kolom *Impor arsip feed* menunjukkan halaman berikutnya atau `selesai`. Bawaan kontributor & artikel barunya **Tayang**; ubah per kontributor atau per artikel ke **Tidak tayang** kapan saja. Profil kontributor (nama, foto, website, biografi) tampil di halaman artikel dan `#/kontributor/slug`. Email/WA kontributor tidak pernah dikirim ke publik.

**Kurasi editor.** Artikel kontributor baru berstatus kurasi *Belum dikurasi* (tetap tayang sesuai status). Di Admin › Artikel, filter cepat **Belum dikurasi** menampilkan antreannya. Isi **Judul tayang (kurasi)** / **Ringkasan tayang (kurasi)** untuk mengganti teks dari kontributor, misalnya nama file bernomor. Isian kurasi tidak tertimpa sinkron, dan nama editor + waktunya tercatat. Nomor urut di depan nama file (`01. Judul`, `3 - Judul`, `(2) Judul`, `Bab 2: Judul`) juga sudah dibersihkan otomatis (`BERSIHKAN_NOMOR_JUDUL`).

**Filter penulis & pemerataan.** Halaman Artikel punya baris filter per penulis (yayasan + tiap kontributor) dengan kartu perkenalan kontributor. Daftar artikel dan beranda menyusun tulisan 30 hari terakhir bergiliran antar penulis agar tidak didominasi satu kontributor (`PEMERATAAN_ARTIKEL`, `PEMERATAAN_HARI`). Feed RSS tetap urut tanggal.

Atur bawaan di `00_Konfigurasi.gs`: `KONTRIBUTOR_STATUS_DEFAULT`, `ARTIKEL_KONTRIBUTOR_STATUS_DEFAULT`, `PENDAFTARAN_KONTRIBUTOR_TERBUKA`.

## 6b. Video: channel & playlist YouTube

- **Admin › Channel & playlist YouTube › + Tambah**: tempel URL channel (`youtube.com/@nama`) — satu baris per channel bagian yayasan — atau URL playlist. Nama & foto channel terisi sendiri; atur *Urutan* untuk posisi di navigasi. Klik **Sinkron sekarang** setelah menambah.
- **Admin › Playlist**: terisi otomatis. Matikan *Tampil* untuk menyembunyikan, ubah *Judul* / *Urutan* sesuka hati (tidak tertimpa sinkron).
- **Admin › Katalog video**: video satuan (tempel URL), kategori, pemateri, *Unggulan*.
- Website: halaman Video punya navigasi **channel** (foto + jumlah video) → **playlist** channel itu (urut sesuai YouTube, bernomor) → halaman tonton dengan daftar playlist, *Sebelumnya/Berikutnya*.

**Seberapa banyak yang diambil.** Sinkron otomatis tiap jam.

| | Dengan YouTube Data API (disarankan) | Tanpa (cadangan RSS) |
|---|---|---|
| Video channel | **Semua**. Channel besar diimpor bertahap (±4,5 menit per putaran, dilanjutkan jam berikutnya); setelah itu hanya video baru | ±15 video terbaru setiap sinkron, terkumpul dari waktu ke waktu |
| Playlist channel | Semua playlist + seluruh isinya, diperbarui sehari sekali | Tidak terbaca; tambahkan URL playlist sebagai baris tersendiri (±15 video teratasnya) |
| Kuota | ±1–2 unit per channel per jam dari jatah gratis 10.000/hari | — |

**Mengaktifkan YouTube Data API (sekali):**
1. Tempel ulang isi `pasang/appsscript.json` ke `appsscript.json` di editor Apps Script; di panel kiri **Layanan (+)** pastikan *YouTube Data API v3* tercantum (bila belum: pilih › Tambahkan).
2. Jalankan `perbaruiSistem` dari editor → **Izinkan**, dan pastikan kotak **"Lihat akun YouTube Anda"** tercentang (atau *Pilih semua*). Izin ini hanya untuk membaca data publik channel. Bila terlewat, Log eksekusi dan tombol *Sinkron sekarang* di panel memberi tautan **Beri izin YouTube** untuk mencentangnya.
3. Lihat *Log eksekusi*: baris **"YouTube Data API: siap"** berarti beres. Bila tertulis *izin belum tercantum*, isi `appsscript.json` belum terganti — ulangi langkah 1.

Tombol *Sinkron sekarang* di panel langsung memasukkan video terbaru, lalu **sinkron lengkap (semua video & playlist) berjalan otomatis di latar belakang** dalam 1–3 menit memakai izin dari langkah 2 — tidak perlu deploy ulang. Impor channel besar berlanjut sendiri tiap ±1 menit sampai selesai. Bila API belum aktif, video tetap masuk lewat RSS dan kolom *Hasil* menjelaskan langkah perbaikannya.

## 6c. Keuangan: buku kas & sinkron dengan laporan lain

Satu **Buku kas** (Admin › Keuangan) menjadi sumber semua laporan — website, sistem pembukuan lain, maupun laporan di Google Sheet terpisah — sehingga angkanya selalu sama.

- **Isi buku kas**: input bendahara; **donasi website otomatis** (konfirmasi *Diterima* → entri Masuk, *Ditolak* → dibatalkan); modul tambahan; atau sistem lain lewat API.
- **Kategori kas / akun**: kode singkat (DON, DON-PRG, PND, PRG, OPS, LAIN) dipakai bersama semua sistem. Jangan ubah kode yang sudah dipakai; tambah yang baru bila perlu.
- **Program** pada entri = dana terikat/proyek. *Terkumpul* di halaman donasi dihitung dari buku kas (uang Masuk untuk program itu).
- **Tidak ada hapus**: ubah status ke *Batal* (pembatalan ikut tersinkron). Entri dari donasi website/sistem lain diubah di sumbernya.
- **Tutup buku**: Buku kas › *Kunci periode* — entri sampai tanggal itu tidak bisa diubah dari mana pun (koreksi dicatat sebagai entri baru di periode berjalan). Membuka kunci hanya Superadmin.
- **Ringkasan per bulan**: tombol di Buku kas. **Laporan publik** (tanpa nama donatur): set Pengaturan `laporan_keuangan` = `ya`, lalu `?action=laporan_kas&tahun=2026` (atau `bulan=2026-10`, `dari=…&sampai=…`) — siap dipakai halaman laporan/infografis nanti.

**Menghubungkan sistem lain.** Superadmin › *Integrasi & API › Kunci API sinkron* › **+ Buat kunci** (satu kunci per sistem; tampil sekali). Izin: `kas:baca`, `kas:rinci` (termasuk nama pihak & bukti), `kas:tulis`.

| Kebutuhan | Panggilan |
|---|---|
| Tarik perubahan (sinkron bertahap) | `GET …/exec?action=kas_ekspor&kunci=KUNCI&kursor=KURSOR_TERAKHIR` → `{items, kursor, lagi}`. Simpan `kursor`; ulangi selama `lagi=true`. Tanpa kursor = dari awal. Entri *Batal* ikut terkirim. |
| Tabel di Google Sheet lain | `=IMPORTDATA("…/exec?action=kas_ekspor&kunci=KUNCI&format=csv")` (opsional `&dari=2026-01-01&sampai=2026-12-31`) |
| Daftar kode akun, program, rekening | `GET …/exec?action=kas_akun&kunci=KUNCI` |
| Kirim / ubah entri dari sistem lain | `POST …/exec` body `{"action":"kas_impor","kunci":"KUNCI","items":[{"ref_sumber":"TRX-1","tanggal":"2026-10-05","jenis":"Masuk","jumlah":750000,"akun":"DON","program":"","keterangan":"…","pihak":"…","status":"Final"}]}` → hasil per baris `baru / ubah / sama / galat`. `ref_sumber` = ID di sistem pengirim: kirim ulang data yang sama tidak menggandakan; `"status":"Batal"` untuk membatalkan. Maks 500 per kiriman. |

Setiap entri membawa `sumber`, `ref_sumber`, `diubah`, dan `versi` (naik setiap perubahan). Sistem lain hanya bisa mengubah entri bersumber dirinya. Perlakukan URL berisi kunci seperti password; cabut kapan saja dengan mematikan *Aktif* atau *Ganti kunci*.

**Modul tambahan** (mis. SPP, wakaf, inventaris) cukup memanggil `postingKas_('nama-modul', idTransaksi, {tanggal, jenis, jumlah, akun, program, keterangan})` dan `batalKas_('nama-modul', idTransaksi)`; laporan & sinkron otomatis ikut.

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

1. **Backend**: simpan `panduan/template-modul.gs` sebagai `gas/30_Galeri.gs` di GitHub → klik **Perbarui sistem** → sheet & menu admin terbentuk otomatis.
2. **Website**: simpan `panduan/template-modul.js` sebagai `assets/js/modules/galeri.js` → tambahkan `'galeri'` ke `KONFIG.MODUL` → naikkan `VERSI`.

Modul dapat menambah: sheet + kolom (form admin dibuat otomatis), endpoint GET/POST publik, tombol aksi admin, data beranda/bootstrap, tugas per jam, halaman + menu + bagian beranda. Matikan modul tanpa menghapus file lewat `MODUL_NONAKTIF` (backend) atau `KONFIG.MODUL` (website).

## 9. Catatan teknis

- Keamanan: hanya fungsi tanpa akhiran `_` yang bisa dipanggil dari browser. Fungsi internal baru di modul tambahan **wajib** diberi akhiran `_` (contoh di `panduan/`). `perbaruiSistem`, `setup` dan `resetPasswordAdmin` hanya berjalan dari editor atau menu Sheet oleh pemilik.
- Cara kerja pemuat: `perbaruiSistem` mengunduh zip repo, menggabungkan `gas/*.gs` + `Admin.html`, mengujinya di ruang terpisah (sintaks & fungsi wajib), lalu menyimpannya terkompresi di Script Properties (versi aktif + satu versi sebelumnya). Setiap permintaan memuat kode itu sekali. File yang tidak dipakai lagi di `gas/` cukup dikosongkan, jangan dihapus — unggahan lewat browser tidak menghapus file lama di GitHub.
- Tanpa pemuat pun bisa: tempel semua isi `gas/` (+ `pasang/appsscript.json`) ke proyek Apps Script secara manual.

- **Kecepatan**: jawaban server di-cache 1 jam dan otomatis disiapkan ulang oleh trigger setiap jam serta setelah data berubah, jadi pengunjung jarang menunggu server menghitung. Browser pengunjung menyimpan salinan hingga 7 hari: kunjungan berikutnya tampil seketika lalu diperbarui diam-diam. Permintaan pengunjung tidak pernah menunggu sinkron latar belakang. Halaman `cek.html` menampilkan lama muat, waktu hitung server, dan apakah jawaban berasal dari cache.
- Putaran lanjutan otomatis berhenti bila pemakaian trigger hari itu > 60 menit (`SINKRON_LANJUTAN_MENIT_HARI`), menjaga jatah akun Gmail ±90 menit/hari; sisanya lanjut pada jadwal per jam.
- Apps Script punya kuota harian (pengambilan URL, geocoding, durasi eksekusi; lihat halaman *Quotas for Google Services*). Data publik di-cache 5 menit di server dan di browser, dan hasil geocoding di-cache per area, sehingga pemakaian kuota hemat. Bila kuota geocoding habis, koordinat tetap tercatat tanpa nama kecamatan.
- Gambar artikel disalin ke folder Drive publik `Gambar Artikel (publik)`; jangan ubah izin bagikannya.
- Fitur kajian terdekat mewajibkan nomor WA + izin lokasi. Teks pemberitahuan pencatatan di halaman Kajian sebaiknya dipertahankan sebagai dasar persetujuan pengunjung (UU PDP).
- Isi artikel dari kontributor disaring dua kali: di server dan di browser (DOMPurify, `assets/vendor/purify.min.js`). Hanya iframe YouTube/Vimeo yang diizinkan.
- Peta memakai Leaflet + OpenStreetMap dari CDN; bila gagal dimuat, daftar kajian tetap berfungsi.
