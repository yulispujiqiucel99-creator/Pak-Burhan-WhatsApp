# Profil Pengguna di Supabase

Bot Pak Burhan menggunakan Supabase untuk menyimpan profil pengguna dan role JFR permanen. Pengaturan perilaku bot, daftar perintah, model Gemini, zona waktu, dan aturan mention sekarang berada di kode GitHub agar perubahan dapat ditinjau melalui commit.

## Persiapan sekali saja

Migration pertama berada di [`migrations/20260815000000_create_profiles.sql`](./migrations/20260815000000_create_profiles.sql), sedangkan tabel role JFR dibuat oleh [`migrations/20260818090000_create_jfr_roles.sql`](./migrations/20260818090000_create_jfr_roles.sql). Setelah secret GitHub Actions disiapkan, workflow `.github/workflows/supabase-migrations.yml` akan menjalankannya ke Supabase ketika migration di-push ke branch `main`. Untuk migrasi pertama yang menghapus tabel lama, pastikan tidak ada data penting yang masih dibutuhkan.

> Perintah `drop table if exists public.bot_settings;` bersifat destruktif. Pastikan Anda memang tidak lagi membutuhkan data konfigurasi lama sebelum workflow dijalankan. Jika migration pertama ingin dijalankan manual, tempel isi file migration tersebut ke SQL Editor satu kali.

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

Data profil dan role JFR tidak dibuka melalui anon key karena tabel menggunakan Row Level Security tanpa policy publik. Bot mengaksesnya memakai `SUPABASE_SERVICE_ROLE_KEY` dari Railway. Role JFR dibaca saat startup, role baru disimpan ke Supabase sebelum akses diberikan, dan pencabutan admin menghapus baris remote.

## Otomatisasi migration

Workflow GitHub Actions membutuhkan tiga repository secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, dan `SUPABASE_PROJECT_ID`. Tambahkan melalui **GitHub → Settings → Secrets and variables → Actions**. Jangan menulis nilainya di YAML, README, atau chat.

Workflow hanya berjalan ketika file di `supabase/migrations/**` berubah atau ketika dijalankan manual melalui **GitHub → Actions → Supabase migrations → Run workflow**. Setelah `supabase db push`, workflow menjalankan `supabase migration list` sebagai pemeriksaan riwayat migration.

## Data yang tetap berada di kode

Nilai berikut tetap dikelola melalui kode dan environment Railway, bukan tabel Supabase:

- daftar perintah dan isi `!help`;
- model Gemini dan API key;
- zona waktu WIB;
- LID privat yang diizinkan;
- kata mention massal;
- jadwal kelas, piket, MBG, audio, kuota, dan state jadwal; role JFR adalah pengecualian dan disimpan di tabel `jfr_roles`.

Jangan menyimpan `GEMINI_API_KEYS`, `GEMINI_API_KEY`, `GEOAPIFY_API_KEY`, atau key rahasia lain di Supabase.
