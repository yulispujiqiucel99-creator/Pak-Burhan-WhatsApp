# Profil Pengguna di Supabase

Bot Pak Burhan menggunakan Supabase hanya untuk menyimpan data kecil profil pengguna. Pengaturan perilaku bot, daftar perintah, model Groq, zona waktu, dan aturan mention sekarang berada di kode GitHub agar perubahan dapat ditinjau melalui commit.

## Persiapan sekali saja

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan seluruh isi file [`migrate_to_profiles.sql`](./migrate_to_profiles.sql). Migrasi tersebut membuat tabel `public.profiles` dan menghapus tabel lama `public.bot_settings` sesuai keputusan proyek.

> Perintah `drop table if exists public.bot_settings;` bersifat destruktif. Pastikan Anda memang tidak lagi membutuhkan data konfigurasi lama sebelum menekan Run.

Setelah itu, buka **Railway → Variables** dan pastikan dua koneksi berikut tersedia. Nilainya jangan disimpan di GitHub atau dikirim melalui chat.

```env
SUPABASE_URL=https://project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key_anda
```

Gunakan key `service_role` dari **Supabase Dashboard → Project Settings → API**. Key ini hanya dipakai oleh bot di Railway dan tidak boleh dibagikan atau digunakan pada aplikasi publik.

## Struktur tabel `profiles`

| Kolom | Fungsi |
|---|---|
| `lid` | Identitas WhatsApp LID pengguna dan primary key. |
| `name` | Nama panggilan pengguna. |
| `gender` | Nilai `male` atau `female` untuk menentukan panggilan Mas/Mbak. |
| `created_at` | Waktu profil dibuat. |
| `updated_at` | Waktu profil terakhir diperbarui. |

Saat pengguna pertama kali mengirim nama dan gender, bot menyimpan profil ke Supabase. Profil juga disalin ke cache lokal agar bot tetap dapat memakai data terakhir ketika Supabase sementara tidak tersedia. Perintah `!profil ulang` atau `!reset profil` menghapus profil dari cache lokal dan Supabase.

Data profil tidak dibuka melalui anon key karena tabel menggunakan Row Level Security tanpa policy publik. Bot mengaksesnya memakai `SUPABASE_SERVICE_ROLE_KEY` dari Railway.

## Data yang tetap berada di kode

Nilai berikut tetap dikelola melalui kode dan environment Railway, bukan tabel Supabase:

- daftar perintah dan isi `!help`;
- model Groq dan API key;
- zona waktu WIB;
- LID privat yang diizinkan;
- kata mention massal;
- jadwal kelas, piket, MBG, audio, kuota, dan state jadwal.

Jangan menyimpan `GROQ_API_KEYS`, `GROQ_API_KEY`, `GEOAPIFY_API_KEY`, atau key rahasia lain di Supabase.
