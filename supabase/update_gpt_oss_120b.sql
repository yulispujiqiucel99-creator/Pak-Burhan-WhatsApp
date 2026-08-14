-- Jalankan sekali di Supabase SQL Editor untuk bot_settings yang sudah ada.
-- Tidak ada API key pada file ini.

update public.bot_settings
set
  settings = jsonb_set(
    coalesce(settings, '{}'::jsonb),
    '{groq_model}',
    '"openai/gpt-oss-120b"'::jsonb,
    true
  ),
  updated_at = now()
where id = 'default';

-- Verifikasi hasil:
select id, settings ->> 'groq_model' as groq_model
from public.bot_settings
where id = 'default';
