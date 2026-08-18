-- Mengunci search_path trigger agar tidak dapat dipengaruhi oleh role pemanggil.
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.set_profiles_updated_at() is 'Memperbarui updated_at profil dengan search_path aman.';

-- Tidak ada policy publik: akses bot tetap menggunakan service-role key.
-- Role JFR tidak memiliki fungsi trigger dan tidak memerlukan perubahan tambahan.
comment on table public.jfr_roles is 'Role JFR permanen berdasarkan WhatsApp LID pengguna Pak Burhan.';
