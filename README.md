# Pak Burhan WhatsApp Bot

Bot WhatsApp persona **Pak Burhan** sebagai wali kelas 7D. Proyek ini menggunakan **Node.js, Baileys, Groq API**, serta Tavily dan Geoapify sebagai integrasi opsional.

## Fitur

Bot mendukung login melalui **QR Code** atau **Pairing Code**, percakapan AI dengan gaya Pak Burhan, memori percakapan, moderasi kata kasar, perintah `!help`, `!menu`, `!cari`, `!tempat`, `!gambar`, dan `!jadwal`. Perintah `!tempat` memakai Geoapify untuk mencari lokasi publik lalu mengirimkan satu **pesan lokasi WhatsApp yang dapat diketuk** untuk membuka peta. Pada grup, bot hanya menjawab saat akun bot benar-benar di-mention dengan format **`@bot pertanyaan`**; pada chat pribadi, bot hanya membalas LID yang diizinkan. Konfigurasi proyek dirancang untuk deployment Railway dengan volume persisten.

Untuk menghemat limit AI, satu pengguna atau percakapan grup memiliki **cooldown 20 detik** setelah mengirim pesan yang diproses. Basa-basi sederhana seperti sapaan, pesan tes, ucapan terima kasih, dan tawa singkat tidak diteruskan ke Groq; bot mengirim respons hemat-limit dengan panggilan Mas atau Mbak sesuai profil.

Setiap LID memiliki paling banyak **20 pertanyaan dalam jendela 24 jam**. Yang dihitung adalah permintaan yang benar-benar akan diproses, termasuk pencarian tempat dan pencarian internet; onboarding, `!help`, `!sisa`, `!status`, respons waktu, moderasi, serta basa-basi tidak menghabiskan kuota. Saat kuota penuh, bot mengirimkan pesan tunggu 24 jam. Kuota tersimpan di volume Railway sehingga tidak hilang saat bot restart.

Bot beristirahat di seluruh grup setiap hari pada **21.30–04.00 WIB**. Tepat pukul 21.30, bot mengirim pesan penutup satu kali ke tiap grup lalu tidak merespons pesan grup—termasuk dari admin grup—sampai pukul 04.00. Chat DM dari LID admin tetap tersedia 24 jam, tetapi tetap mengikuti batas 20 pertanyaan per 24 jam.

## Setup Lokal

```bash
npm install
cp .env.example .env
npm start
```

