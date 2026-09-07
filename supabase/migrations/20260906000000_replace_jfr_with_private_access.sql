-- Replace the legacy JFR-only table with a unified private access registry.
drop table if exists public.jfr_roles;

create table if not exists public.private_access (
  lid text primary key,
  role text not null check (role in ('guest', 'jfr', 'admin')),
  intro_sent_at timestamptz,
  granted_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.private_access enable row level security;

comment on table public.private_access is 'Private WhatsApp access registry: one-time intro tracking and admin/JFR roles.';
comment on column public.private_access.lid is 'Normalized WhatsApp LID.';
comment on column public.private_access.role is 'guest, jfr, or admin.';
comment on column public.private_access.intro_sent_at is 'Timestamp of the one-time private intro message.';
comment on column public.private_access.granted_at is 'Timestamp when admin or JFR access was granted.';
