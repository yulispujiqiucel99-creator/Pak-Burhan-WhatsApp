# Pak Burhan WhatsApp Bot

Bot WhatsApp persona **Pak Burhan** sebagai wali kelas 7D. Proyek ini menggunakan **Node.js, Baileys, Google Gemini API, dan Tavily opsional**.

## Fitur

Bot mendukung login melalui **QR Code** atau **Pairing Code**, percakapan AI dengan gaya Pak Burhan, memori percakapan, moderasi kata kasar, perintah `!help`, `!menu`, dan `!cari`, serta pencarian internet opsional melalui Tavily. Pada grup, bot hanya menjawab saat ditandai atau disebut “Pak Burhan”; pada chat pribadi, bot membalas semua pesan. Konfigurasi proyek dirancang untuk deployment Railway dengan volume persisten.

## Setup Lokal

```bash
npm install
cp .env.example .env
npm start
```

Isi `GEMINI_API_KEY` pada `.env` sebelum menjalankan bot. API key dibuat dari [Google AI Studio](https://aistudio.google.com/apikey); jangan pernah menyimpan key asli ke repository.

## Variabel Lingkungan

| Key | Keterangan |
|---|---|
| `AUTH_METHOD` | `qr` sebagai default, atau `pairing`. |
| `BOT_NUMBER` | Wajib untuk metode `pairing`; gunakan format `628...`. |
| `GEMINI_API_KEY` | API key Google Gemini dari Google AI Studio. Wajib untuk chat AI. |
| `GEMINI_MODEL` | Default `gemini-2.5-flash`. Ubah hanya ke endpoint Gemini yang tersedia untuk akun Anda. |
| `TAVILY_API_KEY` | Opsional; dipakai untuk fitur pencarian internet. |
| `PREFIX` | Awalan perintah bot; default `!`. |

## Deployment Railway

Hubungkan repository ini ke Railway, lalu isi seluruh variabel lingkungan yang diperlukan. Tambahkan **Volume** dengan titik mount `/app` agar folder `auth_info` dan `data` tetap tersimpan setelah deployment atau restart. Jalankan bot dengan perintah `node index.js`, atau gunakan Procfile worker yang tersedia.

Setelah deployment, buka menu **Logs** Railway. Jika `AUTH_METHOD=qr`, log akan menampilkan tautan QR. Buka tautan tersebut, lalu pindai QR melalui WhatsApp pada menu **Perangkat Tertaut**. Jika menggunakan pairing, atur `BOT_NUMBER` dan masukkan kode pairing yang muncul di log.

## Login Ulang

Untuk menghubungkan nomor WhatsApp yang berbeda, hapus folder `auth_info` pada volume Railway atau lakukan *wipe* volume, lalu deploy atau restart ulang bot.

## Penanganan Error Gemini

Bot menampilkan pesan yang lebih jelas jika Gemini membalas kode **429** karena batas penggunaan, atau kode **401/403** karena `GEMINI_API_KEY` tidak valid. Detail kesalahan API dicatat pada log Railway agar konfigurasi dapat diperiksa tanpa membocorkan API key ke chat.
