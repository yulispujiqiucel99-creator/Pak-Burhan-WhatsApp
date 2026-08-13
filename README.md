# Pak Burhan WhatsApp Bot

Bot WhatsApp persona **Pak Burhan** sebagai wali kelas 7D. Proyek ini menggunakan **Node.js, Baileys, Groq API, dan Tavily opsional**.

## Fitur

Bot mendukung login melalui **QR Code** atau **Pairing Code**, percakapan AI dengan gaya Pak Burhan, memori percakapan, moderasi kata kasar, perintah `!help`, `!menu`, dan `!cari`, serta pencarian internet opsional melalui Tavily. Pada grup, bot hanya menjawab saat akun bot benar-benar di-mention dengan format **`@bot pertanyaan`**; pada chat pribadi, bot membalas semua pesan. Konfigurasi proyek dirancang untuk deployment Railway dengan volume persisten.

## Setup Lokal

```bash
npm install
cp .env.example .env
npm start
```

Isi `GROQ_API_KEY` pada `.env` sebelum menjalankan bot. API key dibuat dari [Groq Console](https://console.groq.com/keys); jangan pernah menyimpan key asli ke repository.

## Variabel Lingkungan

| Key | Keterangan |
|---|---|
| `AUTH_METHOD` | `qr` sebagai default, atau `pairing`. |
| `BOT_NUMBER` | Wajib untuk metode `pairing`; gunakan format `628...`. |
| `GROQ_API_KEY` | API key Groq dari Groq Console. Wajib untuk chat AI. |
| `GROQ_MODEL` | Default `llama-3.1-8b-instant`; ganti hanya ke model Groq yang tersedia untuk akun Anda. |
| `GROQ_BASE_URL` | Default `https://api.groq.com/openai/v1`; biasanya tidak perlu diubah. |
| `PRIVATE_ALLOWED_NUMBER` | Satu-satunya nomor yang dapat mengirim chat pribadi ke bot; gunakan format `628...` tanpa `+` atau spasi. Jika kosong, seluruh chat pribadi diabaikan. |
| `BOT_TIMEZONE` | Zona waktu untuk konteks AI; default `Asia/Jakarta` (WIB). |
| `TAVILY_API_KEY` | Opsional; dipakai untuk fitur pencarian internet. |
| `PREFIX` | Awalan perintah bot; default `!`. |

## Deployment Railway

Hubungkan repository ini ke Railway, lalu isi seluruh variabel lingkungan yang diperlukan. Untuk membatasi akses privat, isi `PRIVATE_ALLOWED_NUMBER` dengan nomor yang diizinkan dalam format `628...`; nomor privat lain akan diabaikan tanpa balasan. Tambahkan **Volume** dengan titik mount `/app` agar folder `auth_info` dan `data` tetap tersimpan setelah deployment atau restart. Jalankan bot dengan perintah `node index.js`, atau gunakan Procfile worker yang tersedia.

Setelah deployment, buka menu **Logs** Railway. Jika `AUTH_METHOD=qr`, log akan menampilkan tautan QR. Buka tautan tersebut, lalu pindai QR melalui WhatsApp pada menu **Perangkat Tertaut**. Jika menggunakan pairing, atur `BOT_NUMBER` dan masukkan kode pairing yang muncul di log. Di grup, gunakan format seperti **`@Pak Burhan jadwal ulangan kapan?`**; mention tanpa pertanyaan akan dibalas dengan contoh format yang benar.

## Login Ulang

Untuk menghubungkan nomor WhatsApp yang berbeda, hapus folder `auth_info` pada volume Railway atau lakukan *wipe* volume, lalu deploy atau restart ulang bot.

## Penanganan Error Groq

Bot memakai **Groq Chat Completions API**, menyimpan maksimal **4 putaran** percakapan sebagai konteks agar penggunaan token lebih terkendali, dan menyertakan tanggal serta jam terkini sesuai `BOT_TIMEZONE` pada setiap permintaan AI. Bot menampilkan pesan yang lebih jelas jika Groq membalas kode **404** karena model tidak tersedia, kode **429** karena batas penggunaan, atau kode **401/403** karena `GROQ_API_KEY` tidak valid. Detail kesalahan API dicatat pada log Railway agar konfigurasi dapat diperiksa tanpa membocorkan API key ke chat.
