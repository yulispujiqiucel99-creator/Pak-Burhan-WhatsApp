# Pak Burhan WhatsApp Bot

Bot WhatsApp persona **Pak Burhan** sebagai wali kelas 7D. Proyek ini menggunakan **Node.js, Baileys, Gemini API melalui Google AI Studio**, serta Tavily dan Geoapify sebagai integrasi opsional. Model chat bawaan adalah **`gemini-3.1-flash-lite`**.

## Fitur

Bot mendukung login melalui **QR Code** atau **Pairing Code**, percakapan AI dengan gaya Pak Burhan, memori percakapan, moderasi kata kasar, perintah `!help`, `!menu`, `!cari`, `!ceklink`, `!tempat`, `!gambar`, dan `!jadwal`. Perintah `!tempat` memakai Geoapify untuk mencari lokasi publik lalu mengirimkan satu **pesan lokasi WhatsApp yang dapat diketuk** untuk membuka peta. Pada grup, bot hanya menjawab saat akun bot benar-benar di-mention dengan format **`@bot pertanyaan`**; pada chat pribadi, bot hanya membalas LID yang diizinkan. Konfigurasi proyek dirancang untuk deployment Railway dengan volume persisten. Pesan masuk baru otomatis ditandai sebagai sudah dibaca oleh akun bot agar tidak menumpuk sebagai notifikasi belum dibaca; fitur ini tidak membisukan suara notifikasi WhatsApp.

Untuk menghemat limit AI, **grup** memakai jeda pemrosesan 20 detik. Pesan berguna yang masuk saat ada permintaan grup lain diproses akan dibalas `Permintaan sedang diproses (nomor antrean X).`, lalu tetap dijawab sesuai urutan. Basa-basi sederhana seperti sapaan, pesan tes, ucapan terima kasih, dan tawa singkat tidak masuk antrean atau diteruskan ke Gemini; bot langsung mengirim respons hemat-limit dengan panggilan Mas atau Mbak sesuai profil. **DM admin tidak memakai cooldown maupun antrean.**

Setiap LID memiliki paling banyak **20 pertanyaan dalam jendela 24 jam**. Yang dihitung adalah permintaan yang benar-benar akan diproses, termasuk pencarian tempat dan pencarian internet; onboarding, `!help`, `!sisa`, `!status`, respons waktu, moderasi, serta basa-basi tidak menghabiskan kuota. Saat kuota penuh, bot mengirimkan pesan tunggu 24 jam. Kuota tersimpan di volume Railway sehingga tidak hilang saat bot restart.

Bot beristirahat di seluruh grup setiap hari pada **21.30–04.00 WIB**. Tepat pukul 21.30, bot mengirim pesan penutup satu kali ke tiap grup lalu tidak merespons pesan grup—termasuk dari admin grup—sampai pukul 04.00. Chat DM dari LID admin tetap tersedia 24 jam, tetapi tetap mengikuti batas 20 pertanyaan per 24 jam.

## Setup Lokal

```bash
npm install
cp .env.example .env
npm start
```

