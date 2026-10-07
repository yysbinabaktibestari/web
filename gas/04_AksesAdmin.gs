/**
 * MODUL AKSES: akun admin, peran & hak akses, log aktivitas.
 * Hanya peran berakses "*" (Superadmin) yang melihat modul ini.
 */
var MODUL = MODUL || {};

MODUL.akses = {
  judul: 'Pengelolaan Admin',
  urutan: 90,
  zona: 'sistem',

  sheets: [
    {
      nama: 'Admin',
      judul: 'Akun admin',
      keterangan: 'Tambah akun dengan tombol "Tambah admin". Password disimpan sebagai hash, tidak bisa dilihat siapa pun.',
      bisaTambah: false,
      urut: { k: 'nama', arah: 'asc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'nama', l: 'Nama', t: 'text', wajib: true },
        { k: 'username', l: 'Username / email', t: 'text', ro: true },
        { k: 'peran', l: 'Peran', t: 'ref', ref: { sheet: 'Peran', nilai: 'nama', label: 'nama' }, wajib: true },
        { k: 'aktif', l: 'Aktif', t: 'bool', bawaan: true, bantuan: 'Matikan untuk mencabut akses tanpa menghapus akun' },
        { k: 'wajib_ganti', l: 'Wajib ganti password', t: 'bool', bawaan: false, daftar: false },
        { k: 'terakhir_masuk', l: 'Terakhir masuk', t: 'datetime', ro: true },
        { k: 'dibuat', l: 'Dibuat', t: 'datetime', ro: true, daftar: false },
        { k: 'hash', t: 'text', ro: true, rahasia: true, privat: true },
        { k: 'garam', t: 'text', ro: true, rahasia: true, privat: true }
      ]
    },
    {
      nama: 'Peran',
      judul: 'Peran & hak akses',
      keterangan: 'Akses = nama sheet dipisah koma, atau * untuk semua (Superadmin).',
      kunci: 'nama',
      kolom: [
        { k: 'nama', l: 'Nama peran', t: 'text', wajib: true },
        { k: 'akses', l: 'Akses sheet', t: 'textarea', wajib: true },
        { k: 'boleh_hapus', l: 'Boleh hapus', t: 'bool', bawaan: false },
        { k: 'boleh_ekspor', l: 'Boleh unduh Excel', t: 'bool', bawaan: true },
        { k: 'keterangan', l: 'Keterangan', t: 'text' }
      ],
      isiAwal: [
        { nama: 'Superadmin', akses: '*', boleh_hapus: true, boleh_ekspor: true, keterangan: 'Semua menu, termasuk pengelolaan admin' },
        { nama: 'Editor', akses: 'Artikel, Kategori, Kontributor, Kajian, Bidang, Tautan, Pengurus, Video, KategoriVideo, SumberVideo, PlaylistVideo', boleh_hapus: false, boleh_ekspor: true, keterangan: 'Konten & kurasi kontributor' },
        { nama: 'Bendahara', akses: 'Sematan, Program, Rekening, KontakDonasi, Konfirmasi', boleh_hapus: false, boleh_ekspor: true, keterangan: 'Donasi & banner' },
        { nama: 'Pengelola Kajian', akses: 'Kajian, LogLokasi', boleh_hapus: true, boleh_ekspor: true, keterangan: 'Jadwal & log lokasi' }
      ]
    },
    {
      nama: 'LogAktivitas',
      judul: 'Log aktivitas',
      keterangan: 'Catatan permanen siapa melakukan apa. Hapus hanya manual.',
      bisaTambah: false,
      urut: { k: 'waktu', arah: 'desc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'waktu', l: 'Waktu', t: 'datetime', ro: true },
        { k: 'nama', l: 'Admin', t: 'text', ro: true },
        { k: 'username', l: 'Username', t: 'text', ro: true, daftar: false },
        { k: 'aksi', l: 'Aksi', t: 'text', ro: true },
        { k: 'sheet', l: 'Sheet', t: 'text', ro: true },
        { k: 'kunci', l: 'Data', t: 'text', ro: true },
        { k: 'ringkasan', l: 'Keterangan', t: 'text', ro: true }
      ]
    }
  ],

  alat: [
    {
      id: 'tambah_admin', sheet: 'Admin', label: '+ Tambah admin', gaya: 'utama',
      input: [
        { k: 'nama', l: 'Nama', t: 'text', wajib: true },
        { k: 'username', l: 'Username / email', t: 'text', wajib: true },
        { k: 'peran', l: 'Peran', t: 'ref', ref: { sheet: 'Peran', nilai: 'nama', label: 'nama' }, wajib: true },
        { k: 'sandi', l: 'Password awal (min. 8 karakter)', t: 'text', wajib: true, bantuan: 'Admin baru diminta mengganti password saat pertama masuk.' }
      ],
      run: function (ids, inp) {
        var uname = String(inp.username || '').trim().toLowerCase();
        if (!inp.nama || !uname || !inp.peran) throw new Error('Nama, username, dan peran wajib diisi.');
        if (!/^[a-z0-9._@+-]{3,80}$/.test(uname)) throw new Error('Username hanya boleh huruf kecil, angka, titik, @, -, _.');
        validSandi_(inp.sandi);
        var tb = new Tabel_('Admin');
        if (tb.objek().some(function (u) { return String(u.username).toLowerCase() === uname; })) throw new Error('Username sudah dipakai.');
        var garam = Utilities.getUuid();
        tb.set({ nama: inp.nama, username: uname, peran: inp.peran, aktif: true, wajib_ganti: true,
          dibuat: new Date(), garam: garam, hash: hashSandi_(inp.sandi, garam) });
        tb.simpan();
        return { pesan: 'Akun "' + uname + '" dibuat. Berikan password awal kepada yang bersangkutan.' };
      }
    },
    {
      id: 'reset_sandi', sheet: 'Admin', label: 'Reset password', perluPilih: true,
      input: [{ k: 'sandi', l: 'Password baru sementara (min. 8 karakter)', t: 'text', wajib: true }],
      run: function (ids, inp) {
        validSandi_(inp.sandi);
        var tb = new Tabel_('Admin');
        ids.forEach(function (id) {
          if (!tb.ambil(id)) return;
          var garam = Utilities.getUuid();
          tb.set({ id: id, garam: garam, hash: hashSandi_(inp.sandi, garam), wajib_ganti: true });
        });
        tb.simpan();
        return { pesan: 'Password direset. Pemilik akun wajib menggantinya saat masuk.' };
      }
    }
  ],

  /** Jaga agar selalu ada minimal satu Superadmin aktif. */
  sebelumSimpan: function (nama, obj, lama) {
    if (nama === 'Peran' && lama && lama.akses === '*' && obj.akses !== undefined && String(obj.akses).trim() !== '*') {
      if (jumlahSuperAktif_(null, lama.nama) === 0) throw new Error('Peran ini satu-satunya berakses penuh. Buat peran Superadmin lain dulu.');
    }
    if (nama !== 'Admin' || !lama) return;
    var akanAktif = obj.aktif === undefined ? lama.aktif : (obj.aktif === true || obj.aktif === 'true');
    var peranBaru = obj.peran || lama.peran;
    if (ADMIN_AKTIF && lama.id === ADMIN_AKTIF.id && !akanAktif) throw new Error('Anda tidak bisa menonaktifkan akun sendiri.');
    var tetapSuper = akanAktif && peranSuper_(peranBaru);
    if (!tetapSuper && peranSuper_(lama.peran) && lama.aktif !== false && jumlahSuperAktif_(lama.id) === 0) {
      throw new Error('Harus ada minimal satu Superadmin aktif.');
    }
  },

  sebelumHapus: function (nama, ids) {
    if (nama === 'Admin') {
      if (ADMIN_AKTIF && ids.indexOf(ADMIN_AKTIF.id) >= 0) throw new Error('Anda tidak bisa menghapus akun sendiri.');
      var sisa = bacaTabel_('Admin').filter(function (u) { return ids.indexOf(u.id) < 0 && u.aktif !== false && peranSuper_(u.peran); });
      if (!sisa.length) throw new Error('Harus ada minimal satu Superadmin aktif.');
    }
    if (nama === 'Peran') {
      var dipakai = bacaTabel_('Admin').filter(function (u) { return ids.indexOf(u.peran) >= 0; });
      if (dipakai.length) throw new Error('Peran masih dipakai oleh ' + dipakai.length + ' akun.');
    }
  }
};

function peranSuper_(namaPeran) {
  var p = bacaTabel_('Peran').filter(function (x) { return x.nama === namaPeran; })[0];
  return !!p && String(p.akses).trim() === '*';
}

/** Jumlah Superadmin aktif, tidak menghitung akun `kecualiId` / peran `kecualiPeran`. */
function jumlahSuperAktif_(kecualiId, kecualiPeran) {
  var superPeran = bacaTabel_('Peran').filter(function (p) { return String(p.akses).trim() === '*' && p.nama !== kecualiPeran; })
    .map(function (p) { return p.nama; });
  return bacaTabel_('Admin').filter(function (u) {
    return u.id !== kecualiId && u.aktif !== false && superPeran.indexOf(u.peran) >= 0;
  }).length;
}
