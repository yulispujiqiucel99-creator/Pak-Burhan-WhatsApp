# Rancangan Fitur Deskripsi Video Media Sosial

## Tujuan

Pengguna dapat mengirim link video publik dari YouTube, TikTok, Instagram, X, atau Facebook. Bot memeriksa durasi, menolak video di atas 20 menit, meminta analisis video, merangkum hasil secara bertahap agar prompt Gemini tidak terlalu panjang, lalu mengirim satu pesan WhatsApp yang singkat, padat, dan jelas.

## Opsi implementasi

| Pendekatan | Kelebihan | Kekurangan | Biaya | Kompleksitas |
|---|---|---|---|---|
| Supadata langsung dari URL | Mendukung beberapa platform sosial, audio dan visual, prompt/schema JSON, tidak perlu mengunduh video sendiri | Bergantung pada akses publik dan layanan pihak ketiga; kuota gratis terbatas | Halaman layanan menyebut 100 request gratis per bulan; paket setelahnya perlu dicek di dashboard | Rendah-menengah |
| Download video lalu pipeline sendiri | Kontrol lebih besar atas audio, frame, dan transkrip; tidak bergantung pada satu extractor URL | Perlu downloader, storage sementara, ekstraksi frame/audio, model vision/STT, dan lebih banyak CPU/RAM | Bisa memakai lebih banyak resource/API; biaya sulit diprediksi | Tinggi |
| Web analyzer manual | Bisa langsung mencoba hasil visual tanpa mengubah bot | Tidak otomatis masuk WhatsApp dan tidak ideal untuk integrasi | Umumnya free trial/kuota terbatas | Rendah untuk tes, tidak cocok produksi |

## Rekomendasi desain awal

Untuk bot yang sudah berjalan di Railway, opsi Supadata adalah jalur paling ringan. Command yang disiapkan dapat berupa `!deskripsivideo [URL]` atau cukup mengenali URL dengan kata kunci tertentu. Karena pengguna belum meminta coding final, command belum dipasang.

Batas aplikasi ditetapkan 20 menit per video walaupun layanan mengklaim dapat memproses video lebih panjang. Batas ini untuk menjaga waktu respons, kuota, ukuran prompt, dan panjang pesan WhatsApp.

## Ringkasan bertahap

Jika Supadata mengembalikan transcript atau hasil panjang, bot membaginya berdasarkan timestamp atau blok karakter. Setiap blok diringkas menjadi 2–3 poin. Ringkasan blok kemudian digabung dan diringkas sekali lagi menjadi maksimal 3–5 poin utama dengan maksimal 3 timestamp. Transkrip lengkap tidak dikirim otomatis; bila nanti dibutuhkan, bot dapat mengirimkannya sebagai file teks.

## Format pesan

```text
🎥 DESKRIPSI VIDEO

Video ini membahas [topik utama].

🔹 Poin penting:
1. [poin pertama]
2. [poin kedua]
3. [poin ketiga]

⏱️ Bagian penting: 02:15, 14:40, 18:20
```

## Risiko dan pengaman

Video privat, login-required, terhapus, dibatasi wilayah, atau gagal diambil karena anti-bot harus menghasilkan pesan gagal yang sopan, bukan ringkasan palsu. Hasil Supadata harus diberi batas panjang sebelum dimasukkan ke Gemini. Panggilan API harus memiliki timeout, cache berdasarkan URL, dan kuota terpisah agar satu video yang sama tidak menghabiskan request berkali-kali.

## Sumber

1. Supadata Video Analysis API: https://supadata.ai/video-analysis-api
2. ScreenApp Video Analysis AI: https://screenapp.io/features/video-analyzer
3. Twelve Labs Video Analysis: https://www.twelvelabs.io/blog/generate-social-posts
