-- Migrasi Supabase Pak Burhan: profil pengguna menggantikan bot_settings.
-- PERINGATAN: perintah DROP TABLE di bagian akhir bersifat destruktif.
-- Jalankan hanya setelah memastikan tidak ada konfigurasi penting yang masih dibutuhkan dari bot_settings.

create table if not exists public.profiles (
  lid text primary key,
  name text not null check (char_length(name) between 1 and 80),
  gender text not null check (gender in ('male', 'female')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_profiles_updated_at();

-- Kode bot memakai service-role key dari Railway untuk membaca/menulis profil.
-- Tidak dibuat policy publik agar data nama dan gender tidak terbuka melalui anon key.

drop table if exists public.bot_settings;

comment on table public.profiles is 'Profil nama dan gender pengguna Pak Burhan berdasarkan LID WhatsApp.';
comment on column public.profiles.lid is 'WhatsApp LID pengguna; bukan nomor telepon yang ditampilkan ke publik.';
comment on column public.profiles.name is 'Nama panggilan pengguna.';
comment on column public.profiles.gender is 'male atau female untuk menentukan panggilan Mas/Mbak.';
