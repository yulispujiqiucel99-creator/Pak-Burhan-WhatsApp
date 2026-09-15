# Profil Pengguna di Supabase

Bot Pak Burhan menggunakan Supabase untuk menyimpan profil pengguna. Pengaturan perilaku bot, daftar perintah, model Gemini, zona waktu, aturan mention, dan Grup Kontrol berada di kode atau environment agar perubahan dapat ditinjau melalui commit.

## Persiapan sekali saja

Migration profil berada di [`migrations/20260815000000_create_profiles.sql`](./migrations/20260815000000_create_profiles.sql). Migration final [`migrations/20260916000000_remove_private_access_for_control_group.sql`](./migrations/20260916000000_remove_private_access_for_control_group.sql) menghapus registry `private_access` dan tabel legacy `jfr_roles`, karena akses admin kini ditentukan langsung oleh `CONTROL_GROUP_JID`. Setelah secret GitHub Actions disiapkan, workflow `.github/workflows/supabase-migrations.yml` akan menjalankan migration ketika didorong ke branch `main`.

> Perintah `drop table if exists public.bot_settings;` bersifat destruktif. Pastikan Anda memang tidak lagi membutuhkan data konfigurasi lama sebelum workflow dijalankan. Jika migration pertama ingin dijalankan manual, tempel isi file migration tersebut ke SQL Editor satu kali.

Setelah itu, buka **Railway → Variables** dan pastikan dua koneksi berikut tersedia. Nilainya jangan disimpan di GitHub atau dikirim melalui chat.

```env
SUPABASE_URL=https://project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key_anda
SUPABASE_SESSION_BUCKET=wa-auth-session
SUPABASE_SESSION_OBJECT=whatsapp-auth.enc
WA_SESSION_ENCRYPTION_KEY=rahasia_acak_panjang
CONTROL_GROUP_JID=120363xxxxxxxx@g.us
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

Data profil tidak dibuka melalui anon key karena tabel menggunakan Row Level Security tanpa policy publik. Bot mengaksesnya memakai `SUPABASE_SERVICE_ROLE_KEY` dari hosting. Akses admin tidak disimpan di Supabase: bot hanya membandingkan JID pesan dengan `CONTROL_GROUP_JID`, sehingga membership grup tidak perlu dipetakan berdasarkan LID atau nomor.

## Otomatisasi migration

Workflow GitHub Actions membutuhkan tiga repository secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, dan `SUPABASE_PROJECT_ID`. Tambahkan melalui **GitHub → Settings → Secrets and variables → Actions**. Jangan menulis nilainya di YAML, README, atau chat.

Workflow hanya berjalan ketika file di `supabase/migrations/**` berubah atau ketika dijalankan manual melalui **GitHub → Actions → Supabase migrations → Run workflow**. Setelah `supabase db push`, workflow menjalankan `supabase migration list` sebagai pemeriksaan riwayat migration.

## Data yang tetap berada di kode

Nilai berikut tetap dikelola melalui kode dan environment Railway, bukan tabel Supabase:

- daftar perintah dan isi `!help`;
- model Gemini dan API key;
- zona waktu WIB;
- JID Grup Kontrol melalui `CONTROL_GROUP_JID`;
- kata mention massal;
- jadwal tidur/bangun, audio, kuota, dan state runtime.

Jangan menyimpan `GEMINI_API_KEYS`, `GEMINI_API_KEY`, `GEOAPIFY_API_KEY`, atau key rahasia lain di Supabase.
