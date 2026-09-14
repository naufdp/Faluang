/** =========================================================
 *  TANYA AI: menjawab pertanyaan bebas soal keuangan user,
 *  berdasarkan data ringkasan bulan berjalan + arus kas.
 *  API key Gemini disimpan per akun Google (UserProperties),
 *  BUKAN milik/dibayar oleh pembuat aplikasi ini.
 * ========================================================= */

function saveGeminiKey(key) {
  key = String(key || '').trim();
  PropertiesService.getUserProperties().setProperty('GEMINI_API_KEY', key);
  return { ok: true, isSet: !!key };
}

function getAiStatus() {
  const key = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  return { isSet: !!key };
}

function askAI(ledger, question, history) {
  const apiKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { ok: false, error: 'API Key Gemini belum diatur. Buka tab Pengaturan untuk memasangnya.' };
  }

  const now = new Date();
  const params = { bulan: now.getMonth() + 1, tahun: now.getFullYear() };
  const allTransaksi = getTransaksi(ledger);

  const context = {
    ringkasanBulanIni: getDashboard(ledger, 'bulanan', params),
    arusKasPerAkunBulanIni: getArusKas(ledger, 'bulanan', params),
    transaksiTerakhir: allTransaksi.slice(-20) // 20 transaksi paling baru, biar AI bisa jawab hal spesifik juga
  };

  const systemPrompt =
    'Kamu adalah asisten keuangan pribadi yang santai dan asik diajak ngobrol, seperti teman ' +
    'dekat—bukan customer service yang kaku. Boleh pakai bahasa sehari-hari, sedikit kasual, ' +
    'emoji secukupnya kalau pas, dan nggak perlu selalu format jawaban seperti laporan. Kamu boleh ' +
    'basa-basi, kasih opini ringan, atau bercanda dikit selama tetap membantu. SELALU balas dalam ' +
    'bahasa yang sama dengan bahasa pertanyaan terakhir dari user (kalau user nanya pakai Bahasa ' +
    'Inggris, jawab dalam Bahasa Inggris; kalau pakai Bahasa Indonesia, jawab Bahasa Indonesia; ' +
    'begitu juga bahasa lain)—jangan terpaku ke satu bahasa saja. Gunakan data keuangan user ' +
    'berikut ini sebagai konteks (jangan tampilkan mentah-mentah sebagai JSON ke user, olah jadi ' +
    'jawaban natural): ' + JSON.stringify(context) +
    '. Kalau user nanya sesuatu yang datanya nggak ada di sini, bilang aja jujur kalau kamu belum ' +
    'punya datanya, sambil tetap ramah—jangan kaku nolak.';

  const contents = [];
  (history || []).forEach(m => {
    contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] });
  });
  contents.push({ role: 'user', parts: [{ text: question }] });

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey;
  const options = {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents
    }),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(res.getContentText());

    if (json.error) return { ok: false, error: json.error.message };
    const answer = json.candidates && json.candidates[0] && json.candidates[0].content
      ? json.candidates[0].content.parts[0].text
      : null;

    if (!answer) return { ok: false, error: 'AI tidak memberikan jawaban. Coba pertanyaan lain.' };
    return { ok: true, answer: answer };
  } catch (e) {
    return { ok: false, error: 'Gagal menghubungi Gemini API: ' + e.message };
  }
}
