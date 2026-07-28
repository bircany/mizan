begin;

create type public.enum_refund_requests_reason_v2 as enum (
  'technical_error',
  'wrong_transaction',
  'legal_obligation'
);

alter table public.refund_requests
  alter column reason type public.enum_refund_requests_reason_v2
    using (
      case
        when reason in ('technical_error', 'wrong_transaction', 'legal_obligation')
          then reason
        else 'technical_error'
      end
    )::public.enum_refund_requests_reason_v2,
  add column evidence_bucket varchar,
  add column evidence_path varchar,
  add column evidence_mime_type varchar,
  add column manual_review_required boolean not null default false;

update public.refund_requests
set
  description = coalesce(nullif(btrim(description), ''), 'legacy-test-record'),
  evidence_bucket = 'refund-evidence',
  evidence_path = 'legacy-unavailable',
  evidence_mime_type = 'application/octet-stream';

alter table public.refund_requests
  alter column description set not null,
  alter column evidence_bucket set not null,
  alter column evidence_path set not null,
  alter column evidence_mime_type set not null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'refund-evidence',
  'refund-evidence',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.apply_unified_donation_refund(
  p_donation_id integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_donation public.donations%rowtype;
  v_group record;
  v_message_sent boolean;
begin
  select * into v_donation
  from public.donations
  where id = p_donation_id
  for update;
  if not found then raise exception 'donation not found'; end if;

  select exists (
    select 1
    from public.delivery_messages
    where donation_id = p_donation_id
      and status in ('sending', 'sent', 'delivered', 'read')
  ) into v_message_sent;

  if v_message_sent then
    update public.operation_group_members
    set status = 'action_required', updated_at = now()
    where donation_id = p_donation_id and status = 'confirmed';
    return jsonb_build_object(
      'donationId', p_donation_id,
      'stockReleased', false,
      'manualReviewRequired', true
    );
  end if;

  perform 1
  from public.campaigns
  where id = v_donation.campaign_id
  for update;

  for v_group in
    select group_id, count(*)::integer as member_count
    from public.operation_group_members
    where donation_id = p_donation_id and status = 'confirmed'
    group by group_id
    order by group_id
  loop
    perform 1
    from public.operation_groups
    where id = v_group.group_id
    for update;
    update public.operation_groups
    set
      confirmed_count = greatest(0, confirmed_count - v_group.member_count),
      status = case
        when status in ('video_pending', 'full')
          and confirmed_count - v_group.member_count < capacity
          then 'open'
        else status
      end,
      updated_at = now()
    where id = v_group.group_id;
  end loop;

  update public.operation_group_members
  set status = 'refunded', updated_at = now()
  where donation_id = p_donation_id and status = 'confirmed';

  update public.campaigns
  set
    confirmed_units = greatest(0, confirmed_units - v_donation.quantity),
    updated_at = now()
  where id = v_donation.campaign_id;

  return jsonb_build_object(
    'donationId', p_donation_id,
    'stockReleased', true,
    'manualReviewRequired', false
  );
end;
$$;

revoke all on function private.apply_unified_donation_refund(integer)
  from public, anon, authenticated;
grant execute on function private.apply_unified_donation_refund(integer)
  to service_role;

commit;