Isi `GEMINI_API_KEYS` pada `.env` sebelum menjalankan bot. API key dibuat dari [Gemini Console](https://aistudio.google.com/apikey); jangan pernah menyimpan key asli ke repository.

### Test

Untuk iterasi sticker, jalankan `npm run test:sticker`. Untuk perubahan jadwal, jalankan `npm run test:jadwal`. Pemeriksaan penuh tersedia melalui `npm test` dan dijalankan sebelum rilis besar.

## Variabel Lingkungan

| Key | Keterangan |
|---|---|
| `AUTH_METHOD` | `qr` sebagai default, atau `pairing`. |
| `BOT_NUMBER` | Wajib untuk metode `pairing`; gunakan format `628...`. |
| `GEMINI_API_KEYS` | Satu atau beberapa API key Gemini, dipisahkan koma. Saat error 429, bot mencoba key berikutnya secara otomatis. |
| `GEMINI_API_KEY` | Kompatibilitas untuk konfigurasi lama dengan satu key; lebih disarankan memakai `GEMINI_API_KEYS`. |
| `GEMINI_MODEL` | Model chat utama; default `gemini-3.1-flash-lite`. |
| `GEMINI_VISION_MODEL` | Model untuk `!gambar`; default mengikuti `GEMINI_MODEL`. |
| `GEMINI_BASE_URL` | Default `https://generativelanguage.googleapis.com/v1beta/openai`; biasanya tidak perlu diubah. |
| `SUPABASE_URL` | URL proyek Supabase yang menyimpan profil pengguna. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key Supabase untuk bot di Railway; rahasia dan tidak boleh dibagikan. |
| `PRIVATE_ALLOWED_LID` | LID privat yang diizinkan; dikelola dari Railway Variables dan kode. |
| `BOT_TIMEZONE` | Zona waktu bot; default `Asia/Jakarta` dan dikelola dari Railway Variables/kode. |
| `TAVILY_API_KEY` | Opsional; dipakai untuk fitur pencarian internet. |
| `VIRUSTOTAL_API_KEY` | Diperlukan untuk `!ceklink` dan pembacaan link otomatis. Dipakai untuk memeriksa URL terhadap deteksi malware/phishing. Simpan hanya di Railway Variables. |
| `JINA_API_KEY` | Opsional untuk `!ceklink`; dipakai agar Jina Reader mendapat batas akses lebih tinggi saat mengambil teks halaman. |
| `WEEKEND_AUDIO_SATURDAY_PATH` / `WEEKEND_AUDIO_SUNDAY_PATH` | Opsional; untuk mengganti path audio. Secara default bot membaca file dari `assets/weekend-audio` di repository. |
| `GEOAPIFY_API_KEY` | Opsional; dipakai oleh `!tempat`. Buat key gratis di [Geoapify MyProjects](https://myprojects.geoapify.com/), lalu simpan hanya di Railway Variables. |
| `PREFIX` | Awalan perintah bot; default `!`. |

## Penyimpanan Profil di Supabase

Supabase sekarang dipakai untuk menyimpan profil pengguna pada tabel `profiles` serta role JFR permanen pada tabel `jfr_roles`. Profil menyimpan LID, nama, gender, dan waktu pembaruan; role JFR menyimpan LID dan waktu pemberian akses. State lokal di folder `data/` hanya dipakai sebagai cache/fallback dan backfill, bukan satu-satunya sumber permanen untuk role JFR. Pengaturan perilaku bot, model Gemini, zona waktu, LID privat, daftar command, jadwal, dan aturan mention tetap berada di kode atau Railway Variables. Jalankan migrasi dan ikuti panduan di [`supabase/README.md`](./supabase/README.md).

## Deployment Railway

Hubungkan repository ini ke Railway, lalu isi seluruh variabel lingkungan yang diperlukan. Untuk penggunaan profil, tambahkan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` satu kali. Tambahkan **Volume** dengan titik mount `/app` agar folder `auth_info` dan `data` tetap tersimpan setelah deployment atau restart. Jalankan bot dengan perintah `node index.js`, atau gunakan Procfile worker yang tersedia.

Untuk fitur `!hd` berbasis GPU opsional, isi `DEAPI_MODEL=RealESRGAN_x4`, `DEAPI_MAX_LONG_SIDE=1440`, dan `DEAPI_DAILY_REQUEST_LIMIT=10` sebagai variable biasa. Simpan API key deAPI hanya sebagai secret `DEAPI_API_KEY`; jangan masukkan nilainya ke GitHub atau chat. Mode otomatis memakai deAPI untuk foto hingga 720p, memakai CPU lokal untuk foto yang lebih besar, menyimpan cache hasil selama 24 jam, dan kembali ke CPU jika deAPI tidak tersedia atau batas harian tercapai.

Setelah deployment, buka menu **Logs** Railway. Jika `AUTH_METHOD=qr`, log akan menampilkan tautan QR. Buka tautan tersebut, lalu pindai QR melalui WhatsApp pada menu **Perangkat Tertaut**. Jika menggunakan pairing, atur `BOT_NUMBER` dan masukkan kode pairing yang muncul di log. Di grup, gunakan format seperti **`@Pak Burhan jadwal ulangan kapan?`**; mention tanpa pertanyaan akan dibalas dengan contoh format yang benar. Pada interaksi pertama, bot akan meminta **nama** dan **gender**; pertanyaan AI baru diproses setelah kedua data tersebut diberikan agar panggilannya tidak keliru. Jika nama atau gender pernah tersimpan salah, kirim **`!profil ulang`** agar bot menghapus profil dan meminta data kembali.

## Memeriksa dan Membaca Link

Fitur link memakai dua layanan dengan tugas berbeda. **VirusTotal Public API** memeriksa apakah URL sudah terdeteksi sebagai malware atau phishing. Jika pemeriksaan tidak menunjukkan bahaya, **Jina Reader** mengambil isi halaman menjadi teks yang kemudian dirangkum oleh model Gemini yang dipakai bot. VirusTotal harus dikonfigurasi agar bot tidak membaca link tanpa pemeriksaan keamanan; Jina Reader dapat berjalan dengan batas rendah tanpa API key, tetapi `JINA_API_KEY` disarankan untuk penggunaan yang lebih stabil.

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

Pesan biasa yang mengandung URL pada grup jadwal aktif akan diproses otomatis tanpa tag bot. Pemeriksaan otomatis hanya memanggil VirusTotal dan tidak memanggil Jina Reader maupun Gemini. Bot memberi reaksi `🧐` saat memeriksa; jika hasilnya `clean`, reaksinya diganti menjadi `✅` tanpa pesan teks. Jika VirusTotal masih `pending` atau mengalami error, bot tidak memberi `❌`, tidak menghapus pesan, dan tidak mengirim pesan teks karena status tersebut belum membuktikan bahaya. Jika link terdeteksi mencurigakan atau berbahaya secara final, bot memberi reaksi `❌`, membalas pesan, menghapus pesan sumber bila memiliki izin admin, lalu mengirim penjelasan risiko. Bot memeriksa maksimal tiga URL dalam satu pesan.

Hasil pemeriksaan otomatis disimpan sebagai cache sementara selama 24 jam agar URL yang sama tidak memakan request VirusTotal berulang. Cache otomatis dibersihkan setiap pukul **00.30 WIB** dan tidak menyentuh `memory.json`, `auth_info`, kuota, status jadwal, maupun profil. Link dengan command manual tetap memakai alur VirusTotal → Jina Reader → Gemini, dengan maksimal **5.000 karakter total** dari teks halaman ke Gemini. Konteks riwayat untuk analisis link dan panjang jawaban juga dibatasi agar tidak melewati batas token model. **Hasil “belum terdeteksi” bukan jaminan mutlak bahwa sebuah URL aman.** Jangan kirim URL yang mengandung token login, reset password, undangan privat, atau data pribadi karena URL tersebut dikirim ke layanan pihak ketiga.

VirusTotal Public API mempunyai batas penggunaan dan aturan penggunaan produk. Untuk detailnya, lihat [dokumentasi VirusTotal Public API](https://docs.virustotal.com/reference/public-vs-premium-api). Jina Reader dapat dibaca melalui [dokumentasi resmi Jina Reader](https://jina.ai/reader/). API key tidak pernah dicetak ke chat, log, atau repository.

## Audio Akhir Pekan

Fitur pencarian musik dan command `!musik` tidak digunakan lagi. Audio akhir pekan memakai dua file lokal yang disimpan di repository GitHub pada folder berikut:

```text
assets/weekend-audio/sabtu.mp3
assets/weekend-audio/minggu.mp3
```

Bot akan mengirim file Sabtu pada pukul **07.00 WIB** hari Sabtu dan file Minggu pada pukul **07.00 WIB** hari Minggu, bersama keterangan libur. Selain itu, command `!jadwal sabtu` dan `!jadwal minggu` juga mengirim audio libur masing-masing bersama teks jadwal. Setiap file dibatasi maksimal **2 menit**, dikonversi ke Ogg/Opus agar tampil sebagai voice note, lalu hanya file hasil konversi sementara yang dihapus. File sumber tetap ada di GitHub agar dapat dipakai pada akhir pekan berikutnya. Status pengiriman otomatis disimpan agar restart bot tidak mengirim ulang pada tanggal yang sama.

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

Bot hanya memproses foto JPG, PNG, atau WebP dengan ukuran maksimum **20 MB**. Setiap analisis gambar memakai satu kuota pertanyaan LID. Foto diunduh sementara ke memori untuk dikirim ke Gemini Vision lalu tidak disimpan permanen oleh bot. Jika tulisan pada foto buram, hasil analisis dapat keliru; periksa kembali jawaban penting.

## Membuat Sticker

Fitur sticker hanya mendukung konversi gambar menjadi sticker menggunakan pemrosesan lokal. Di grup, command harus diawali mention bot sesuai aturan umum. Kirim gambar dengan caption **`@bot !stiker`**, reply gambar lalu kirim **`@bot !stiker`**, atau gunakan alias **`!sticker`**.

Bot menerima gambar JPG, PNG, dan WebP dengan ukuran maksimum **10 MB**. Gambar diproses sementara menjadi WebP, lalu dikirim sebagai sticker dan tidak disimpan ke Supabase, `MEMORY`, atau repository. Fitur sticker teks, Brat, IQC, dan overlay teks tidak tersedia.

## Jadwal Kelas VII D

Perintah `!jadwal` menampilkan satu pesan yang memuat daftar pelajaran, piket kelas, dan piket MBG untuk hari berjalan. Untuk melihat hari tertentu, gunakan `!jadwal senin` sampai `!jadwal minggu`. Sabtu dan Minggu akan menampilkan informasi libur.

Bot juga memahami pertanyaan jadwal tanpa perintah, misalnya `Pak, jadwal besok apa?`, `Piket hari ini siapa?`, atau `Pelajaran Senin apa, Pak?`. Bot menentukan hari berdasarkan **WIB** dan menjawab langsung dari data jadwal, sehingga pertanyaan tersebut tidak memakai kuota AI.

Grup VII D dari tautan default yang sudah ditentukan akan dicoba diaktifkan otomatis setiap kali bot tersambung. Jika berhasil, admin menerima pesan `[nama grup] sudah dijadikan jadwal otomatis`; jika gagal, admin menerima pesan gagal di DM. Admin dapat membalas langsung pesan gagal tersebut dengan tautan grup baru untuk mencoba ulang. Bot memeriksa tautan dan memastikan akun bot sudah menjadi anggota grup, tetapi tidak akan bergabung otomatis melalui tautan tersebut. Setelah aktif, bot mengirimkan **jadwal hari berikutnya** pada **16.00 WIB** dan **20.00 WIB**. Pada pengiriman pukul 16.00 di hari sekolah, bot menghapus pesan jadwal sekolah yang sebelumnya dipin, lalu mem-pin pesan jadwal terbaru untuk hari sekolah berikutnya. Pukul 20.00 hanya mengirim ulang jadwal sebagai pengingat dan tidak mengubah pin. Pin tidak digunakan untuk Sabtu, Minggu, atau pesan hari libur; pada kondisi tersebut jadwal tetap dikirim normal. Pada Sabtu dan Minggu, kedua waktu tersebut langsung menargetkan jadwal Senin. Audio pagi akhir pekan dikirim terpisah pada 07.00 WIB. Voice note menggunakan aset Ogg/Opus di `assets/schedule-audio/`, sedangkan teks tetap dikirim agar daftar pelajaran dan informasi libur mudah dibaca. Perintah manual `!jadwal senin` sampai `!jadwal minggu` juga mengirim voice note sesuai hari. Setiap pesan teks jadwal diakhiri catatan darurat sesuai format yang telah ditetapkan. Admin dapat menghentikannya dari DM dengan `!nonaktifkan jadwal`; pada koneksi berikutnya, target default akan dicoba diaktifkan kembali.

## Aset Audio Jadwal

Tujuh aset voice note jadwal disimpan dengan nama hari yang sederhana: `senin.ogg`, `selasa.ogg`, `rabu.ogg`, `kamis.ogg`, `jumat.ogg`, `sabtu.ogg`, dan `minggu.ogg`. Semua aset dikonversi ke **Opus mono 48 kHz** agar dikirim sebagai voice note WhatsApp. Bagian paling bawah pesan teks jadwal memuat:

```text
*JIKA TERDAPAT KESALAHAN PADA JADWAL HUBUNGIN NOMOR DARURAT*🗿😅*
```

File audio tidak memuat API key dan dapat diganti dengan file baru menggunakan nama yang sama, lalu dilakukan commit dan deploy ulang.

## Memeriksa Kuota dan Status

Gunakan `!sisa` setelah profil lengkap untuk melihat kuota terpakai, sisa pertanyaan, dan waktu reset kuota LID Anda. Perintah ini tidak mengurangi kuota dan dapat digunakan di DM maupun grup selama bot sedang aktif.

Perintah `!status` **hanya** dapat digunakan dari DM oleh LID admin yang diizinkan. Laporan ini tidak memuat API key; isinya hanya status koneksi WhatsApp, kesiapan Gemini, VirusTotal, Jina Reader, dan Geoapify, model Gemini aktif, kuota admin, status jam istirahat grup, serta zona waktu bot.

## Login Ulang

Untuk menghubungkan nomor WhatsApp yang berbeda, hapus folder `auth_info` pada volume Railway atau lakukan *wipe* volume, lalu deploy atau restart ulang bot.

## Penanganan Error Gemini

Bot memakai **Gemini Chat Completions API**, menyimpan maksimal **4 putaran** percakapan sebagai konteks agar penggunaan token lebih terkendali, dan menyertakan tanggal serta jam terkini sesuai `BOT_TIMEZONE` pada setiap permintaan AI. Riwayat privat dan riwayat grup dipisahkan menurut sumber chat sehingga konteks chat privat tidak dipakai pada grup. Jika Gemini membalas **429**, bot mencoba key berikutnya dari `GEMINI_API_KEYS` tanpa menuliskan rahasia ke log. Pesan yang jelas tetap ditampilkan untuk kode **404**, **429**, dan **401/403**. Detail kesalahan API dicatat pada log Railway agar konfigurasi dapat diperiksa tanpa membocorkan API key ke chat.


> Catatan konsep audio Tahun Baru versi Vinn: nuansa haru sekaligus bahagia. Isi utama tentang Pak Burhan yang sudah menemani murid hampir satu tahun, waktu kebersamaan yang mulai menipis, dan sebentar lagi mereka naik kelas. Audio referensi Vinn: `/home/ubuntu/upload/AhaTik_suaraasli-vinn_a3e25476-caf4-465a-90bd-9badfed7e848.mp3`. Catatan ini belum menjadi fitur atau jadwal aktif; masih tersisa empat hari khusus untuk dirancang.

Catatan konsep audio Idulfitri versi Xiszzx: suasana perayaan kemenangan setelah Ramadan, saling memaafkan, berkumpul bersama keluarga, dan ucapan hangat dari Pak Burhan untuk murid-murid. Audio referensi: `/home/ubuntu/upload/AhaTik_suaraasli-xiszzx_93fa45d2-737e-4515-a1f3-db183616ef46.mp3`. Naskah final dan jadwal belum dibuat.


Catatan konsep audio Iduladha: gunakan referensi takbiran `/home/ubuntu/upload/AhaTik_TakbiranIdulAdha_3a9bc8c0-a0c2-4147-a97a-448c241afc39.mp3`. Nuansanya mengikuti nama dan isi referensi: takbir, perayaan Iduladha, dan ucapan hangat Pak Burhan. Audio ini bukan referensi Idulfitri.


Catatan konsep audio Kemerdekaan RI: gunakan audio referensi `/home/ubuntu/upload/AhaTik_suaraasli-class7¹¹😏😻_973c5544-83d2-4a8e-ab6a-f4bbe044d518.mp3`. Naskah akan dibuat sendiri dengan suasana semangat nasionalisme yang cocok untuk murid kelas 7.

Catatan konsep audio Natal: gunakan audio referensi `/home/ubuntu/upload/AhaTik_AllIWantForChristmasIsYou_34e11ce1-b697-42e9-a4e0-97b8fac05c40.mp3`. Naskah akan menekankan toleransi dan penghormatan kepada teman yang merayakan, dengan bahasa netral dan tidak memaksakan keyakinan.


## Kalender Hari Raya Dinamis

Bot memeriksa tanggal Idulfitri dan Iduladha secara otomatis melalui pencarian internet sekitar **21 hari sebelum perkiraan hari raya**. Hasil hanya diterima jika tanggal yang sama ditemukan pada sedikitnya dua sumber resmi yang diizinkan, sehingga satu hasil pencarian yang keliru tidak langsung mengubah kalender.

Tanggal yang sudah dikonfirmasi disimpan pada `data/bot_state.json` di volume Railway bersama sumber dan waktu konfirmasinya. Penyimpanan dibuat berdasarkan tahun berjalan sehingga bot dapat terus dipakai sampai masa kelulusan tanpa mengganti tanggal secara manual setiap tahun. Pada tanggal hari raya, jadwal kelas diganti menjadi informasi libur.

Tepat pukul **08.10 WIB pada H-1**, bot mengirim satu pesan pengingat ke grup jadwal aktif. Status pengiriman memakai kunci perayaan dan tanggal, sehingga restart atau pemeriksaan scheduler berulang tidak mengirim pesan ganda. Jika tanggal resmi belum ditemukan, bot tidak menebak dan akan mencoba lagi pada pemeriksaan harian berikutnya.

Fitur ini memakai `TAVILY_API_KEY` yang sama dengan pencarian internet. Jika key tidak tersedia atau sumber resmi belum memberikan tanggal yang dapat diverifikasi, fitur pencarian kalender tidak mengubah jadwal dan tidak mengganggu jadwal kelas biasa.

### Format status kalender

```json
{
  "holidayCalendar": {
    "idulfitri": {
      "label": "Idulfitri",
      "dateKey": "YYYY-MM-DD",
      "sources": ["domain-sumber-1", "domain-sumber-2"],
      "confirmedAt": "ISO-8601"
    }
  },
  "lastHolidayNotificationKeys": {
    "idulfitri": "idulfitri-YYYY-MM-DD-h1"
  }
}
```

Audio khusus hari raya belum diaktifkan oleh mekanisme ini karena aset audionya belum berada di repository. Saat aset final sudah tersedia, pengiriman audio dapat ditambahkan tanpa mengubah aturan tanggal dan anti-duplikasi.


## Verifikasi Peran JFR

Akun dapat meminta peran JFR dengan mengirim **`#JFR` melalui DM**. Fitur ini tidak diproses di grup. Jika identitas nama dan gender belum lengkap, bot akan menyelesaikan onboarding terlebih dahulu. Setelah identitas diketahui, bot membuat kode acak tujuh karakter yang hanya terdiri dari huruf kapital `A-Z` dan angka `0-9`.

Kode dikirim hanya ke DM admin dengan format peringatan berikut:

```text
⚠️KODE JFR BARU SAJA MASUK⚠️
[KODE 7 KARAKTER]
⚠️JANGAN BAGIKAN KODE INI JIKA TIDAK ADA YANG MEMINTA MENJADI JFR⚠️
```

Peminta menerima instruksi untuk memasukkan kode. Kode berlaku selama **satu jam**, hanya dapat digunakan sekali, dan memiliki maksimal **tiga percobaan**. Kode disimpan dalam bentuk hash pada state bot, bukan sebagai kode teks biasa. Setelah verifikasi berhasil, peran JFR bersifat permanen sampai dicabut admin.

JFR dapat melakukan chat AI melalui DM tanpa batas kuota, tetapi tidak memperoleh akses command admin. Daftar command admin tidak ditampilkan pada menu JFR atau member. Di DM admin, menu tambahan menampilkan `!daftarjfr` untuk melihat JFR aktif dan `!cabutjfr [LID]` untuk mencabut akses. Data role dan permintaan verifikasi disimpan pada `data/bot_state.json` di volume Railway.
