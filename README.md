# Pak Burhan WhatsApp Bot

Bot WhatsApp persona **Pak Burhan** sebagai wali kelas 7D. Proyek ini menggunakan **Node.js, Baileys, Groq API**, serta Tavily dan Geoapify sebagai integrasi opsional. Model chat bawaan adalah **`llama-3.1-8b-instant`**.

## Fitur

Bot mendukung login melalui **QR Code** atau **Pairing Code**, percakapan AI dengan gaya Pak Burhan, memori percakapan, moderasi kata kasar, perintah `!help`, `!menu`, `!cari`, `!ceklink`, `!tempat`, `!gambar`, dan `!jadwal`. Perintah `!tempat` memakai Geoapify untuk mencari lokasi publik lalu mengirimkan satu **pesan lokasi WhatsApp yang dapat diketuk** untuk membuka peta. Pada grup, bot hanya menjawab saat akun bot benar-benar di-mention dengan format **`@bot pertanyaan`**; pada chat pribadi, bot hanya membalas LID yang diizinkan. Konfigurasi proyek dirancang untuk deployment Railway dengan volume persisten. Pesan masuk baru otomatis ditandai sebagai sudah dibaca oleh akun bot agar tidak menumpuk sebagai notifikasi belum dibaca; fitur ini tidak membisukan suara notifikasi WhatsApp.

