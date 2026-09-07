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

Bot mendukung chat AI melalui Gemini, command `!help`, `!menu`, `!sisa`, `!status`, `!cari`, `!ceklink`, `!tempat`, `!gambar`, `!stiker`, `!hd`, serta sistem profil nama/gender, kuota pertanyaan, private access `admin`/`jfr`, pengamanan link, dan penyimpanan profil ke Supabase.

Bot juga memiliki peringatan grup saat waktu tidur dan bangun. Fitur jadwal kelas, scheduler pengiriman jadwal, notifikasi hari libur otomatis, dan pesan spam otomatis sudah dihapus. Bot tidak boleh mengirim pesan ke grup tanpa pemicu yang diizinkan, kecuali peringatan tidur/bangun yang memang merupakan pengecualian yang sengaja dipertahankan.

## Penyimpanan dan Supabase

Supabase digunakan untuk menyimpan profil pengguna pada table `public.profiles` dan registry akses privat pada table `public.private_access`. Registry menyimpan role `guest`, `jfr`, atau `admin`, waktu intro privat satu kali, dan waktu pemberian akses. Session Baileys disimpan sebagai file terenkripsi di Supabase Storage bucket private `wa-auth-session`, bukan sebagai credential mentah di database.

Environment variable session backup:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WA_SESSION_ENCRYPTION_KEY=...
```

`WA_SESSION_ENCRYPTION_KEY` harus tetap sama setelah backup pertama dibuat. Jangan pernah membagikan token, service role key, API key, isi `.env`, folder `auth_info`, atau file backup session.

## Akses chat pribadi

Chat grup tidak memakai pencocokan LID untuk menentukan private access. Di chat pribadi, bot membaca LID pengirim dan registry `private_access`. Jika LID belum dikenal, bot mengirim intro otomatis satu kali seumur hidup per LID. Pengguna lalu mengetik `#JFR`; bot membuat kode unik dan mengirimkannya ke `ADMIN_PHONE`. Setelah kode benar dimasukkan di chat yang sama, role `jfr` disimpan permanen. Nomor yang cocok dengan `ADMIN_PHONE` didaftarkan sebagai role `admin` ketika mengirim pesan privat.

Contoh konfigurasi baru:
```env
ADMIN_PHONE=628895683942
PRIVATE_INTRO_TEXT=
```

Tidak ada lagi sistem allowlist privat lama, command mulai, atau command administratif role. Pesan pertama pengguna privat tidak menunggu command mulai: intro dikirim otomatis. Jika chat privat tidak membalas, periksa `ADMIN_PHONE`, `.env` di samping `index.js`, status migration `private_access`, dan log error `sendMessage()`.

## Cara meminta bantuan AI

Saat meminta bantuan, analisis dulu alur dari `messages.upsert` ke `handleMessage`, lalu bedakan jalur grup dan privat. Untuk privat, periksa `getSenderLid`, registry `private_access`, status intro satu kali, pemrosesan `#JFR`, pending verification, dan akhirnya `sock.sendMessage()`. Jangan langsung menyalahkan Gemini jika command lokal juga gagal. Jangan memperkenalkan kembali sistem allowlist privat lama; sistem baru memakai `ADMIN_PHONE` dan table `private_access`.

Semua perubahan yang menyentuh session WhatsApp, pengiriman otomatis, izin chat pribadi, atau kredensial harus direview dengan hati-hati dan diuji sebelum deployment.
