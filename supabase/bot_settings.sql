-- Jalankan sekali di Supabase Dashboard → SQL Editor.
-- API key Groq tidak disimpan di sini; tetap simpan sebagai Railway Variable.

create table if not exists public.bot_settings (
  id text primary key default 'default',
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.bot_settings enable row level security;

-- Tidak ada policy publik. Bot menggunakan service-role key dari Railway,
-- sedangkan pengeditan dilakukan melalui Supabase Dashboard.

insert into public.bot_settings (id, settings)
values (
  'default',
  jsonb_build_object(
    'bot_name', 'Pak Burhan',
    'timezone', 'Asia/Jakarta',
    'private_allowed_lid', '235656601194672',
    'groq_model', 'openai/gpt-oss-120b',
    'max_history_turns', 4,
    'mass_mention_terms', jsonb_build_array('semua', 'everyone', 'all', 'here'),
    'commands', jsonb_build_array(
      jsonb_build_object('command', 'chat biasa', 'description', 'Kirim pertanyaan setelah profil nama dan gender lengkap.'),
      jsonb_build_object('command', '!help / !menu', 'description', 'Menampilkan daftar perintah terbaru.'),
      jsonb_build_object('command', '!cari [pertanyaan]', 'description', 'Mencari informasi di internet sebelum menjawab.'),
      jsonb_build_object('command', '!tempat [jenis/nama] di [lokasi]', 'description', 'Mencari satu tempat dan mengirim satu lokasi yang dapat dibuka di WhatsApp. Contoh: !tempat kafe di Solo.'),
      jsonb_build_object('command', '!gambar [pertanyaan]', 'description', 'Kirim foto dengan caption !gambar untuk dianalisis. Contoh: !gambar tolong jelaskan soal ini.'),
      jsonb_build_object('command', '!jadwal [hari]', 'description', 'Menampilkan pelajaran, piket kelas, dan piket MBG VII D. Contoh: !jadwal senin.'),
      jsonb_build_object('command', '!jadwal aktifkan', 'description', 'Khusus admin di grup kelas: mengaktifkan kirim jadwal otomatis pukul 17.00 dan 20.00 WIB.'),
      jsonb_build_object('command', '!sisa', 'description', 'Menampilkan sisa kuota pertanyaan Anda dan waktu resetnya.'),
      jsonb_build_object('command', '!status', 'description', 'Khusus DM admin: menampilkan status koneksi, layanan, kuota, dan jadwal bot.'),
      jsonb_build_object('command', '!profil ulang', 'description', 'Menghapus nama, gender, dan riwayat chat Anda untuk diisi ulang.'),
      jsonb_build_object('command', 'Tag di grup', 'description', 'Tag bot lalu tulis pertanyaan; bot diam pada @semua atau @everyone.')
    )
  )
)
on conflict (id) do nothing;

create or replace function public.set_bot_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bot_settings_updated_at on public.bot_settings;
create trigger bot_settings_updated_at
before update on public.bot_settings
for each row execute function public.set_bot_settings_updated_at();
