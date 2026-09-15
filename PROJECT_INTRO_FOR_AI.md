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

Bot mendukung chat AI melalui Gemini, command `!help`, `!menu`, `!sisa`, `!status`, `!cari`, `!ceklink`, `!tempat`, `!gambar`, `!stiker`, `!hd`, serta sistem profil nama/gender, kuota pertanyaan, pengamanan link, dan penyimpanan profil ke Supabase.

Bot juga memiliki peringatan grup saat waktu tidur dan bangun. Fitur jadwal kelas, scheduler pengiriman jadwal, notifikasi hari libur otomatis, dan pesan spam otomatis sudah dihapus. Bot tidak boleh mengirim pesan ke grup tanpa pemicu yang diizinkan, kecuali peringatan tidur/bangun yang memang merupakan pengecualian yang sengaja dipertahankan.

## Penyimpanan dan Supabase

Supabase digunakan untuk menyimpan profil pengguna pada table `public.profiles`. Session Baileys disimpan sebagai file terenkripsi di Supabase Storage bucket private `wa-auth-session`, bukan sebagai credential mentah di database.

Environment variable session backup:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WA_SESSION_ENCRYPTION_KEY=...
```

`WA_SESSION_ENCRYPTION_KEY` harus tetap sama setelah backup pertama dibuat. Jangan pernah membagikan token, service role key, API key, isi `.env`, folder `auth_info`, atau file backup session.

## Sistem Admin (Grup Kontrol)

Fitur JFR dan ADMIN_PHONE sudah dihapus.

Sekarang admin dikontrol melalui satu grup khusus:

```env
ADMIN_GROUP_JID=120363362622061388@g.us
```

Siapa pun yang mengirim pesan di grup tersebut otomatis dianggap admin (fitur admin terbuka, termasuk `!status` dan kuota unlimited). Grup ini hanya berisi pemilik, bot, dan tester.

Chat pribadi (DM) sekarang terbuka untuk semua orang dengan sistem kuota harian biasa. Tidak ada lagi verifikasi kode atau intro #JFR.

## Cara meminta bantuan AI

Saat meminta bantuan, analisis dulu alur dari `messages.upsert` ke `handleMessage`, lalu bedakan jalur grup dan privat. Periksa apakah pesan berasal dari `ADMIN_GROUP_JID` untuk menentukan status admin. Jangan memperkenalkan kembali sistem JFR atau ADMIN_PHONE.

Semua perubahan yang menyentuh session WhatsApp, pengiriman otomatis, atau kredensial harus direview dengan hati-hati dan diuji sebelum deployment.
