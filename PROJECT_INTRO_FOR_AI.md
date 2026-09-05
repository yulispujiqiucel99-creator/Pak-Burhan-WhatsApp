# Pengenalan Project Pak Burhan WhatsApp Bot

Saya sedang mengembangkan bot WhatsApp bernama **Pak Burhan** menggunakan Node.js dan Baileys 6.7.x. Bot ini berjalan sebagai service WhatsApp berbasis event dan menggunakan `messages.upsert` untuk menerima pesan, kemudian membalas melalui `sock.sendMessage()`.

## Runtime dan deployment

Project menargetkan Node.js minimal versi 20 dan dijalankan dengan:

```bash
npm install
npm start
```

Entry point utama adalah `index.js`. Bot dapat dijalankan lokal di Windows atau dideploy ke layanan seperti Northflank. Jangan menggunakan lebih dari satu replica untuk satu akun WhatsApp karena satu session tidak boleh dipakai bersamaan oleh beberapa instance.

## Fitur utama

Bot mendukung chat AI melalui Gemini, command `!help`, `!menu`, `!sisa`, `!status`, `!cari`, `!ceklink`, `!tempat`, `!gambar`, `!stiker`, `!hd`, serta sistem profil nama/gender, kuota pertanyaan, role JFR, pengamanan link, dan penyimpanan profil ke Supabase.

Bot juga memiliki peringatan grup saat waktu tidur dan bangun. Fitur jadwal kelas, scheduler pengiriman jadwal, notifikasi hari libur otomatis, dan pesan spam otomatis sudah dihapus. Bot tidak boleh mengirim pesan ke grup tanpa pemicu yang diizinkan, kecuali peringatan tidur/bangun yang memang merupakan pengecualian yang sengaja dipertahankan.

## Penyimpanan dan Supabase

Supabase digunakan untuk menyimpan profil pengguna pada table `public.profiles` dan role JFR pada table `public.jfr_roles`. Session Baileys disimpan sebagai file terenkripsi di Supabase Storage bucket private `wa-auth-session`, bukan sebagai credential mentah di database.

Environment variable session backup:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WA_SESSION_ENCRYPTION_KEY=...
```

`WA_SESSION_ENCRYPTION_KEY` harus tetap sama setelah backup pertama dibuat. Jangan pernah membagikan token, service role key, API key, isi `.env`, folder `auth_info`, atau file backup session.

## Akses chat pribadi

Chat pribadi dibatasi oleh `PRIVATE_ALLOWED_LID`. Nilainya harus berisi LID pengguna yang diizinkan. Code memuat `.env` dari folder yang sama dengan `index.js`, menormalisasi angka LID, dan hanya mengizinkan LID yang cocok. Chat grup memiliki jalur guard yang berbeda dan memerlukan mention bot jika fitur tersebut berlaku.

Contoh konfigurasi:

```env
PRIVATE_ALLOWED_LID=angka_LID_pengguna
```

Jika chat pribadi tidak dibalas tetapi grup berjalan, periksa urutan berikut: pastikan `.env` berada di samping `index.js`, pastikan nama file bukan `.env.txt`, pastikan LID benar, lalu restart penuh proses Node.js. Jangan mengirim secret ke chat.

## Cara meminta bantuan AI

Saat meminta bantuan, analisis dulu alur pesan dari `messages.upsert` ke `handleMessage`, lalu ke guard `PRIVATE_ALLOWED_LID`, command handler, dan akhirnya `sock.sendMessage()`. Jangan langsung menyalahkan Gemini jika command lokal seperti `!help` juga gagal. Periksa return awal, nilai LID yang sudah dinormalisasi, lokasi `.env`, versi commit, dan error yang tertangkap oleh `try/catch`.

Semua perubahan yang menyentuh session WhatsApp, pengiriman otomatis, izin chat pribadi, atau kredensial harus direview dengan hati-hati dan diuji sebelum deployment.
