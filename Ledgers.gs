/** =========================================================
 *  LEDGERS & USERS: pengganti konsep "Anak"/"Ortu" yang fix.
 *  Sekarang ledger (akun pembukuan) dan user (dengan PIN &
 *  akses masing-masing) sepenuhnya dikelola sendiri oleh user.
 * ========================================================= */

function getLedgers() {
  const sh = getSS().getSheetByName(LEDGER_SHEET);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  return sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(String);
}

function addLedger(name) {
  name = String(name || '').trim();
  if (!name) return { ok: false, error: 'Nama ledger tidak boleh kosong.' };
  if (/__/.test(name)) return { ok: false, error: 'Nama ledger tidak boleh mengandung garis bawah ganda (__).' };

  const existing = getLedgers();
  if (existing.some(l => l.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: 'Ledger dengan nama itu sudah ada.' };
  }

  createLedgerSheets_(name);
  getSS().getSheetByName(LEDGER_SHEET).appendRow([name]);
  return { ok: true, ledgers: getLedgers() };
}

function deleteLedger(name) {
  const ss = getSS();
  const trSheet = ss.getSheetByName(trSheetName(name));
  const pengSheet = ss.getSheetByName(pengSheetName(name));
  if (trSheet) ss.deleteSheet(trSheet);
  if (pengSheet) ss.deleteSheet(pengSheet);

  const sh = ss.getSheetByName(LEDGER_SHEET);
  const lastRow = sh.getLastRow();
  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const remaining = values.filter(v => v && v !== name);
  sh.getRange(2, 1, lastRow - 1, 1).clearContent();
  remaining.forEach((v, i) => sh.getRange(i + 2, 1).setValue(v));

  return { ok: true, ledgers: getLedgers() };
}

/** Helper internal: bikin sepasang sheet Transaksi + Pengaturan untuk 1 ledger baru */
function createLedgerSheets_(name) {
  const ss = getSS();

  const trSheet = ss.insertSheet(trSheetName(name));
  trSheet.getRange(1, 1, 1, TRANSAKSI_HEADERS.length)
    .setValues([TRANSAKSI_HEADERS]).setFontWeight('bold')
    .setBackground('#0F9D58').setFontColor('#FFFFFF');
  trSheet.setFrozenRows(1);

  const pengSheet = ss.insertSheet(pengSheetName(name));
  pengSheet.getRange(1, 1, 1, 2).setValues([['Kategori', 'Akun/Metode']]).setFontWeight('bold');
  DEFAULT_KATEGORI.forEach((k, i) => pengSheet.getRange(i + 2, 1).setValue(k));
  DEFAULT_AKUN.forEach((a, i) => pengSheet.getRange(i + 2, 2).setValue(a));

  applyDataValidation(name);
}

/** ---------- USER MANAGEMENT (khusus role admin) ---------- **/
function getUsers() {
  const sh = getSS().getSheetByName(USER_SHEET);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const data = sh.getRange(2, 1, lastRow - 1, 4).getValues();
  return data.map((r, i) => ({ rowIndex: i + 2, nama: r[0], akses: r[2], role: r[3] })); // PIN sengaja tidak dikirim ke client
}

function addUser(form) {
  const sh = getSS().getSheetByName(USER_SHEET);
  const nama = String(form.nama || '').trim();
  const pin = String(form.pin || '').trim();
  if (!nama || !pin) return { ok: false, error: 'Nama dan PIN wajib diisi.' };

  sh.appendRow([nama, pin, form.akses || 'ALL', form.role || 'viewer']);
  return { ok: true, users: getUsers() };
}

function updateUser(rowIndex, form) {
  const sh = getSS().getSheetByName(USER_SHEET);
  const current = sh.getRange(rowIndex, 1, 1, 4).getValues()[0];
  const nama = form.nama || current[0];
  const pin = form.pin ? String(form.pin).trim() : current[1];
  const akses = form.akses || current[2];
  const role = form.role || current[3];
  sh.getRange(rowIndex, 1, 1, 4).setValues([[nama, pin, akses, role]]);
  return { ok: true, users: getUsers() };
}

function deleteUser(rowIndex) {
  const sh = getSS().getSheetByName(USER_SHEET);
  if (sh.getLastRow() <= 2) return { ok: false, error: 'Minimal harus ada 1 user tersisa.' };
  sh.deleteRow(Number(rowIndex));
  return { ok: true, users: getUsers() };
}
