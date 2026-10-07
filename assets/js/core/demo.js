/* Penyedia data DEMO (dipakai bila KONFIG.API_URL kosong). Meniru respons backend GAS. */
var Demo = (function () {
  'use strict';
  var data = null;
  var HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

  function muat() {
    if (data) return Promise.resolve(data);
    return fetch('data/demo.json?v=' + encodeURIComponent(KONFIG.VERSI)).then(function (r) { return r.json(); }).then(function (d) {
      var kat = {}, kon = {};
      d.kategori.forEach(function (k) { kat[k.slug] = k; });
      d.kontributor.forEach(function (k) { kon[k.slug] = k; });
      d.artikel.forEach(function (a) {
        var k = kat[a.kategori] || {};
        a.kategori_nama = k.nama || ''; a.warna = k.warna || 'netral';
        if (typeof a.kontributor === 'string') { var ko = kon[a.kontributor]; a.kontributor = ko ? { slug: ko.slug, nama: ko.nama, foto: ko.foto } : null; }
      });
      var hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);
      d.kajian.forEach(function (k) {
        var t;
        if (k.jenis === 'Rutin') {
          var dow = (hariIni.getDay() + 6) % 7, target = HARI.indexOf(k.hari_rutin);
          t = new Date(hariIni.getTime() + ((target - dow + 7) % 7) * 86400000);
        } else {
          t = new Date(hariIni.getTime() + (k.offset_hari || 0) * 86400000);
        }
        k.tanggal_berikut = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
      });
      d.kajian.sort(function (a, b) { return a.tanggal_berikut.localeCompare(b.tanggal_berikut); });
      data = d;
      return d;
    });
  }

  function namaKatVideo(d) {
    return function (v) {
      var k = (d.kategoriVideo || []).filter(function (x) { return x.slug === v.kategori; })[0];
      return Object.assign({}, v, { kategori_nama: k ? k.nama : '' });
    };
  }

  function tunda(v) { return new Promise(function (res) { setTimeout(function () { res(v); }, 120); }); }
  function ringkas(a) { var o = Object.assign({}, a); delete o.konten; return o; }

  /** Sama dengan backend: artikel 30 hari terakhir disusun bergiliran antar penulis. */
  function ratakan(list) {
    var grup = {}, urutan = [], out = [], masih = true;
    list.forEach(function (a) {
      var k = a.kontributor ? 'k:' + a.kontributor.slug : 'p:' + a.penulis;
      if (!grup[k]) { grup[k] = []; urutan.push(k); }
      grup[k].push(a);
    });
    while (masih) { masih = false; urutan.forEach(function (k) { if (grup[k].length) { out.push(grup[k].shift()); masih = true; } }); }
    return out;
  }

  var GET = {
    bootstrap: function (d) {
      return { situs: d.situs, tautan: d.tautan, kategori: d.kategori, sematan: d.sematan,
        modul: ['situs', 'artikel', 'kontributor', 'kajian', 'video', 'donasi'], fitur: { pendaftaranKontributor: true }, feed: '',
        kontributor: GET.kontributor(d), kategoriVideo: d.kategoriVideo };
    },
    beranda: function (d) {
      var batas = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      return {
        bidang: d.bidang,
        artikel: {
          pengumuman: d.artikel.filter(function (a) { return a.kategori === 'pengumuman'; }).slice(0, 3).map(ringkas),
          terbaru: ratakan(d.artikel.filter(function (a) { return a.kategori !== 'pengumuman'; })).slice(0, 6).map(ringkas)
        },
        kajian: d.kajian.filter(function (k) { return k.tanggal_berikut <= batas; }).slice(0, 3),
        kontributor: GET.kontributor(d),
        video: d.video.slice(0, 4).map(namaKatVideo(d))
      };
    },
    artikel: function (d, p) {
      var q = String(p.q || '').toLowerCase(), hal = Number(p.halaman) || 1, per = 12;
      var list = d.artikel.filter(function (a) {
        return (!p.kategori || a.kategori === p.kategori) &&
          (!p.kontributor || (p.kontributor === 'yayasan' ? !a.kontributor : (a.kontributor && a.kontributor.slug === p.kontributor))) &&
          (!q || (a.judul + ' ' + a.ringkasan).toLowerCase().indexOf(q) >= 0);
      });
      var sematan = (!p.kategori && !q && hal === 1) ? list.filter(function (a) { return a.disematkan; }) : [];
      list = list.filter(function (a) { return sematan.indexOf(a) < 0; });
      if (!p.kontributor) list = ratakan(list);
      return { items: list.slice((hal - 1) * per, hal * per).map(ringkas), disematkan: sematan.map(ringkas), total: list.length,
        halaman: hal, jumlahHalaman: Math.max(1, Math.ceil(list.length / per)) };
    },
    artikel_detail: function (d, p) {
      var a = d.artikel.filter(function (x) { return x.slug === p.slug; })[0];
      if (!a) throw new Error('Artikel tidak ditemukan.');
      var o = Object.assign({}, a);
      o.menit_baca = Math.max(1, Math.round(a.konten.replace(/<[^>]+>/g, ' ').split(/\s+/).length / 200));
      o.terkait = d.artikel.filter(function (x) { return x !== a && x.kategori === a.kategori; }).slice(0, 3).map(ringkas);
      if (a.kontributor) o.kontributor = d.kontributor.filter(function (k) { return k.slug === a.kontributor.slug; })[0];
      return o;
    },
    kontributor: function (d) {
      return d.kontributor.map(function (k) {
        var o = Object.assign({}, k);
        o.jumlah_artikel = d.artikel.filter(function (a) { return a.kontributor && a.kontributor.slug === k.slug; }).length;
        return o;
      });
    },
    kontributor_detail: function (d, p) {
      var k = d.kontributor.filter(function (x) { return x.slug === p.slug; })[0];
      if (!k) throw new Error('Kontributor tidak ditemukan.');
      var o = Object.assign({}, k);
      o.artikel = d.artikel.filter(function (a) { return a.kontributor && a.kontributor.slug === k.slug; }).map(ringkas);
      o.total = o.artikel.length; o.halaman = 1; o.jumlahHalaman = 1;
      return o;
    },
    kajian: function (d) { return d.kajian; },
    video: function (d, p) {
      var q = String(p.q || '').toLowerCase();
      var list = d.video.filter(function (v) {
        return (!p.kategori || v.kategori === p.kategori) && (!q || (v.judul + ' ' + v.pemateri + ' ' + v.kanal).toLowerCase().indexOf(q) >= 0);
      }).map(namaKatVideo(d));
      return { items: list, total: list.length, halaman: 1, jumlahHalaman: 1 };
    },
    video_detail: function (d, p) {
      var v = d.video.filter(function (x) { return x.id === p.id; })[0];
      if (!v) throw new Error('Video tidak ditemukan.');
      var o = namaKatVideo(d)(v);
      o.terkait = d.video.filter(function (x) { return x !== v && x.kategori === v.kategori; }).map(namaKatVideo(d));
      return o;
    },
    donasi: function (d) { return { program: d.program, rekening: d.rekening, kontak: d.kontak }; },
    profil: function (d) { return { pengurus: d.pengurus, bidang: d.bidang }; }
  };

  var POST = {
    lokasi: function () { return { kecamatan: '[Kecamatan Anda]', kota: '[Kota]', provinsi: '' }; },
    daftar_kontributor: function () { return { pesan: '(Mode demo) Pendaftaran tidak disimpan. Sambungkan API_URL agar formulir berfungsi.' }; },
    konfirmasi_donasi: function () { return { pesan: '(Mode demo) Konfirmasi tidak disimpan. Sambungkan API_URL agar formulir berfungsi.' }; }
  };

  return {
    get: function (aksi, p) {
      return muat().then(function (d) {
        if (!GET[aksi]) throw new Error('Aksi demo tidak tersedia: ' + aksi);
        return tunda(GET[aksi](d, p || {}));
      });
    },
    post: function (aksi, b) {
      if (!POST[aksi]) return Promise.reject(new Error('Aksi demo tidak tersedia: ' + aksi));
      return tunda(POST[aksi](b));
    }
  };
})();