Untuk menghemat limit AI, **grup** memakai jeda pemrosesan 20 detik. Pesan berguna yang masuk saat ada permintaan grup lain diproses akan dibalas `Permintaan sedang diproses (nomor antrean X).`, lalu tetap dijawab sesuai urutan. Basa-basi sederhana seperti sapaan, pesan tes, ucapan terima kasih, dan tawa singkat tidak masuk antrean atau diteruskan ke Groq; bot langsung mengirim respons hemat-limit dengan panggilan Mas atau Mbak sesuai profil. **DM admin tidak memakai cooldown maupun antrean.**

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
| `GROQ_MODEL` | Model fallback yang dibaca dari kode; saat ini bot tetap memakai `llama-3.1-8b-instant` dari konfigurasi aktif. |
| `GROQ_BASE_URL` | Default `https://api.groq.com/openai/v1`; biasanya tidak perlu diubah. |
| `SUPABASE_URL` | URL proyek Supabase yang menyimpan profil pengguna. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key Supabase untuk bot di Railway; rahasia dan tidak boleh dibagikan. |
| `PRIVATE_ALLOWED_LID` | LID privat yang diizinkan; dikelola dari Railway Variables dan kode. |
| `BOT_TIMEZONE` | Zona waktu bot; default `Asia/Jakarta` dan dikelola dari Railway Variables/kode. |
| `TAVILY_API_KEY` | Opsional; dipakai untuk fitur pencarian internet. |
| `VIRUSTOTAL_API_KEY` | Diperlukan untuk `!ceklink` dan pembacaan link otomatis. Dipakai untuk memeriksa URL terhadap deteksi malware/phishing. Simpan hanya di Railway Variables. |
| `JINA_API_KEY` | Opsional untuk `!ceklink`; dipakai agar Jina Reader mendapat batas akses lebih tinggi saat mengambil teks halaman. |
| `WEEKEND_AUDIO_SATURDAY_PATH` / `WEEKEND_AUDIO_SUNDAY_PATH` | Path file audio lokal di Volume Railway untuk voice note akhir pekan pukul 07.00 WIB. Musik maksimal 2 menit. |
| `GEOAPIFY_API_KEY` | Opsional; dipakai oleh `!tempat`. Buat key gratis di [Geoapify MyProjects](https://myprojects.geoapify.com/), lalu simpan hanya di Railway Variables. |
| `PREFIX` | Awalan perintah bot; default `!`. |

## Penyimpanan Profil di Supabase

Supabase sekarang dipakai untuk menyimpan data kecil profil pengguna pada tabel `profiles`: LID, nama, gender, dan waktu pembaruan. Pengaturan perilaku bot, model Groq, zona waktu, LID privat, daftar command, jadwal, dan aturan mention tetap berada di kode atau Railway Variables. Jalankan migrasi dan ikuti panduan di [`supabase/README.md`](./supabase/README.md).

## Deployment Railway

Hubungkan repository ini ke Railway, lalu isi seluruh variabel lingkungan yang diperlukan. Untuk penggunaan profil, tambahkan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` satu kali. Tambahkan **Volume** dengan titik mount `/app` agar folder `auth_info` dan `data` tetap tersimpan setelah deployment atau restart. Jalankan bot dengan perintah `node index.js`, atau gunakan Procfile worker yang tersedia.

Setelah deployment, buka menu **Logs** Railway. Jika `AUTH_METHOD=qr`, log akan menampilkan tautan QR. Buka tautan tersebut, lalu pindai QR melalui WhatsApp pada menu **Perangkat Tertaut**. Jika menggunakan pairing, atur `BOT_NUMBER` dan masukkan kode pairing yang muncul di log. Di grup, gunakan format seperti **`@Pak Burhan jadwal ulangan kapan?`**; mention tanpa pertanyaan akan dibalas dengan contoh format yang benar. Pada interaksi pertama, bot akan meminta **nama** dan **gender**; pertanyaan AI baru diproses setelah kedua data tersebut diberikan agar panggilannya tidak keliru. Jika nama atau gender pernah tersimpan salah, kirim **`!profil ulang`** agar bot menghapus profil dan meminta data kembali.

## Memeriksa dan Membaca Link

Fitur link memakai dua layanan dengan tugas berbeda. **VirusTotal Public API** memeriksa apakah URL sudah terdeteksi sebagai malware atau phishing. Jika pemeriksaan tidak menunjukkan bahaya, **Jina Reader** mengambil isi halaman menjadi teks yang kemudian dirangkum oleh model Groq Llama yang sudah dipakai bot. VirusTotal harus dikonfigurasi agar bot tidak membaca link tanpa pemeriksaan keamanan; Jina Reader dapat berjalan dengan batas rendah tanpa API key, tetapi `JINA_API_KEY` disarankan untuk penggunaan yang lebih stabil.

Tambahkan variabel berikut di **Railway → Variables**:

```text
VIRUSTOTAL_API_KEY=...
JINA_API_KEY=...
```

Gunakan command manual:

```text
!ceklink https://contoh.com/artikel
!ceklink apa isi artikel ini? https://contoh.com/artikel
!cari https://contoh.com/artikel
```

Pesan biasa yang mengandung URL pada grup jadwal aktif akan diproses otomatis tanpa tag bot. Pemeriksaan otomatis hanya memanggil VirusTotal dan tidak memanggil Jina Reader maupun Groq. Bot memberi reaksi `🧐` saat memeriksa; jika hasilnya `clean`, reaksinya diganti menjadi `✅` tanpa pesan teks. Jika VirusTotal masih `pending` atau mengalami error, bot tidak memberi `❌`, tidak menghapus pesan, dan tidak mengirim pesan teks karena status tersebut belum membuktikan bahaya. Jika link terdeteksi mencurigakan atau berbahaya secara final, bot memberi reaksi `❌`, membalas pesan, menghapus pesan sumber bila memiliki izin admin, lalu mengirim penjelasan risiko. Bot memeriksa maksimal tiga URL dalam satu pesan.

Hasil pemeriksaan otomatis disimpan sebagai cache sementara selama 24 jam agar URL yang sama tidak memakan request VirusTotal berulang. Cache otomatis dibersihkan setiap pukul **00.30 WIB** dan tidak menyentuh `memory.json`, `auth_info`, kuota, status jadwal, maupun profil. Link dengan command manual tetap memakai alur VirusTotal → Jina Reader → Groq, dengan maksimal **5.000 karakter total** dari teks halaman ke Groq. Konteks riwayat untuk analisis link dan panjang jawaban juga dibatasi agar tidak melewati batas token model. **Hasil “belum terdeteksi” bukan jaminan mutlak bahwa sebuah URL aman.** Jangan kirim URL yang mengandung token login, reset password, undangan privat, atau data pribadi karena URL tersebut dikirim ke layanan pihak ketiga.

VirusTotal Public API mempunyai batas penggunaan dan aturan penggunaan produk. Untuk detailnya, lihat [dokumentasi VirusTotal Public API](https://docs.virustotal.com/reference/public-vs-premium-api). Jina Reader dapat dibaca melalui [dokumentasi resmi Jina Reader](https://jina.ai/reader/). API key tidak pernah dicetak ke chat, log, atau repository.

## Audio Akhir Pekan

Fitur pencarian musik dan command `!musik` tidak digunakan lagi. Audio akhir pekan memakai dua file lokal yang disimpan di **Volume Railway**, sehingga tidak bergantung pada layanan pencarian musik dan tidak menghabiskan kredit TTS.

Letakkan file berikut di Volume Railway:

```text
/app/data/weekend-audio/sabtu.mp3
/app/data/weekend-audio/minggu.mp3
```

Bot akan mengirim file Sabtu pada pukul **07.00 WIB** hari Sabtu dan file Minggu pada pukul **07.00 WIB** hari Minggu. Setiap file dibatasi maksimal **2 menit**, dikonversi ke Ogg/Opus agar tampil sebagai voice note, lalu hanya file hasil konversi sementara yang dihapus. File sumber tetap disimpan di Volume Railway agar dapat dipakai pada akhir pekan berikutnya. Status pengiriman disimpan agar restart bot tidak mengirim ulang pada tanggal yang sama.

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

Grup VII D dari tautan default yang sudah ditentukan akan dicoba diaktifkan otomatis setiap kali bot tersambung. Jika berhasil, admin menerima pesan `[nama grup] sudah dijadikan jadwal otomatis`; jika gagal, admin menerima pesan gagal di DM. Admin dapat membalas langsung pesan gagal tersebut dengan tautan grup baru untuk mencoba ulang. Bot memeriksa tautan dan memastikan akun bot sudah menjadi anggota grup, tetapi tidak akan bergabung otomatis melalui tautan tersebut. Setelah aktif, bot mengirimkan **voice note jadwal** dan pesan teks kelas pada **17.00 WIB** dan **20.00 WIB** setiap hari. Voice note menggunakan aset Ogg/Opus di `assets/schedule-audio/` untuk Senin sampai Jumat, sedangkan teks tetap dikirim agar daftar pelajaran dan nama petugas mudah dibaca. Perintah manual `!jadwal senin` sampai `!jadwal jumat` juga mengirim voice note sesuai hari, sedangkan Sabtu dan Minggu hanya menampilkan informasi libur. Setiap pesan teks jadwal diakhiri catatan darurat sesuai format yang telah ditetapkan. Admin dapat menghentikannya dari DM dengan `!nonaktifkan jadwal`; pada koneksi berikutnya, target default akan dicoba diaktifkan kembali.

## Aset Audio Jadwal

Lima aset voice note jadwal disimpan dengan nama hari yang sederhana: `senin.ogg`, `selasa.ogg`, `rabu.ogg`, `kamis.ogg`, dan `jumat.ogg`. Semua aset dikonversi ke **Opus mono 48 kHz** agar dikirim sebagai voice note WhatsApp. Bagian paling bawah pesan teks jadwal memuat:

```text
*JIKA TERDAPAT KESALAHAN PADA JADWAL HUBUNGIN NOMOR DARURAT*🗿😅*
```

File audio tidak memuat API key dan dapat diganti dengan file baru menggunakan nama yang sama, lalu dilakukan commit dan deploy ulang.

## Memeriksa Kuota dan Status

Gunakan `!sisa` setelah profil lengkap untuk melihat kuota terpakai, sisa pertanyaan, dan waktu reset kuota LID Anda. Perintah ini tidak mengurangi kuota dan dapat digunakan di DM maupun grup selama bot sedang aktif.

Perintah `!status` **hanya** dapat digunakan dari DM oleh LID admin yang diizinkan. Laporan ini tidak memuat API key; isinya hanya status koneksi WhatsApp, kesiapan Groq, VirusTotal, Jina Reader, dan Geoapify, model Groq aktif, kuota admin, status jam istirahat grup, serta zona waktu bot.

## Login Ulang

Untuk menghubungkan nomor WhatsApp yang berbeda, hapus folder `auth_info` pada volume Railway atau lakukan *wipe* volume, lalu deploy atau restart ulang bot.

## Penanganan Error Groq

Bot memakai **Groq Chat Completions API**, menyimpan maksimal **4 putaran** percakapan sebagai konteks agar penggunaan token lebih terkendali, dan menyertakan tanggal serta jam terkini sesuai `BOT_TIMEZONE` pada setiap permintaan AI. Riwayat privat dan riwayat grup dipisahkan menurut sumber chat sehingga konteks chat privat tidak dipakai pada grup. Jika Groq membalas **429**, bot mencoba key berikutnya dari `GROQ_API_KEYS` tanpa menuliskan rahasia ke log. Pesan yang jelas tetap ditampilkan untuk kode **404**, **429**, dan **401/403**. Detail kesalahan API dicatat pada log Railway agar konfigurasi dapat diperiksa tanpa membocorkan API key ke chat.
