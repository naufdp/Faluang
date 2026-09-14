/** =========================================================
 *  PENGATURAN: kategori & akun/metode custom per ledger.
 * ========================================================= */

function getPengaturan(ledger) {
  const sh = getSS().getSheetByName(pengSheetName(ledger));
  const lastRow = sh.getLastRow();
  const kategori = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(String) : [];
  const akun     = lastRow > 1 ? sh.getRange(2, 2, lastRow - 1, 1).getValues().flat().filter(String) : [];
  return { kategori: kategori, akun: akun, tipe: TIPE_LIST };
}

function addPengaturanItem(ledger, kolom, value) {
  value = String(value || '').trim();
  if (!value) return getPengaturan(ledger);

  const sh = getSS().getSheetByName(pengSheetName(ledger));
  const col = kolom === 'kategori' ? 1 : 2;
  const lastRow = sh.getLastRow();
  const existing = lastRow > 1 ? sh.getRange(2, col, lastRow - 1, 1).getValues().flat().filter(String) : [];

  if (existing.some(v => String(v).toLowerCase() === value.toLowerCase())) {
    return getPengaturan(ledger);
  }

  sh.getRange(existing.length + 2, col).setValue(value);
  applyDataValidation(ledger);
  return getPengaturan(ledger);
}

function deletePengaturanItem(ledger, kolom, value) {
  const sh = getSS().getSheetByName(pengSheetName(ledger));
  const col = kolom === 'kategori' ? 1 : 2;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return getPengaturan(ledger);

  const values = sh.getRange(2, col, lastRow - 1, 1).getValues().flat();
  const remaining = values.filter(v => v && v !== value);

  sh.getRange(2, col, lastRow - 1, 1).clearContent();
  remaining.forEach((v, i) => sh.getRange(i + 2, col).setValue(v));

  applyDataValidation(ledger);
  return getPengaturan(ledger);
}

function applyDataValidation(ledger) {
  const trSheet = getSS().getSheetByName(trSheetName(ledger));
  const pengSheet = getSS().getSheetByName(pengSheetName(ledger));
  const lastRow = Math.max(pengSheet.getLastRow(), 2);

  const kategoriRange = pengSheet.getRange(2, 1, lastRow - 1, 1);
  const akunRange = pengSheet.getRange(2, 2, lastRow - 1, 1);

  const kategoriRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(kategoriRange, true).setAllowInvalid(false).build();
  const akunRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(akunRange, true).setAllowInvalid(false).build();
  const tipeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TIPE_LIST, true).setAllowInvalid(false).build();

  trSheet.getRange(2, 3, MAX_VALIDATION_ROWS, 1).setDataValidation(tipeRule);
  trSheet.getRange(2, 4, MAX_VALIDATION_ROWS, 1).setDataValidation(kategoriRule);
  trSheet.getRange(2, 5, MAX_VALIDATION_ROWS, 1).setDataValidation(akunRule);
}
