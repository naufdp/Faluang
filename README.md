# Faluang — Personal Finance

Mendukung **banyak orang yang tidak saling terhubung**, memakai
**satu link aplikasi yang sama**, dengan data yang terpisah otomatis per akun
Google. Tidak ada PIN lagi di lapisan paling luar — login memakai akun Google
asli, lalu setiap akun Google dihubungkan ke spreadsheet miliknya sendiri.

## Arsitektur multi-tenant

- Web app di-deploy dengan **Execute as: User accessing the web app** — jadi
  setiap orang yang membuka link menjalankan kode dengan **identitas Google
  mereka sendiri**, bukan identitas pembuat aplikasi.
- Konfigurasi (Spreadsheet ID, API key Gemini) disimpan di **User
  Properties**, yang otomatis terisolasi per akun Google — akun A tidak
  akan pernah melihat konfigurasi/data akun B.
- **Berbagi akses ke keluarga/tim**: gunakan fitur **Share** bawaan Google
  Sheets. Kalau kamu (pemilik spreadsheet) ingin orang lain (misalnya orang
  tua) ikut memakai data yang sama:
  1. Buka spreadsheet kamu → Share → masukkan email Google orang tersebut
     (minimal akses **Viewer**, atau **Editor** kalau ingin mereka bisa
     input transaksi juga).
  2. Orang itu membuka link aplikasi yang sama, login pakai akun Google
     mereka sendiri, lalu di layar Setup menempelkan **URL spreadsheet yang
     sama** yang kamu bagikan.
  3. Setelah itu, sistem PIN + role (admin/viewer) + akses per ledger yang
     ada di dalam aplikasi (bukan di level Google) yang menentukan apa yang
     boleh mereka lakukan di dalam spreadsheet itu.

## Cara Setup

1. Buat **spreadsheet Google Sheets baru** (kosong).
2. Di **script.google.com**, buat **New project** (standalone, tidak lewat
   Extensions dari dalam spreadsheet).
3. Salin semua file di folder ini ke project tersebut. Aktifkan tampilan
   manifest lewat Project Settings ⚙️, lalu timpa `appsscript.json`.
4. **Deploy → New deployment → Web app**:
   - **Execute as: `User accessing the web app`**
   - **Who has access: `Anyone`** (pengunjung tetap wajib login akun Google
     saat diminta — ini normal untuk mode eksekusi ini)
5. Buka URL yang dihasilkan. Kamu akan diminta login Google (kalau belum),
   lalu **muncul peringatan "Google hasn't verified this app"** — ini wajar
   karena appnya belum melalui proses verifikasi resmi Google. Klik
   **Advanced → Go to project (unsafe) → Allow**. Setiap pengguna BARU akan
   melihat peringatan ini sekali di percobaan pertama mereka.
6. Muncul layar Setup — tempel URL spreadsheet dari langkah 1.
7. Sistem otomatis membuat struktur dasar: 1 ledger "Utama", 1 user admin
   dengan **PIN default `1234`** — ganti PIN ini di tab Pengaturan setelah
   login.
8. Untuk mengundang orang lain memakai data yang sama, ikuti langkah
   "Berbagi akses" di atas.

## Model keamanan & privasi

- Data (spreadsheet, PIN internal, API key AI) terisolasi otomatis per akun
  Google oleh Google sendiri (User Properties) — tidak ada database pusat
  yang menyimpan siapa memakai apa.
- Berbagi data ke orang lain sepenuhnya memakai mekanisme **Share** Google
  Sheets yang sudah teruji, bukan sistem custom buatan aplikasi ini.
- API key Gemini disimpan di User Properties milik akun Google
  masing-masing, tidak pernah terlihat oleh pengguna lain maupun oleh
  pembuat aplikasi ini.

## Lisensi

MIT License.
