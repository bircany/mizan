-- Mizan Dernegi - campaign cover photo storage
-- Adds Supabase Storage bucket and campaign cover columns.

begin;

alter table public.campaigns
  add column if not exists cover_image_path text,
  add column if not exists cover_image_alt text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campaign-covers',
  'campaign-covers',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
