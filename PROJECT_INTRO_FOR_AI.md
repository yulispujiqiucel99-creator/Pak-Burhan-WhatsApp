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

Bot mendukung chat AI melalui Gemini, command `!help`, `!menu`, `!sisa`, `!status`, `!cari`, `!ceklink`, `!tempat`, `!gambar`, `!stiker`, `!hd`, sistem profil nama/gender, kuota pertanyaan, pengamanan link, penyimpanan profil ke Supabase, dan akses admin berbasis Grup Kontrol.

Bot juga memiliki peringatan grup saat waktu tidur dan bangun. Fitur jadwal kelas, scheduler pengiriman jadwal, notifikasi hari libur otomatis, dan pesan spam otomatis sudah dihapus. Bot tidak boleh mengirim pesan ke grup tanpa pemicu yang diizinkan, kecuali peringatan tidur/bangun yang memang merupakan pengecualian yang sengaja dipertahankan.

## Penyimpanan dan Supabase

Supabase digunakan untuk menyimpan profil pengguna pada table `public.profiles`. Registry `public.private_access` dan tabel legacy `jfr_roles` sudah dihapus karena tidak lagi digunakan. Session Baileys disimpan sebagai file terenkripsi di Supabase Storage bucket private `wa-auth-session`, bukan sebagai credential mentah di database.

Environment variable session backup:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WA_SESSION_ENCRYPTION_KEY=...
```

`WA_SESSION_ENCRYPTION_KEY` harus tetap sama setelah backup pertama dibuat. Jangan pernah membagikan token, service role key, API key, isi `.env`, folder `auth_info`, atau file backup session.

## Grup Kontrol dan akses chat pribadi

Sistem JFR, kode unik, intro privat, pencocokan LID privat, registry role, dan `ADMIN_PHONE` sudah dihapus total. Akses admin ditentukan hanya melalui satu environment variable:

```env
CONTROL_GROUP_JID=120363xxxxxxxx@g.us
```

Jika `msg.key.remoteJid` sama persis dengan `CONTROL_GROUP_JID` dan merupakan JID grup, pesan tersebut memperoleh akses admin otomatis. Semua member grup diperlakukan sama; bot tidak perlu memeriksa nomor atau LID pengirim. Perbandingan ini hanya berlaku untuk pesan yang sedang berada di grup kontrol dan tidak memberikan hak admin ke grup umum atau chat pribadi. Jika variable kosong atau salah, tidak ada akses admin.

Chat pribadi tetap melewati alur chat biasa dan tidak pernah dianggap sebagai chat admin. Jika chat privat tidak membalas, analisis alur dari `messages.upsert` ke `handleMessage`, cek `remoteJid`, ekstraksi teks, guard grup, onboarding, kuota, dan akhirnya `sock.sendMessage()`; jangan mencari `#JFR`, `ADMIN_PHONE`, atau registry `private_access` karena semuanya sudah dihapus.

## Cara meminta bantuan AI

Saat meminta bantuan, analisis dulu alur dari `messages.upsert` ke `handleMessage`, lalu bedakan jalur grup dan privat. Untuk izin admin, periksa `CONTROL_GROUP_JID`, nilai `msg.key.remoteJid`, fungsi `isControlGroup`, `hasAdminAccess`, dan guard command admin. Jangan langsung menyalahkan Gemini jika command lokal juga gagal. Jangan memperkenalkan kembali JFR, `ADMIN_PHONE`, private allowlist, atau table `private_access`.

Semua perubahan yang menyentuh session WhatsApp, pengiriman otomatis, izin chat pribadi, atau kredensial harus direview dengan hati-hati dan diuji sebelum deployment.
