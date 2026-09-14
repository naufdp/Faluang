/** =========================================================
 *  FALUANG v2 - Backend (Google Apps Script)
 *  Aplikasi keuangan generik: setiap orang deploy salinan
 *  sendiri, menghubungkan ke spreadsheet miliknya sendiri,
 *  membuat akun/ledger, user, dan API key AI miliknya sendiri.
 * ========================================================= */

const TRANSAKSI_HEADERS = ['No','Tanggal','Tipe','Kategori','Akun/Metode','Deskripsi','Debit','Kredit','Saldo Akhir','Minggu'];
const TIPE_LIST = ['Pemasukan','Pengeluaran','Transfer Masuk','Transfer Keluar'];
const DEFAULT_KATEGORI = ['Umum'];
const DEFAULT_AKUN = ['Cash'];
const WEEK_COLORS = ['#FFFFFF', '#EAF3FF'];
const MAX_VALIDATION_ROWS = 2000;

const LEDGER_SHEET = '_Ledgers';
const USER_SHEET = '_Users';

/** ---------- WEB APP ENTRY ---------- **/
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Faluang')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** ---------- KONEKSI SPREADSHEET (terpisah otomatis per akun Google) ---------- **/
function getSS() {
  const id = PropertiesService.getUserProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Spreadsheet belum dikonfigurasi.');
  return SpreadsheetApp.openById(id);
}

function trSheetName(ledger) { return ledger + '__Transaksi'; }
function pengSheetName(ledger) { return ledger + '__Pengaturan'; }

/** Email akun Google yang sedang mengakses (dipakai untuk tampilan, bukan untuk kontrol akses) */
function getMe() {
  try {
    return { email: Session.getActiveUser().getEmail() || '(email tersembunyi)' };
  } catch (e) {
    return { email: '(tidak diketahui)' };
  }
}

/** Dicek pertama kali web app dibuka: akun Google ini sudah pernah setup spreadsheet belum? */
function getAppStatus() {
  const id = PropertiesService.getUserProperties().getProperty('SPREADSHEET_ID');
  if (!id) return { configured: false };
  try {
    const ss = SpreadsheetApp.openById(id);
    return { configured: true, spreadsheetName: ss.getName() };
  } catch (e) {
    return { configured: false, error: 'Spreadsheet sebelumnya tidak bisa diakses lagi (mungkin akses dicabut).' };
  }
}

/** Dipanggil dari layar Setup: user tempel URL atau ID spreadsheet miliknya/yang di-share ke dia */
function saveSpreadsheetId(input) {
  const id = extractSpreadsheetId(input);
  if (!id) return { ok: false, error: 'Format URL/ID spreadsheet tidak dikenali.' };

  let ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (e) {
    return { ok: false, error: 'Spreadsheet tidak ditemukan, atau akun Google kamu belum diberi akses ke spreadsheet itu. Minta pemilik spreadsheet untuk Share ke emailmu dulu.' };
  }

  PropertiesService.getUserProperties().setProperty('SPREADSHEET_ID', id);
  bootstrapSpreadsheet();
  return { ok: true, spreadsheetName: ss.getName() };
}

function extractSpreadsheetId(input) {
  input = String(input || '').trim();
  const match = input.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

/** Membuat struktur dasar (_Ledgers, _Users, ledger default) kalau belum ada */
function bootstrapSpreadsheet() {
  const ss = getSS();

  let ledgerSheet = ss.getSheetByName(LEDGER_SHEET);
  if (!ledgerSheet) {
    ledgerSheet = ss.insertSheet(LEDGER_SHEET);
    ledgerSheet.getRange(1, 1, 1, 1).setValues([['NamaLedger']]).setFontWeight('bold');
  }

  let userSheet = ss.getSheetByName(USER_SHEET);
  if (!userSheet) {
    userSheet = ss.insertSheet(USER_SHEET);
    userSheet.getRange(1, 1, 1, 4).setValues([['Nama', 'PIN', 'Akses', 'Role']]).setFontWeight('bold');
    userSheet.appendRow(['Admin', '1234', 'ALL', 'admin']);
  }

  // Kalau belum ada ledger sama sekali, buatkan satu default
  const lastRow = ledgerSheet.getLastRow();
  if (lastRow < 2) {
    createLedgerSheets_('Utama');
    ledgerSheet.appendRow(['Utama']);
  }

  // Sembunyikan sheet konfigurasi supaya tidak mengganggu tampilan spreadsheet
  ledgerSheet.hideSheet();
  userSheet.hideSheet();
}

/** ---------- LOGIN ---------- **/
function login(pin) {
  const ss = getSS();
  const sh = ss.getSheetByName(USER_SHEET);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false };

  const data = sh.getRange(2, 1, lastRow - 1, 4).getValues();
  for (let i = 0; i < data.length; i++) {
    const [nama, userPin, akses, role] = data[i];
    if (String(userPin) === String(pin)) {
      const allLedgers = getLedgers();
      const aksesList = String(akses).trim().toUpperCase() === 'ALL'
        ? allLedgers
        : String(akses).split(',').map(s => s.trim()).filter(Boolean);
      return { ok: true, rowIndex: i + 2, nama, role, akses: aksesList };
    }
  }
  return { ok: false };
}

function changeMyPin(rowIndex, oldPin, newPin) {
  newPin = String(newPin || '').trim();
  if (!newPin) return { ok: false, error: 'PIN baru tidak boleh kosong.' };

  const sh = getSS().getSheetByName(USER_SHEET);
  const currentPin = String(sh.getRange(rowIndex, 2).getValue());
  if (currentPin !== String(oldPin)) return { ok: false, error: 'PIN lama salah.' };

  sh.getRange(rowIndex, 2).setValue(newPin);
  return { ok: true };
}
