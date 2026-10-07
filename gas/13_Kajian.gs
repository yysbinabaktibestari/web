/**
 * MODUL KAJIAN: jadwal kajian (sekali & rutin) + log permintaan lokasi.
 * ------------------------------------------------------------------
 * Fitur "kajian terdekat" mewajibkan nomor WhatsApp + izin lokasi browser.
 * Yang dicatat: waktu, nomor WA, wilayah (kecamatan/kota dari reverse
 * geocoding), koordinat dibulatkan ±100 m, dan jenis perangkat.
 * Log disimpan permanen; hapus hanya manual dari panel admin.
 */
var MODUL = MODUL || {};

var NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

MODUL.kajian = {
  judul: 'Kajian',
  urutan: 30,

  sheets: [
    {
      nama: 'Kajian',
      judul: 'Jadwal kajian',
      keterangan: 'Isi lat/lng agar muncul di peta & bisa diurutkan dari yang terdekat (klik kanan di Google Maps › salin koordinat).',
      urut: { k: 'tanggal', arah: 'desc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'tema', l: 'Tema', t: 'text', wajib: true },
        { k: 'pemateri', l: 'Pemateri', t: 'text' },
        { k: 'jenis', l: 'Jenis', t: 'select', opsi: ['Sekali', 'Rutin'], bawaan: 'Sekali' },
        { k: 'tanggal', l: 'Tanggal (jika sekali)', t: 'date' },
        { k: 'hari_rutin', l: 'Hari (jika rutin)', t: 'select', opsi: NAMA_HARI, daftar: false },
        { k: 'jam', l: 'Jam mulai', t: 'text', bantuan: 'mis. 19.30' },
        { k: 'jam_selesai', l: 'Jam selesai', t: 'text', daftar: false },
        { k: 'tempat', l: 'Tempat', t: 'text', wajib: true },
        { k: 'alamat', l: 'Alamat', t: 'text', daftar: false },
        { k: 'kecamatan', l: 'Kecamatan', t: 'text' },
        { k: 'kota', l: 'Kota/Kab.', t: 'text', daftar: false },
        { k: 'lat', l: 'Latitude', t: 'number', daftar: false },
        { k: 'lng', l: 'Longitude', t: 'number', daftar: false },
        { k: 'maps_url', l: 'Link Google Maps (opsional)', t: 'url', daftar: false },
        { k: 'poster', l: 'Poster (URL)', t: 'image', daftar: false },
        { k: 'keterangan', l: 'Keterangan', t: 'textarea', daftar: false },
        { k: 'tampil', l: 'Tampil', t: 'bool', bawaan: true }
      ]
    },
    {
      nama: 'LogLokasi',
      judul: 'Log permintaan lokasi',
      keterangan: 'Tersimpan permanen di Google Sheet. Hapus hanya manual (centang baris › Hapus).',
      bisaTambah: false,
      urut: { k: 'waktu', arah: 'desc' },
      kolom: [
        { k: 'id', t: 'id' },
        { k: 'waktu', l: 'Waktu', t: 'datetime', ro: true },
        { k: 'wa', l: 'WhatsApp', t: 'wa', privat: true },
        { k: 'kecamatan', l: 'Kecamatan', t: 'text' },
        { k: 'kota', l: 'Kota/Kab.', t: 'text' },
        { k: 'provinsi', l: 'Provinsi', t: 'text', daftar: false },
        { k: 'lat', l: 'Lat (±100 m)', t: 'number', daftar: false },
        { k: 'lng', l: 'Lng (±100 m)', t: 'number', daftar: false },
        { k: 'perangkat', l: 'Perangkat', t: 'text' },
        { k: 'halaman', l: 'Halaman', t: 'text', daftar: false }
      ]
    }
  ],

  publik: {
    kajian: function () { return jadwalKajian_(); }
  },

  publikPost: {
    /** Catat permintaan lokasi. Wajib: nomor WA + koordinat. */
    lokasi: function (b) {
      var wa = normalWa_(b.wa);
      if (!wa) throw new Error('Nomor WhatsApp tidak valid.');
      var lat = Number(b.lat), lng = Number(b.lng);
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
        throw new Error('Lokasi tidak valid.');
      }
      var c = CacheService.getScriptCache();
      var kunciWa = 'lok:' + wa;
      var terakhir = c.get(kunciWa);
      if (terakhir) return JSON.parse(terakhir); // satu catatan per 10 menit per nomor
      var w = wilayah_(lat, lng);
      tambahBaris_('LogLokasi', {
        waktu: new Date(), wa: wa, kecamatan: w.kecamatan, kota: w.kota, provinsi: w.provinsi,
        lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000,
        perangkat: String(b.perangkat || '').slice(0, 40), halaman: String(b.halaman || '').slice(0, 60)
      });
      c.put(kunciWa, JSON.stringify(w), 600);
      return w;
    }
  },

  beranda: function () {
    var batas = fmt_(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd');
    return { kajian: jadwalKajian_().filter(function (k) { return k.tanggal_berikut <= batas; }).slice(0, 3) };
  },

  alat: [
    {
      id: 'ringkasan_wilayah', sheet: 'LogLokasi', label: 'Ringkasan per wilayah',
      run: function () {
        var hitung = {};
        bacaTabel_('LogLokasi').forEach(function (r) {
          var w = (r.kecamatan || '(tidak diketahui)') + (r.kota ? ', ' + r.kota : '');
          if (!hitung[w]) hitung[w] = { wilayah: w, permintaan: 0, nomor: {} };
          hitung[w].permintaan++;
          hitung[w].nomor[r.wa] = 1;
        });
        var tabel = Object.keys(hitung).map(function (k) {
          var h = hitung[k];
          return { wilayah: h.wilayah, permintaan: h.permintaan, nomor_unik: Object.keys(h.nomor).length };
        }).sort(function (a, b) { return b.permintaan - a.permintaan; });
        return { pesan: tabel.length + ' wilayah.', tabel: tabel };
      }
    }
  ]
};

