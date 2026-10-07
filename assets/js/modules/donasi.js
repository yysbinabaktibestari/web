/* Modul DONASI: program aktif + progres, rekening (banyak), QRIS, kontak & formulir konfirmasi. */
(function () {
  'use strict';
  var esc = U.esc;
  var MAKS = 5 * 1024 * 1024;

  function kecilkanGambar(file) {
    if (!/^image\//.test(file.type) || file.size < 1.5 * 1024 * 1024) return Promise.resolve(file);
    return new Promise(function (res) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var skala = Math.min(1, 1600 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * skala); c.height = Math.round(img.height * skala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { res(b ? new File([b], 'bukti.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }

  function keBase64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = function () { rej(new Error('File tidak bisa dibaca.')); };
      r.readAsDataURL(file);
    });
  }

  function program(p) {
    return '<article class="program" style="margin-bottom:20px">' +
      U.gambar(p.poster, 'Poster ' + p.nama, 'Poster program', 'poster') +
      '<div class="isi"><span class="chip c-karat">' + U.ikon('jam', 14) + 'Open Donasi' + (p.selesai ? ' · s.d. ' + U.tgl(p.selesai, true) : '') + '</span>' +
        '<h2>' + esc(p.nama) + '</h2>' + (p.deskripsi ? '<p class="redup" style="margin:0;white-space:pre-line">' + esc(p.deskripsi) + '</p>' : '') +
        (p.target ? '<div style="display:flex;flex-direction:column;gap:6px"><div class="progres" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (p.persen || 0) + '" aria-label="Progres dana">' +
          '<span style="width:' + Math.max(2, p.persen || 0) + '%"></span></div>' +
          '<span style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:14px"><span><strong>' + U.rupiah(p.terkumpul) + '</strong> terkumpul</span>' +
          '<span class="redup">target ' + U.rupiah(p.target) + ' · ' + (p.persen || 0) + '%</span></span></div>' : '') +
      '</div></article>';
  }

  function halaman(el) {
    var s = App.data().situs;
    App.judul('Donasi');
    return API.get('donasi').then(function (d) {
      var warna = { umum: 'c-biru', pendidikan: 'c-emas', sosial: 'c-karat' };
      var opsiRek = d.rekening.map(function (r) { return r.bank + ' · ' + r.nomor; });
      if (s.qris) opsiRek.push('QRIS');
      el.innerHTML = '<div class="wadah">' +
        '<header class="kepala-halaman"><span class="label-atas" style="background:var(--karat-muda);color:var(--karat-tua)">Infaq · Sedekah · Wakaf</span>' +
          '<h1>Donasi</h1>' + (s.ajakan_donasi ? '<p>' + esc(s.ajakan_donasi) + '</p>' : '') + '</header>' +
        d.program.map(program).join('') +
        '<section aria-labelledby="h-rek" style="padding:36px 0 56px"><div class="kepala-bagian"><h2 id="h-rek">Rekening Donasi</h2></div>' +
          '<div class="grid">' + d.rekening.map(function (r, i) {
            return '<div class="kartu rekening">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><strong style="font-size:18px">' + esc(r.bank) + '</strong>' +
                (r.peruntukan ? '<span class="chip ' + (warna[String(r.peruntukan).toLowerCase()] || 'c-netral') + '">' + esc(r.peruntukan) + '</span>' : '') + '</div>' +
              '<span class="nomor">' + esc(r.nomor) + '</span>' +
              '<span class="redup" style="font-size:15px">a.n. ' + esc(r.atas_nama) + '</span>' +
              '<button class="btn btn-biru-garis btn-kecil" type="button" data-salin="' + i + '">' + U.ikon('salin', 16) + 'Salin nomor rekening</button>' +
              (r.kontak ? '<span class="redup" style="font-size:13.5px">Konfirmasi: ' + esc(r.kontak.nama) + '</span>' : '') +
            '</div>';
          }).join('') +
          (s.qris ? '<div class="kartu rekening" style="align-items:center;text-align:center"><strong style="font-size:18px">QRIS</strong>' +
            '<img src="' + esc(s.qris) + '" alt="Kode QRIS donasi" style="width:200px;border-radius:12px">' +
            '<span class="redup" style="font-size:14px">Pindai dari aplikasi bank atau dompet digital.</span></div>' : '') +
          '</div>' + (d.rekening.length || s.qris ? '' : '<p class="kosong">Informasi rekening belum diisi.</p>') + '</section>' +
      '</div>' +
      '<section class="bagian bagian-putih" aria-labelledby="h-konf"><div class="wadah dua-kolom" style="padding-bottom:0">' +
        '<div style="display:flex;flex-direction:column;gap:16px"><h2 id="h-konf" class="display" style="font-size:32px">Konfirmasi Donasi</h2>' +
          '<p class="redup" style="margin:0">Setelah transfer, kirim konfirmasi lewat formulir atau langsung ke petugas.</p>' +
          d.kontak.map(function (k) {
            var wa = U.normalWa(k.wa);
            return '<a class="kontak" href="https://wa.me/' + wa + '?text=' + encodeURIComponent('Assalamu\'alaikum, saya ingin konfirmasi donasi.') + '" target="_blank" rel="noopener">' +
              '<span style="color:var(--biru);display:inline-flex">' + U.ikon('whatsapp', 22) + '</span>' +
              '<span style="flex:1;display:flex;flex-direction:column;line-height:1.35"><strong>' + esc(k.nama) + '</strong>' + (k.keterangan ? '<span class="redup" style="font-size:14px">' + esc(k.keterangan) + '</span>' : '') + '</span>' +
              '<span style="font-weight:700;font-size:14px;color:var(--biru)">Chat</span></a>';
          }).join('') +
        '</div>' +
        '<form class="form-grid" id="form-konfirmasi" novalidate style="padding:24px;border-radius:20px;background:var(--latar)">' +
          '<div class="medan penuh"><label for="d-nama">Nama donatur</label><input id="d-nama" name="nama" placeholder="Boleh &quot;Hamba Allah&quot;" autocomplete="name"></div>' +
          '<div class="medan"><label for="d-wa">Nomor WhatsApp <span class="wajib">*</span></label><input id="d-wa" name="wa" type="tel" inputmode="tel" required autocomplete="tel"></div>' +
          '<div class="medan"><label for="d-nom">Nominal (Rp) <span class="wajib">*</span></label><input id="d-nom" name="nominal" inputmode="numeric" required></div>' +
          '<div class="medan"><label for="d-tgl">Tanggal transfer</label><input id="d-tgl" name="tanggal_transfer" type="date"></div>' +
          '<div class="medan"><label for="d-rek">Rekening tujuan</label><select id="d-rek" name="rekening">' + opsiRek.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select></div>' +
          (d.program.length ? '<div class="medan penuh"><label for="d-prog">Untuk program</label><select id="d-prog" name="program"><option value="">Donasi umum</option>' +
            d.program.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nama) + '</option>'; }).join('') + '</select></div>' : '') +
          '<div class="medan penuh"><label for="d-bukti">Bukti transfer (gambar/PDF, maks 5 MB)</label><input id="d-bukti" name="bukti" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></div>' +
          '<div class="medan penuh"><label for="d-pesan">Pesan / doa (opsional)</label><textarea id="d-pesan" name="pesan" maxlength="1000"></textarea></div>' +
          '<div class="penuh" id="d-hasil" aria-live="polite"></div>' +
          '<button class="btn btn-karat penuh" type="submit">Kirim Konfirmasi</button>' +
        '</form></div></section><div style="height:64px"></div>';

      el.querySelectorAll('[data-salin]').forEach(function (b) {
        b.onclick = function () {
          var r = d.rekening[Number(b.getAttribute('data-salin'))];
          U.salin(String(r.nomor).replace(/\s/g, '')).then(function () {
            b.innerHTML = U.ikon('salin', 16) + 'Nomor tersalin';
            b.className = 'btn btn-utama btn-kecil';
            U.toast('Nomor rekening ' + r.bank + ' disalin.');
          });
        };
      });
      el.querySelector('#d-nom').oninput = function (ev) {
        var angka = ev.target.value.replace(/[^\d]/g, '');
        ev.target.value = angka ? Number(angka).toLocaleString('id-ID') : '';
      };

      var f = el.querySelector('#form-konfirmasi');
      f.onsubmit = function (ev) {
        ev.preventDefault();
        var hasil = el.querySelector('#d-hasil');
        var data = {
          nama: f.nama.value.trim(), wa: f.wa.value.trim(), nominal: f.nominal.value.replace(/[^\d]/g, ''),
          tanggal_transfer: f.tanggal_transfer.value, rekening: f.rekening ? f.rekening.value : '',
          program: f.program ? f.program.value : '', pesan: f.pesan.value.trim()
        };
        var salah = !U.normalWa(data.wa) ? 'Nomor WhatsApp belum valid.' : (!data.nominal || Number(data.nominal) < 1000) ? 'Nominal belum valid.' : '';
        var file = f.bukti.files[0];
        if (!salah && file && !/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) salah = 'Bukti harus berupa gambar JPG/PNG/WEBP atau PDF.';
        if (salah) { hasil.innerHTML = '<p class="galat" role="alert" style="margin:0">' + esc(salah) + '</p>'; return; }
        var tombol = f.querySelector('[type=submit]');
        tombol.disabled = true; tombol.textContent = 'Mengirim…'; hasil.innerHTML = '';
        (file ? kecilkanGambar(file) : Promise.resolve(null)).then(function (fx) {
          if (fx && fx.size > MAKS) throw new Error('Ukuran bukti maksimal 5 MB.');
          return fx ? keBase64(fx).then(function (b64) { data.bukti = { tipe: fx.type, data: b64 }; }) : null;
        }).then(function () { return API.post('konfirmasi_donasi', data); }).then(function (r) {
          f.innerHTML = '<div class="penuh sukses">' + esc(r.pesan) + '</div>';
        }).catch(function (e) {
          tombol.disabled = false; tombol.textContent = 'Kirim Konfirmasi';
          hasil.innerHTML = '<p class="galat" role="alert" style="margin:0">' + esc(e.message) + '</p>';
        });
      };
    });
  }

  App.modul({
    id: 'donasi',
    butuh: 'donasi',
    nav: { label: 'Donasi', href: '#/donasi', tombol: true },
    rute: [{ pola: 'donasi', render: halaman }]
  });
})();
