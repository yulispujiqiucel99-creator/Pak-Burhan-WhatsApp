-- Menyimpan role JFR secara permanen di Supabase agar tidak hilang saat Railway redeploy.
create table if not exists public.jfr_roles (
  lid text primary key,
  granted_at timestamptz not null default timezone('utc', now())
);

alter table public.jfr_roles enable row level security;

-- Bot memakai service-role key dari Railway; tidak membuka policy publik.
comment on table public.jfr_roles is 'Role JFR permanen berdasarkan WhatsApp LID pengguna Pak Burhan.';
comment on column public.jfr_roles.lid is 'WhatsApp LID pengguna yang memiliki role JFR.';
comment on column public.jfr_roles.granted_at is 'Waktu UTC ketika role JFR diberikan.';

-- Backfill opsional dijalankan oleh bot dari state lokal lama saat startup.
