/** =========================================================
 *  DASHBOARD & ARUS KAS
 * ========================================================= */

function getDashboard(ledger, period, params) {
  const all = getTransaksi(ledger);
  const filtered = all.filter(tx => matchesPeriod(tx.tanggal, period, params));

  let pemasukan = 0, pengeluaran = 0, transferMasuk = 0, transferKeluar = 0;
  const pengeluaranKategori = {};
  const pemasukanKategori = {};

  filtered.forEach(tx => {
    if (tx.tipe === 'Pemasukan') {
      pemasukan += tx.debit;
      pemasukanKategori[tx.kategori] = (pemasukanKategori[tx.kategori] || 0) + tx.debit;
    }
    if (tx.tipe === 'Pengeluaran') {
      pengeluaran += tx.kredit;
      pengeluaranKategori[tx.kategori] = (pengeluaranKategori[tx.kategori] || 0) + tx.kredit;
    }
    if (tx.tipe === 'Transfer Masuk') transferMasuk += tx.debit;
    if (tx.tipe === 'Transfer Keluar') transferKeluar += tx.kredit;
  });

  const saldoBersih = all.length ? all[all.length - 1].saldoAkhir : 0;

  return {
    pemasukan, pengeluaran, transferMasuk, transferKeluar, saldoBersih,
    rincianPengeluaran: toRincian(pengeluaranKategori),
    rincianPemasukan: toRincian(pemasukanKategori),
    jumlahTransaksi: filtered.length
  };
}

/** Arus kas per akun/metode: pemasukan & pengeluaran ikut filter periode,
 *  tapi saldo saat ini per akun SELALU dari seluruh riwayat (tidak difilter). */
function getArusKas(ledger, period, params) {
  const all = getTransaksi(ledger);
  const filtered = all.filter(tx => matchesPeriod(tx.tanggal, period, params));

  const periodeMap = {};
  filtered.forEach(tx => {
    if (!periodeMap[tx.akun]) periodeMap[tx.akun] = { masuk: 0, keluar: 0 };
    periodeMap[tx.akun].masuk += tx.debit;
    periodeMap[tx.akun].keluar += tx.kredit;
  });

  const saldoMap = {};
  all.forEach(tx => {
    saldoMap[tx.akun] = (saldoMap[tx.akun] || 0) + tx.debit - tx.kredit;
  });

  return Object.keys(saldoMap).sort().map(akun => ({
    akun,
    masukPeriode: (periodeMap[akun] && periodeMap[akun].masuk) || 0,
    keluarPeriode: (periodeMap[akun] && periodeMap[akun].keluar) || 0,
    saldoSaatIni: saldoMap[akun]
  }));
}

function toRincian(map) {
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  return Object.entries(map)
    .map(([kategori, jumlah]) => ({ kategori, jumlah, persen: total ? (jumlah / total * 100) : 0 }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

function matchesPeriod(tanggalStr, period, params) {
  const parts = String(tanggalStr).split('/');
  const date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));

  if (period === 'bulanan') {
    return date.getFullYear() === Number(params.tahun) && (date.getMonth() + 1) === Number(params.bulan);
  }
  if (period === 'tahunan') {
    return date.getFullYear() === Number(params.tahun);
  }
  if (period === 'mingguan') {
    return getWeekKey(date) === params.minggu;
  }
  return true;
}

function getDaftarMinggu(ledger) {
  const all = getTransaksi(ledger);
  const set = {};
  all.forEach(tx => { set[tx.minggu] = true; });
  return Object.keys(set).sort();
}
