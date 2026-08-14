# Pengaturan Bot di Supabase

Bot mengambil pengaturan yang dapat diedit dari satu baris `public.bot_settings` dengan ID `default`. Pengaturan diperbarui otomatis paling lambat sekitar satu menit setelah Anda menyimpan perubahan di Supabase.

## Persiapan sekali saja

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan seluruh isi file [`bot_settings.sql`](./bot_settings.sql). File tersebut membuat tabel, data awal, dan trigger pembaruan waktu.

Setelah itu, buka **Railway → Variables** dan tambahkan dua koneksi satu kali berikut. Nilainya jangan disimpan di GitHub.

```env
SUPABASE_URL=https://project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key_anda
```

Gunakan key `service_role` dari **Supabase Dashboard → Project Settings → API**. Key ini hanya dipakai oleh bot di Railway dan tidak boleh dibagikan atau dipakai pada aplikasi publik.

## Mengedit pengaturan

Buka **Supabase Dashboard → Table Editor → bot_settings → baris `default`**, lalu edit kolom `settings`. Kolom tersebut berupa JSON.

| Field JSON | Fungsi |
|---|---|
| `bot_name` | Nama bot yang digunakan pada jawaban dan `!help`. |
| `timezone` | Zona waktu, misalnya `Asia/Jakarta`. |
| `private_allowed_lid` | LID satu-satunya yang boleh chat privat dengan bot. |
| `groq_model` | Model Groq aktif. |
| `max_history_turns` | Banyaknya putaran riwayat yang dikirim ke AI; nilai 1–12. |
| `mass_mention_terms` | Kata mention massal yang membuat bot diam di grup. |
| `commands` | Daftar perintah yang ditampilkan oleh `!help`. |

Setiap item dalam `commands` memakai format berikut:

```json
{
  "command": "!perintah",
  "description": "Penjelasan singkat perintah."
}
```

Setelah perubahan disimpan, kirim `!help` ke bot untuk melihat daftar terbaru. Untuk perubahan kode yang benar-benar menambah perilaku baru, daftar `commands` pada Supabase dan katalog perintah di kode harus diperbarui bersamaan.

> Jangan menyimpan `GROQ_API_KEYS`, `GROQ_API_KEY`, `GEOAPIFY_API_KEY`, atau key rahasia lain di tabel `bot_settings`. Simpan key rahasia tetap sebagai Railway Variable. Perintah inti baru seperti `!tempat` otomatis tetap muncul pada `!help` setelah kode bot diperbarui; untuk instalasi baru, entri tersebut sudah ada di `bot_settings.sql`.
