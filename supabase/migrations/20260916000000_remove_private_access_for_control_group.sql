-- Grup Kontrol menggantikan seluruh registry role privat/JFR.
-- Runtime tidak lagi membaca atau menulis tabel-tabel berikut.
drop table if exists public.private_access;
drop table if exists public.jfr_roles;
