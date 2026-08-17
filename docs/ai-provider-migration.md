# Riset Migrasi Provider AI Pak Burhan

## Kondisi repository saat ini

Repository utama saat ini memakai Groq secara langsung melalui endpoint OpenAI-compatible `chat/completions`. Chat umum memakai `BOT_SETTINGS.groq_model`, sedangkan analisis gambar memakai `GROQ_VISION_MODEL`. Tersedia rotasi dua API key Groq saat respons 429. Tidak ditemukan penggunaan aktif OpenRouter pada jalur request saat ini; komentar/header lama hanya menyebut OpenRouter.

Fungsi utama yang perlu dipindahkan adalah `askAI()` untuk chat umum dan `askVision()` untuk analisis gambar. Fitur tool, link scanner, profil, jadwal, JFR, HD, dan Supabase tidak perlu diubah jika kontrak fungsi tersebut dipertahankan.

## Kandidat Google Gemini API

Google menyediakan Gemini API melalui Google AI Studio dengan free tier untuk developer dan proyek kecil. Dokumentasi harga menyebut input dan output token gratis pada model tertentu di free tier, akses terbatas terhadap model, serta catatan bahwa konten free tier dapat digunakan untuk meningkatkan produk Google. Rate limit dihitung sebagai RPM, TPM, dan RPD; limit berbeda per model dan proyek, dan kuota RPD reset pada tengah malam waktu Pasifik.

Dokumentasi resmi juga menyediakan kompatibilitas OpenAI. Migrasi dari client OpenAI-compatible dapat memakai base URL `https://generativelanguage.googleapis.com/v1beta/openai/`, API key Gemini, dan model Gemini. Format `messages` dan endpoint chat completions dapat dipertahankan, sehingga perubahan kode relatif kecil. Gemini juga mendukung input gambar menggunakan format `image_url` data URL, yang sesuai dengan pola `askVision()` saat ini.

Model kandidat sebaiknya dipilih dari model yang benar-benar tersedia di akun dan free tier saat setup, bukan di-hardcode hanya berdasarkan nama dari dokumentasi. Model Flash/Lite paling sesuai untuk chat umum karena latensi dan biaya rendah; model vision harus diuji kembali dengan gambar soal dan foto biasa.

Sumber resmi: https://ai.google.dev/gemini-api/docs/pricing
Sumber resmi: https://ai.google.dev/gemini-api/docs/rate-limits
Sumber resmi: https://ai.google.dev/gemini-api/docs/openai

## Kandidat Cerebras

Cerebras menyediakan Free Trial dengan kredit $5 setelah akun dibuat dan metode pembayaran terverifikasi. Dokumentasi rate limit menyebut model publik seperti `gpt-oss-120b`, `zai-glm-4.7`, dan `gemma-4-31b` pada Free Trial, dengan batas umum 5 RPM, 30K TPM, 1M TPH, dan 1M TPD. Dokumentasi juga menyatakan tidak ada tier gratis permanen yang otomatis diperbarui; setelah kredit habis atau kedaluwarsa, API berhenti sampai pengguna membeli kredit.

Cerebras menarik untuk kecepatan dan chat teks, tetapi kurang ideal sebagai pengganti tunggal karena kebutuhan analisis gambar Pak Burhan dan sifat gratisnya hanya trial berbatas waktu. `gemma-4-31b` memiliki dukungan gambar pada batas tertentu, tetapi perlu diuji dan tidak boleh diasumsikan setara dengan provider multimodal khusus.

Sumber resmi: https://www.cerebras.ai/pricing
Sumber resmi: https://inference-docs.cerebras.ai/support/rate-limits

## Rekomendasi desain

Kandidat paling praktis untuk mengganti Groq sekaligus menghapus OpenRouter adalah Gemini API langsung melalui endpoint kompatibel OpenAI. Simpan API key di Railway sebagai `GEMINI_API_KEYS`, model chat sebagai `GEMINI_MODEL`, base URL sebagai `GEMINI_BASE_URL`, dan model vision sebagai `GEMINI_VISION_MODEL`.

Pertahankan nama fungsi `askAI()` dan `askVision()` agar seluruh fitur bot tidak perlu dirombak. Pertahankan rotasi key bila pengguna menyediakan lebih dari satu key, tetapi tambahkan fallback yang jelas untuk 401/403, 404, 429, dan error kuota. Jangan mengirim API key melalui chat atau commit.

Perubahan utama sebelum coding adalah persetujuan pengguna atas Gemini sebagai provider utama dan penambahan minimal satu `GEMINI_API_KEY` di Railway. Setelah itu perlu diuji: chat bahasa Indonesia, pertanyaan jadwal, konteks hasil link scanner, `!gambar` untuk gambar soal, 429/limit, status bot, dan seluruh 50 tes regresi.

## Spesifikasi Gemini 3.1 Flash-Lite

Dokumentasi model resmi menyatakan `gemini-3.1-flash-lite` adalah model multimodal berlatensi rendah untuk tugas ringan berfrekuensi tinggi. Input yang didukung mencakup teks, gambar, video, audio, dan PDF; output-nya teks. Batas input tercantum 1.048.576 token dan batas output 65.536 token. Model stable yang dipakai adalah `gemini-3.1-flash-lite`, bukan varian `-preview` yang sudah dihentikan.

Dokumentasi juga menempatkan model ini pada tugas seperti chat ringan, ekstraksi, transkripsi, rangkuman, dan klasifikasi. Untuk pertanyaan yang benar-benar kompleks, model Flash/Lite yang lebih besar atau model Pro dapat lebih akurat, tetapi untuk bot kelas dan respons rutin Flash-Lite lebih rasional.

Konteks besar tidak berarti setiap request harus mengirim riwayat panjang. Google sendiri menjelaskan bahwa query panjang menambah latensi dan input token; konteks yang tidak diperlukan sebaiknya dipotong. Bot tetap mempertahankan riwayat terbatas agar respons cepat dan kuota free tier aman.

Sumber resmi: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
Sumber resmi: https://ai.google.dev/gemini-api/docs/models
Sumber resmi: https://ai.google.dev/gemini-api/docs/long-context

## Verifikasi kompatibilitas parameter

Dokumentasi Google Cloud untuk Gemini Chat Completions mencantumkan bahwa `max_completion_tokens` adalah alias untuk `max_tokens`, serta mendukung `messages`, `model`, `temperature`, dan `image_url` dengan base64. Dengan demikian, request axios yang mempertahankan `max_completion_tokens` dari implementasi Groq tetap valid untuk endpoint Gemini OpenAI-compatible. Dokumentasi juga menyatakan bahwa parameter `reasoning_effort` didukung, tetapi migrasi tidak memakainya agar perilaku Flash-Lite tetap sederhana dan hemat.

Sumber resmi: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/migrate/openai/overview