Isi `GROQ_API_KEYS` pada `.env` sebelum menjalankan bot. API key dibuat dari [Groq Console](https://console.groq.com/keys); jangan pernah menyimpan key asli ke repository.

## Variabel Lingkungan

| Key | Keterangan |
|---|---|
| `AUTH_METHOD` | `qr` sebagai default, atau `pairing`. |
| `BOT_NUMBER` | Wajib untuk metode `pairing`; gunakan format `628...`. |
| `GROQ_API_KEYS` | Satu atau beberapa API key Groq, dipisahkan koma. Saat error 429, bot mencoba key berikutnya secara otomatis. |
| `GROQ_API_KEY` | Kompatibilitas untuk konfigurasi lama dengan satu key; lebih disarankan memakai `GROQ_API_KEYS`. |
| `GROQ_MODEL` | Fallback model `llama-3.1-8b-instant`; setelah Supabase aktif, model diedit pada kolom `settings`. |
| `GROQ_BASE_URL` | Default `https://api.groq.com/openai/v1`; biasanya tidak perlu diubah. |
| `SUPABASE_URL` | URL proyek Supabase yang menyimpan pengaturan bot. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key Supabase untuk bot di Railway; rahasia dan tidak boleh dibagikan. |
| `PRIVATE_ALLOWED_LID` | Fallback LID privat jika Supabase belum aktif; setelah aktif, edit `private_allowed_lid` di Supabase. |
| `BOT_TIMEZONE` | Fallback zona waktu; setelah Supabase aktif, edit `timezone` di Supabase. |
| `TAVILY_API_KEY` | Opsional; dipakai untuk fitur pencarian internet. |
| `GEOAPIFY_API_KEY` | Opsional; dipakai oleh `!tempat`. Buat key gratis di [Geoapify MyProjects](https://myprojects.geoapify.com/), lalu simpan hanya di Railway Variables. |
| `PREFIX` | Awalan perintah bot; default `!`. |

## Pengaturan yang Dapat Diedit

Pengaturan seperti nama bot, zona waktu, LID privat, model Groq, batas riwayat, mention massal, dan daftar `!help` dapat dikelola dari Supabase. Jalankan migrasi lalu ikuti panduan di [`supabase/README.md`](./supabase/README.md). Railway hanya menyimpan koneksi rahasia satu kali ke Supabase; perubahan pengaturan harian dilakukan dari dashboard Supabase.

## Deployment Railway

Hubungkan repository ini ke Railway, lalu isi seluruh variabel lingkungan yang diperlukan. Untuk penggunaan normal setelah migrasi, tambahkan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` satu kali; pengaturan seperti LID privat dan zona waktu selanjutnya diedit dari Supabase. Tambahkan **Volume** dengan titik mount `/app` agar folder `auth_info` dan `data` tetap tersimpan setelah deployment atau restart. Jalankan bot dengan perintah `node index.js`, atau gunakan Procfile worker yang tersedia.

Setelah deployment, buka menu **Logs** Railway. Jika `AUTH_METHOD=qr`, log akan menampilkan tautan QR. Buka tautan tersebut, lalu pindai QR melalui WhatsApp pada menu **Perangkat Tertaut**. Jika menggunakan pairing, atur `BOT_NUMBER` dan masukkan kode pairing yang muncul di log. Di grup, gunakan format seperti **`@Pak Burhan jadwal ulangan kapan?`**; mention tanpa pertanyaan akan dibalas dengan contoh format yang benar. Pada interaksi pertama, bot akan meminta **nama** dan **gender**; pertanyaan AI baru diproses setelah kedua data tersebut diberikan agar panggilannya tidak keliru. Jika nama atau gender pernah tersimpan salah, kirim **`!profil ulang`** agar bot menghapus profil dan meminta data kembali.

## Mencari Tempat dan Mengirim Lokasi

Tambahkan `GEOAPIFY_API_KEY` di **Railway → Variables**, lalu gunakan perintah berikut setelah profil pengguna lengkap:

```text
!tempat bioskop di Solo
!tempat kafe di Solo Square
!tempat rumah sakit di Surakarta
!tempat Solo Square
```

Bot akan mengirim rangkuman hasil serta satu pesan lokasi interaktif. Ketuk pesan lokasi tersebut di WhatsApp untuk membukanya di aplikasi peta. Hasil bersumber dari data Geoapify/OpenStreetMap dan dapat berubah; selalu konfirmasi detail operasional langsung kepada tempat terkait.

## Analisis Gambar

Gunakan `!gambar` untuk menganalisis satu foto seperti soal, halaman buku, tabel, atau diagram. Di grup, foto wajib dikirim dengan tag bot dan caption yang jelas, misalnya **`@bot !gambar tolong jelaskan soal ini`**. Di DM admin, cukup gunakan `!gambar tolong jelaskan gambar ini` pada caption foto.

Bot hanya memproses foto JPG, PNG, atau WebP dengan ukuran maksimum **20 MB**. Setiap analisis gambar memakai satu kuota pertanyaan LID. Foto diunduh sementara ke memori untuk dikirim ke Groq Vision lalu tidak disimpan permanen oleh bot. Jika tulisan pada foto buram, hasil analisis dapat keliru; periksa kembali jawaban penting.

## Jadwal Kelas VII D

Perintah `!jadwal` menampilkan satu pesan yang memuat daftar pelajaran, piket kelas, dan piket MBG untuk hari berjalan. Untuk melihat hari tertentu, gunakan `!jadwal senin` sampai `!jadwal minggu`. Sabtu dan Minggu akan menampilkan informasi libur.

Bot juga memahami pertanyaan jadwal tanpa perintah, misalnya `Pak, jadwal besok apa?`, `Piket hari ini siapa?`, atau `Pelajaran Senin apa, Pak?`. Bot menentukan hari berdasarkan **WIB** dan menjawab langsung dari data jadwal, sehingga pertanyaan tersebut tidak memakai kuota AI.

Agar pengiriman otomatis tidak masuk ke grup yang keliru, admin harus masuk ke grup kelas tujuan lalu mengirim **`@bot !jadwal aktifkan`**. Setelah aktif, bot mengirimkan pesan jadwal kelas pada **17.00 WIB** dan **20.00 WIB** setiap hari. Pengiriman Sabtu dan Minggu berisi informasi libur. Admin dapat menghentikannya dengan `!jadwal nonaktifkan`.

## Memeriksa Kuota dan Status

Gunakan `!sisa` setelah profil lengkap untuk melihat kuota terpakai, sisa pertanyaan, dan waktu reset kuota LID Anda. Perintah ini tidak mengurangi kuota dan dapat digunakan di DM maupun grup selama bot sedang aktif.

Perintah `!status` **hanya** dapat digunakan dari DM oleh LID admin yang diizinkan. Laporan ini tidak memuat API key; isinya hanya status koneksi WhatsApp, kesiapan Groq dan Geoapify, model Groq aktif, kuota admin, status jam istirahat grup, serta zona waktu bot.

## Login Ulang

Untuk menghubungkan nomor WhatsApp yang berbeda, hapus folder `auth_info` pada volume Railway atau lakukan *wipe* volume, lalu deploy atau restart ulang bot.

## Penanganan Error Groq

Bot memakai **Groq Chat Completions API**, menyimpan maksimal **4 putaran** percakapan sebagai konteks agar penggunaan token lebih terkendali, dan menyertakan tanggal serta jam terkini sesuai `BOT_TIMEZONE` pada setiap permintaan AI. Riwayat privat dan riwayat grup dipisahkan menurut sumber chat sehingga konteks chat privat tidak dipakai pada grup. Jika Groq membalas **429**, bot mencoba key berikutnya dari `GROQ_API_KEYS` tanpa menuliskan rahasia ke log. Pesan yang jelas tetap ditampilkan untuk kode **404**, **429**, dan **401/403**. Detail kesalahan API dicatat pada log Railway agar konfigurasi dapat diperiksa tanpa membocorkan API key ke chat.
