-- Mizan Dernegi - Supabase storage setup
-- Bu SQL Payload tablolarini olusturmaz.
-- Payload tablolarini uygulama ilk kez Postgres'e baglandiginda kendisi olusturacak.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'receipts',
    'receipts',
    false,
    10485760,
    array['application/pdf']
  ),
  (
    'proof-assets',
    'proof-assets',
    false,
    524288000,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
