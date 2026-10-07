/* Modul KAJIAN: jadwal, pencarian manual, kajian terdekat (WA + lokasi wajib), peta. */
(function () {
  'use strict';
  var esc = U.esc;
  var LEAFLET = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/';

  function linkArah(k) {
    if (k.maps_url) return k.maps_url;
    if (k.lat && k.lng) return 'https://www.google.com/maps/dir/?api=1&destination=' + k.lat + ',' + k.lng;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([k.tempat, k.alamat, k.kota].filter(Boolean).join(', '));
  }

  function item(k, terdekat) {
    var b = U.bagianTgl(k.tanggal_berikut);
    return '<div class="kajian-item' + (terdekat ? ' terdekat' : '') + '">' +
      '<span class="tgl-blok" aria-hidden="true"><span>' + esc(b.hari) + '</span><span>' + esc(b.tgl) + '</span></span>' +
      '<div class="isi">' +
        '<span class="chips">' + (terdekat ? '<span class="chip c-emas">Terdekat</span>' : '') +
          (k.jenis === 'Rutin' ? '<span class="chip c-biru">Rutin tiap ' + esc(k.hari_rutin) + '</span>' : '') + '</span>' +
        '<span class="tema">' + esc(k.tema) + '</span>' +
        '<span class="redup" style="font-size:15px">' + [k.pemateri, k.jam ? k.jam + (k.jam_selesai ? '–' + k.jam_selesai : '') + ' WIB' : '', b.hari + ', ' + U.tgl(k.tanggal_berikut, true)].filter(Boolean).map(esc).join(' · ') + '</span>' +
        '<span class="tempat"><span style="color:var(--karat);display:inline-flex">' + U.ikon('pin', 16) + '</span>' + esc([k.tempat, k.kecamatan].filter(Boolean).join(', ')) +
          (k._jarak != null ? '<span class="redup">· ' + k._jarak.toFixed(1).replace('.', ',') + ' km dari Anda</span>' : '') + '</span>' +
        (k.keterangan ? '<span class="redup" style="font-size:14px">' + esc(k.keterangan) + '</span>' : '') +
      '</div>' +
      '<a class="btn btn-biru-garis btn-kecil" href="' + esc(linkArah(k)) + '" target="_blank" rel="noopener">' + U.ikon('arah', 16) + 'Petunjuk Arah</a>' +
    '</div>';
  }

  function halaman(el) {
    App.judul('Jadwal Kajian');
    return API.get('kajian').then(function (semua) {
      var st = { pos: null, wilayah: '', q: '', waktu: 'semua', peta: null, lapisan: null };
      var waTersimpan = U.bacaLokal('wa-kajian') || '';

      el.innerHTML = '<div class="wadah">' +
        '<section style="display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start;padding:56px 0 32px">' +
          '<div style="flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:12px">' +
            '<span class="label-atas">Kajian Rutin &amp; Tabligh</span>' +
            '<h1 class="display" style="font-size:clamp(36px,4.5vw,54px);line-height:1.08">Jadwal Kajian</h1>' +
            '<p class="redup" style="margin:0;font-size:18px;max-width:520px">Temukan kajian terdekat dan dapatkan petunjuk arah ke lokasinya.</p>' +
          '</div>' +
          '<div class="kartu kartu-lokasi" id="kartu-lokasi" style="flex:1 1 420px;min-width:0" aria-live="polite"></div>' +
        '</section>' +
        '<section class="kartu cari-bar" aria-labelledby="h-cari" style="margin-bottom:20px">' +
          '<h2 id="h-cari" style="flex:1 1 100%;font-size:18px"></h2>' +
          '<div class="medan" style="flex:1 1 320px"><label for="cari-kajian">Cari masjid, kecamatan, atau pemateri</label><input id="cari-kajian" type="search" placeholder="mis. Lowokwaru"></div>' +
          '<div class="medan" style="flex:0 1 220px"><label for="waktu-kajian">Waktu</label><select id="waktu-kajian">' +
            '<option value="semua">Semua jadwal</option><option value="hari">Hari ini</option><option value="pekan">7 hari ke depan</option><option value="rutin">Kajian rutin</option></select></div>' +
        '</section>' +
        '<div class="tata-kajian"><div class="daftar" id="daftar-kajian" aria-live="polite"></div>' +
          '<aside aria-label="Peta lokasi kajian"><div id="peta"></div></aside></div>' +
      '</div>';

      var kartuLokasi = el.querySelector('#kartu-lokasi');

      function renderKartu(status, pesan) {
        if (status === 'ok') {
          kartuLokasi.innerHTML = '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
            '<span class="logo-tanda" style="color:#fff">' + U.ikon('pin', 22) + '</span>' +
            '<div style="flex:1 1 200px;display:flex;flex-direction:column"><span class="redup" style="font-size:13px;font-weight:600">Lokasi Anda</span>' +
            '<strong style="font-size:18px">' + esc(st.wilayah || 'Lokasi ditemukan') + '</strong></div>' +
            '<button class="btn btn-garis btn-kecil" type="button" id="ubah-lokasi">Ubah</button></div>' +
            '<p class="redup" style="margin:0;font-size:14px">Jadwal di bawah sudah diurutkan dari yang terdekat.</p>';
          kartuLokasi.querySelector('#ubah-lokasi').onclick = function () { st.pos = null; st.wilayah = ''; renderKartu(); renderDaftar(); };
          return;
        }
        kartuLokasi.innerHTML =
          '<div style="display:flex;gap:14px;align-items:flex-start"><span class="logo-tanda" style="background:var(--biru-muda);color:var(--biru)">' + U.ikon('pin', 22) + '</span>' +
          '<div><h2 style="font-size:18px;line-height:1.3">Cari kajian terdekat</h2><p class="redup" style="margin:4px 0 0;font-size:15px">Isi nomor WhatsApp, lalu izinkan akses lokasi di browser.</p></div></div>' +
          '<form id="form-lokasi" novalidate style="display:flex;flex-direction:column;gap:14px">' +
            '<div class="medan"><label for="wa-kajian">Nomor WhatsApp <span class="wajib">*</span></label>' +
            '<input id="wa-kajian" type="tel" inputmode="tel" autocomplete="tel" required placeholder="08xx" value="' + esc(waTersimpan) + '"></div>' +
            '<p class="catatan">Nomor dan perkiraan wilayah Anda akan dicatat yayasan untuk info kajian dan kegiatan.</p>' +
            (pesan ? '<p class="galat" role="alert" style="margin:0">' + esc(pesan) + '</p>' : '') +
            '<button class="btn btn-utama" type="submit"' + (status === 'proses' ? ' disabled' : '') + '>' + U.ikon('target', 18) +
              (status === 'proses' ? 'Mencari lokasi…' : 'Setuju &amp; Gunakan Lokasi Saya') + '</button>' +
          '</form>';
        kartuLokasi.querySelector('#form-lokasi').onsubmit = function (ev) {
          ev.preventDefault();
          var waMentah = kartuLokasi.querySelector('#wa-kajian').value;
          var wa = U.normalWa(waMentah);
          waTersimpan = waMentah;
          if (!wa) { renderKartu('awal', 'Nomor WhatsApp belum valid. Contoh: 0812 3456 7890.'); kartuLokasi.querySelector('#wa-kajian').focus(); return; }
          if (!navigator.geolocation) { renderKartu('awal', 'Browser ini tidak mendukung lokasi. Silakan cari manual di bawah.'); return; }
          renderKartu('proses');
          navigator.geolocation.getCurrentPosition(function (pos) {
            st.pos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            U.simpanLokal('wa-kajian', waMentah);
            renderKartu('ok');
            renderDaftar();
            API.post('lokasi', { wa: wa, lat: st.pos.lat, lng: st.pos.lng, perangkat: U.perangkat(), halaman: 'kajian' })
              .then(function (w) {
                st.wilayah = [w && w.kecamatan, w && w.kota].filter(Boolean).join(', ');
                if (st.pos) renderKartu('ok');
              }).catch(function (e) { console.warn('Log lokasi gagal:', e.message); });
          }, function (err) {
            var pesan = err.code === 1 ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser, atau cari manual di bawah.'
              : 'Lokasi tidak dapat ditentukan. Coba lagi, atau cari manual di bawah.';
            renderKartu('awal', pesan);
          }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
        };
      }

      function tersaring() {
        var hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);
        var batas = new Date(hariIni.getTime() + 7 * 86400000);
        var q = st.q.toLowerCase();
        var list = semua.filter(function (k) {
          if (q && [k.tema, k.pemateri, k.tempat, k.alamat, k.kecamatan, k.kota].join(' ').toLowerCase().indexOf(q) < 0) return false;
          var t = U.keTanggal(k.tanggal_berikut);
          if (st.waktu === 'hari' && (!t || t.getTime() !== hariIni.getTime())) return false;
          if (st.waktu === 'pekan' && (!t || t > batas)) return false;
          if (st.waktu === 'rutin' && k.jenis !== 'Rutin') return false;
          return true;
        }).map(function (k) {
          var o = Object.assign({}, k);
          o._jarak = (st.pos && k.lat && k.lng) ? U.jarakKm(st.pos.lat, st.pos.lng, Number(k.lat), Number(k.lng)) : null;
          return o;
        });
        if (st.pos) list.sort(function (a, b) {
          if (a._jarak == null) return 1;
          if (b._jarak == null) return -1;
          return a._jarak - b._jarak;
        });
        return list;
      }

      function renderDaftar() {
        el.querySelector('#h-cari').textContent = st.pos ? 'Jadwal kajian · urut dari terdekat' : 'Cari jadwal secara manual';
        var list = tersaring();
        el.querySelector('#daftar-kajian').innerHTML = list.length
          ? list.map(function (k, i) { return item(k, st.pos && i === 0 && k._jarak != null); }).join('')
          : '<p class="kartu kosong">' + (semua.length ? 'Tidak ada jadwal yang cocok.' : 'Belum ada jadwal kajian.') + '</p>';
        perbaruiPeta(list);
      }

      function perbaruiPeta(list) {
        var wadahPeta = el.querySelector('#peta');
        var titik = list.filter(function (k) { return k.lat && k.lng; });
        var aside = wadahPeta.parentNode;
        aside.hidden = !titik.length;
        if (!titik.length) { if (st.peta) { st.peta.remove(); st.peta = null; } return; }
        U.muatCss(LEAFLET + 'leaflet.css');
        (window.L ? Promise.resolve() : U.muatSkrip(LEAFLET + 'leaflet.js')).then(function () {
          if (!document.body.contains(wadahPeta)) return;
          wadahPeta.className = ''; wadahPeta.textContent = '';
          if (!st.peta) {
            st.peta = L.map(wadahPeta, { scrollWheelZoom: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(st.peta);
          }
          if (st.lapisan) st.lapisan.remove();
          st.lapisan = L.layerGroup().addTo(st.peta);
          var batas = [];
          titik.forEach(function (k) {
            var ll = [Number(k.lat), Number(k.lng)];
            batas.push(ll);
            L.circleMarker(ll, { radius: 9, color: '#fff', weight: 2, fillColor: '#AF5329', fillOpacity: 1 })
              .bindPopup('<strong>' + esc(k.tema) + '</strong><br>' + esc(k.tempat) + '<br>' + esc(U.tgl(k.tanggal_berikut, true)) + (k.jam ? ' · ' + esc(k.jam) : '') +
                '<br><a href="' + esc(linkArah(k)) + '" target="_blank" rel="noopener">Petunjuk arah</a>')
              .addTo(st.lapisan);
          });
          if (st.pos) {
            var u = [st.pos.lat, st.pos.lng];
            batas.push(u);
            L.circleMarker(u, { radius: 10, color: '#fff', weight: 3, fillColor: '#18548C', fillOpacity: 1 }).bindPopup('Lokasi Anda').addTo(st.lapisan);
          }
          if (batas.length === 1) st.peta.setView(batas[0], 14);
          else st.peta.fitBounds(batas, { padding: [30, 30], maxZoom: 15 });
        }).catch(function () {
          wadahPeta.className = 'arsir'; wadahPeta.textContent = 'Peta tidak dapat dimuat.';
        });
      }

      var t;
      el.querySelector('#cari-kajian').oninput = function (ev) { clearTimeout(t); t = setTimeout(function () { st.q = ev.target.value.trim(); renderDaftar(); }, 200); };
      el.querySelector('#waktu-kajian').onchange = function (ev) { st.waktu = ev.target.value; renderDaftar(); };
      renderKartu('awal');
      renderDaftar();
    });
  }

  App.modul({
    id: 'kajian',
    butuh: 'kajian',
    nav: { label: 'Kajian', href: '#/kajian' },
    rute: [{ pola: 'kajian', render: halaman }],
    beranda: [{
      urutan: 20,
      render: function (d) {
        var list = d.kajian || [];
        if (!list.length) return '';
        return '<div class="wadah" style="padding-bottom:72px"><section class="panel-kajian" aria-labelledby="h-kajian">' +
          '<div class="teks"><h2 id="h-kajian">Kajian Pekan Ini</h2><p>Lihat jadwal lengkap dan temukan lokasi kajian terdekat dari posisi Anda.</p>' +
          '<a class="btn btn-emas" href="#/kajian" style="align-self:flex-start;margin-top:8px">' + U.ikon('pin', 18) + 'Cari Kajian Terdekat</a></div>' +
          '<ul>' + (list.length ? list.map(function (k) {
            var b = U.bagianTgl(k.tanggal_berikut);
            return '<li><span class="tgl-blok" aria-hidden="true"><span>' + esc(b.hari) + '</span><span>' + esc(b.tgl) + '</span></span>' +
              '<span style="display:flex;flex-direction:column;min-width:0"><strong>' + esc(k.tema) + '</strong>' +
              '<span class="kecil">' + [k.pemateri, k.tempat, k.jam].filter(Boolean).map(esc).join(' · ') + '</span></span></li>';
          }).join('') : '<li><span class="kecil">Belum ada jadwal dalam 7 hari ke depan.</span></li>') + '</ul></section></div>';
      }
    }]
  });
})();