/** Jadwal mendatang. Kajian rutin dihitung tanggal pertemuan berikutnya. */
function jadwalKajian_() {
  var hariIni = hariIni_();
  var dowHariIni = Number(fmt_(new Date(), 'u')); // 1=Senin … 7=Ahad
  return bacaTabel_('Kajian').filter(function (k) { return k.tampil !== false; }).map(function (k) {
    var tgl = '';
    if (k.jenis === 'Rutin') {
      var target = NAMA_HARI.indexOf(k.hari_rutin) + 1;
      if (!target) return null;
      var selisih = (target - dowHariIni + 7) % 7;
      tgl = fmt_(new Date(Date.now() + selisih * 86400000), 'yyyy-MM-dd');
    } else {
      tgl = k.tanggal;
    }
    if (!tgl || tgl < hariIni) return null;
    var d = keSel_(tgl, 'date');
    return {
      id: k.id, tema: k.tema, pemateri: k.pemateri, jenis: k.jenis || 'Sekali',
      hari_rutin: k.hari_rutin || '', tanggal_berikut: tgl, hari: NAMA_HARI[Number(fmt_(d, 'u')) - 1],
      jam: k.jam, jam_selesai: k.jam_selesai, tempat: k.tempat, alamat: k.alamat,
      kecamatan: k.kecamatan, kota: k.kota, lat: k.lat, lng: k.lng, maps_url: k.maps_url,
      poster: k.poster, keterangan: k.keterangan
    };
  }).filter(function (x) { return x; }).sort(function (a, b) {
    return (a.tanggal_berikut + ' ' + jamUrut_(a.jam)).localeCompare(b.tanggal_berikut + ' ' + jamUrut_(b.jam));
  });
}

function jamUrut_(j) {
  var m = String(j || '').match(/(\d{1,2})[.:](\d{2})/);
  return m ? ('0' + m[1]).slice(-2) + m[2] : '9999';
}

/** Reverse geocoding (layanan Maps bawaan Apps Script) → kecamatan, kota, provinsi. */
function wilayah_(lat, lng) {
  var c = CacheService.getScriptCache();
  var kunci = 'geo:' + lat.toFixed(3) + ',' + lng.toFixed(3);
  var hit = c.get(kunci);
  if (hit) return JSON.parse(hit);
  var w = { kecamatan: '', kota: '', provinsi: '' };
  try {
    var r = Maps.newGeocoder().setLanguage('id').reverseGeocode(lat, lng);
    (r.results || []).forEach(function (res) {
      (res.address_components || []).forEach(function (ac) {
        var t = ac.types || [];
        if (!w.kecamatan && t.indexOf('administrative_area_level_3') >= 0) w.kecamatan = ac.long_name.replace(/^Kecamatan\s+/i, '');
        if (!w.kota && t.indexOf('administrative_area_level_2') >= 0) w.kota = ac.long_name;
        if (!w.provinsi && t.indexOf('administrative_area_level_1') >= 0) w.provinsi = ac.long_name;
      });
    });
  } catch (e) { /* kuota geocoding habis: wilayah dikosongkan, koordinat tetap tercatat */ }
  c.put(kunci, JSON.stringify(w), 21600);
  return w;
}
