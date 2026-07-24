select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('receipts', 'proof-assets', 'campaign-covers')
order by id;
