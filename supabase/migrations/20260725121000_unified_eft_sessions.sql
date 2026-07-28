begin;

create type public.enum_payment_sessions_payment_method
  as enum ('card', 'bank_transfer');
create type public.enum_payment_sessions_eft_review_status
  as enum ('pending', 'approved', 'rejected');

alter table public.payment_sessions
  add column payment_method public.enum_payment_sessions_payment_method
    not null default 'card',
  add column reservation_expires_at timestamptz,
  add column eft_proof_bucket varchar,
  add column eft_proof_path varchar,
  add column eft_review_status public.enum_payment_sessions_eft_review_status,
  add column eft_reviewed_at timestamptz,
  add column eft_reviewed_by_id integer
    references public.users(id) on delete set null;

create index payment_sessions_reservation_expiry_idx
  on public.payment_sessions (reservation_expires_at)
  where reservation_expires_at is not null;
create index payment_sessions_eft_review_idx
  on public.payment_sessions (eft_review_status, created_at)
  where payment_method = 'bank_transfer';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'eft-proofs',
  'eft-proofs',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
