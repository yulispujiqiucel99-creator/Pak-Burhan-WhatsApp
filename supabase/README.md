# Profil Pengguna di Supabase

Bot Pak Burhan menggunakan Supabase untuk menyimpan profil pengguna dan registry akses privat permanen. Pengaturan perilaku bot, daftar perintah, model Gemini, zona waktu, dan aturan mention sekarang berada di kode GitHub agar perubahan dapat ditinjau melalui commit.

## Persiapan sekali saja

Migration profil berada di [`migrations/20260815000000_create_profiles.sql`](./migrations/20260815000000_create_profiles.sql). Migration terbaru [`migrations/20260906000000_replace_jfr_with_private_access.sql`](./migrations/20260906000000_replace_jfr_with_private_access.sql) menghapus tabel role lama dan membuat `private_access`. Setelah secret GitHub Actions disiapkan, workflow `.github/workflows/supabase-migrations.yml` akan menjalankan migration ketika didorong ke branch `main`. Migration terbaru memang destruktif terhadap tabel JFR lama, yang sudah tidak dipakai lagi.

> Perintah `drop table if exists public.bot_settings;` bersifat destruktif. Pastikan Anda memang tidak lagi membutuhkan data konfigurasi lama sebelum workflow dijalankan. Jika migration pertama ingin dijalankan manual, tempel isi file migration tersebut ke SQL Editor satu kali.

Setelah itu, buka **Railway → Variables** dan pastikan dua koneksi berikut tersedia. Nilainya jangan disimpan di GitHub atau dikirim melalui chat.

```env
SUPABASE_URL=https://project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key_anda
SUPABASE_SESSION_BUCKET=wa-auth-session
SUPABASE_SESSION_OBJECT=whatsapp-auth.enc
WA_SESSION_ENCRYPTION_KEY=rahasia_acak_panjang
ADMIN_PHONE=628895683942
PRIVATE_INTRO_TEXT=
```

`SUPABASE_SESSION_BUCKET` harus menunjuk bucket Storage private. `WA_SESSION_ENCRYPTION_KEY` hanya disimpan sebagai secret di hosting dan tidak boleh diubah setelah session terenkripsi pertama dibuat. Bot mengenkripsi isi `auth_info` sebelum mengunggah satu objek backup ke bucket tersebut; session tidak disimpan sebagai data mentah di tabel.

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

Data profil dan akses privat tidak dibuka melalui anon key karena tabel menggunakan Row Level Security tanpa policy publik. Bot mengaksesnya memakai `SUPABASE_SERVICE_ROLE_KEY` dari hosting. Tabel `private_access` menyimpan `guest`, `jfr`, atau `admin`, serta waktu intro satu kali dan waktu pemberian akses. Kode verifikasi dikirim ke nomor `ADMIN_PHONE` setelah pengguna mengetik `#JFR`.

## Otomatisasi migration

Workflow GitHub Actions membutuhkan tiga repository secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, dan `SUPABASE_PROJECT_ID`. Tambahkan melalui **GitHub → Settings → Secrets and variables → Actions**. Jangan menulis nilainya di YAML, README, atau chat.

Workflow hanya berjalan ketika file di `supabase/migrations/**` berubah atau ketika dijalankan manual melalui **GitHub → Actions → Supabase migrations → Run workflow**. Setelah `supabase db push`, workflow menjalankan `supabase migration list` sebagai pemeriksaan riwayat migration.

## Data yang tetap berada di kode

Nilai berikut tetap dikelola melalui kode dan environment Railway, bukan tabel Supabase:

- daftar perintah dan isi `!help`;
- model Gemini dan API key;
- zona waktu WIB;
- nomor admin penerima kode verifikasi melalui `ADMIN_PHONE`;
- teks intro privat opsional melalui `PRIVATE_INTRO_TEXT`;
- kata mention massal;
- jadwal kelas, piket, MBG, audio, kuota, dan state jadwal; akses privat adalah pengecualian dan disimpan di tabel `private_access`.

Jangan menyimpan `GEMINI_API_KEYS`, `GEMINI_API_KEY`, `GEOAPIFY_API_KEY`, atau key rahasia lain di Supabase.
