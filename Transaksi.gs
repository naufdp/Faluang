/** =========================================================
 *  TRANSAKSI: CRUD baris di sheet <ledger>__Transaksi.
 * ========================================================= */

function getTransaksi(ledger) {
  const sh = getSS().getSheetByName(trSheetName(ledger));
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const data = sh.getRange(2, 1, lastRow - 1, TRANSAKSI_HEADERS.length).getValues();
  return data.map((r, i) => ({
    rowIndex: i + 2,
    no: r[0],
    tanggal: formatDateStr(r[1]),
    tipe: r[2],
    kategori: r[3],
    akun: r[4],
    deskripsi: r[5],
    debit: Number(r[6]) || 0,
    kredit: Number(r[7]) || 0,
    saldoAkhir: Number(r[8]) || 0,
    minggu: r[9]
  }));
}

function formatDateStr(d) {
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  return d;
}

function addTransaksi(ledger, form) {
  const sh = getSS().getSheetByName(trSheetName(ledger));
  const tanggal = new Date(form.tanggal);
  const tipe = form.tipe;
  const jumlah = Math.abs(Number(form.jumlah) || 0);

  let debit = 0, kredit = 0;
  if (tipe === 'Pemasukan' || tipe === 'Transfer Masuk') debit = jumlah;
  else kredit = jumlah;

  const lastRow = sh.getLastRow();
  const no = lastRow < 2 ? 1 : Number(sh.getRange(lastRow, 1).getValue()) + 1;
  const prevSaldo = lastRow < 2 ? 0 : Number(sh.getRange(lastRow, 9).getValue()) || 0;
  const saldoAkhir = prevSaldo + debit - kredit;
  const minggu = getWeekKey(tanggal);

  sh.appendRow([no, tanggal, tipe, form.kategori, form.akun, form.deskripsi || '', debit, kredit, saldoAkhir, minggu]);
  applyWeekColor(ledger);
  return getTransaksi(ledger);
}

function updateTransaksi(ledger, rowIndex, form) {
  const sh = getSS().getSheetByName(trSheetName(ledger));
  const tanggal = new Date(form.tanggal);
  const tipe = form.tipe;
  const jumlah = Math.abs(Number(form.jumlah) || 0);

  let debit = 0, kredit = 0;
  if (tipe === 'Pemasukan' || tipe === 'Transfer Masuk') debit = jumlah;
  else kredit = jumlah;

  sh.getRange(Number(rowIndex), 2, 1, 7).setValues([[tanggal, tipe, form.kategori, form.akun, form.deskripsi || '', debit, kredit]]);
  recalc(ledger);
  return getTransaksi(ledger);
}

function deleteTransaksi(ledger, rowIndex) {
  const sh = getSS().getSheetByName(trSheetName(ledger));
  sh.deleteRow(Number(rowIndex));
  recalc(ledger);
  return getTransaksi(ledger);
}

function recalc(ledger) {
  const sh = getSS().getSheetByName(trSheetName(ledger));
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  const rows = sh.getRange(2, 1, lastRow - 1, TRANSAKSI_HEADERS.length).getValues();
  let saldo = 0;
  rows.forEach((r, i) => {
    saldo += (Number(r[6]) || 0) - (Number(r[7]) || 0);
    r[0] = i + 1;
    r[8] = saldo;
    r[9] = getWeekKey(r[1]);
  });

  sh.getRange(2, 1, rows.length, TRANSAKSI_HEADERS.length).setValues(rows);
  applyWeekColor(ledger);
}

function getWeekKey(date) {
  if (!(date instanceof Date)) date = new Date(date);
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return tmp.getFullYear() + '-W' + String(weekNo).padStart(2, '0');
}

function applyWeekColor(ledger) {
  const sh = getSS().getSheetByName(trSheetName(ledger));
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  const weeks = sh.getRange(2, 10, lastRow - 1, 1).getValues().flat();
  let colorIdx = 0, lastWeek = null;
  const bg = weeks.map(w => {
    if (w !== lastWeek) { colorIdx = 1 - colorIdx; lastWeek = w; }
    return Array(TRANSAKSI_HEADERS.length).fill(WEEK_COLORS[colorIdx]);
  });

  sh.getRange(2, 1, lastRow - 1, TRANSAKSI_HEADERS.length).setBackgrounds(bg);
}