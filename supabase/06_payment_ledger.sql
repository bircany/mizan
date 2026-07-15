begin;

create table if not exists public.payment_ledger_entries (
  id bigint generated always as identity primary key,
  donation_id integer not null references public.donations(id) on delete restrict,
  campaign_id integer not null references public.campaigns(id) on delete restrict,
  refund_request_id integer references public.refund_requests(id) on delete restrict,
  entry_type text not null check (entry_type in ('capture', 'refund', 'cancel')),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('TRY', 'USD', 'EUR', 'GBP')),
  provider_reference text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_ledger_entries_campaign_created_at_idx
  on public.payment_ledger_entries (campaign_id, created_at desc);
create index if not exists payment_ledger_entries_donation_created_at_idx
  on public.payment_ledger_entries (donation_id, created_at desc);
create index if not exists payment_ledger_entries_refund_request_idx
  on public.payment_ledger_entries (refund_request_id)
  where refund_request_id is not null;

create table if not exists public.campaign_financial_totals (
  campaign_id integer primary key references public.campaigns(id) on delete restrict,
  currency text not null check (currency in ('TRY', 'USD', 'EUR', 'GBP')),
  captured_amount numeric(14, 2) not null default 0 check (captured_amount >= 0),
  refunded_amount numeric(14, 2) not null default 0 check (refunded_amount >= 0),
  net_confirmed_amount numeric(14, 2) not null default 0 check (net_confirmed_amount >= 0),
  donor_count integer not null default 0 check (donor_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.payment_ledger_entries enable row level security;
alter table public.campaign_financial_totals enable row level security;

create or replace function public.prevent_payment_ledger_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'payment_ledger_entries is append-only';
end;
$$;

drop trigger if exists payment_ledger_entries_append_only on public.payment_ledger_entries;
create trigger payment_ledger_entries_append_only
before update or delete on public.payment_ledger_entries
for each row execute function public.prevent_payment_ledger_mutation();

create or replace function public.record_payment_ledger_entry(
  p_donation_id integer,
  p_campaign_id integer,
  p_refund_request_id integer,
  p_entry_type text,
  p_amount numeric,
  p_currency text,
  p_provider_reference text,
  p_idempotency_key text,
  p_remove_donor boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted_id bigint;
  v_campaign_currency text;
begin
  if p_entry_type not in ('capture', 'refund', 'cancel') then
    raise exception 'invalid ledger entry type';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'ledger amount must be positive';
  end if;

  select currency::text into v_campaign_currency
  from public.campaigns
  where id = p_campaign_id
  for update;

  if v_campaign_currency is null then
    raise exception 'campaign not found';
  end if;

  if v_campaign_currency <> p_currency then
    raise exception 'campaign and ledger currencies must match';
  end if;

  insert into public.payment_ledger_entries (
    donation_id,
    campaign_id,
    refund_request_id,
    entry_type,
    amount,
    currency,
    provider_reference,
    idempotency_key,
    metadata
  ) values (
    p_donation_id,
    p_campaign_id,
    p_refund_request_id,
    p_entry_type,
    p_amount,
    p_currency,
    p_provider_reference,
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return false;
  end if;

  insert into public.campaign_financial_totals (
    campaign_id,
    currency,
    captured_amount,
    refunded_amount,
    net_confirmed_amount,
    donor_count
  ) values (
    p_campaign_id,
    p_currency,
    case when p_entry_type = 'capture' then p_amount else 0 end,
    case when p_entry_type in ('refund', 'cancel') then p_amount else 0 end,
    case when p_entry_type = 'capture' then p_amount else 0 end - case when p_entry_type in ('refund', 'cancel') then p_amount else 0 end,
    case when p_entry_type = 'capture' then 1 else 0 end - case when p_remove_donor then 1 else 0 end
  )
  on conflict (campaign_id) do update set
    captured_amount = campaign_financial_totals.captured_amount + excluded.captured_amount,
    refunded_amount = campaign_financial_totals.refunded_amount + excluded.refunded_amount,
    net_confirmed_amount = greatest(0, campaign_financial_totals.net_confirmed_amount + excluded.net_confirmed_amount),
    donor_count = greatest(0, campaign_financial_totals.donor_count + excluded.donor_count),
    updated_at = now();

  update public.campaigns
  set
    collected_amount = totals.net_confirmed_amount,
    donor_count = totals.donor_count,
    updated_at = now()
  from public.campaign_financial_totals as totals
  where campaigns.id = p_campaign_id
    and totals.campaign_id = campaigns.id;

  return true;
end;
$$;

revoke all on public.payment_ledger_entries from anon, authenticated;
revoke all on public.campaign_financial_totals from anon, authenticated;
revoke all on function public.record_payment_ledger_entry(integer, integer, integer, text, numeric, text, text, text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.record_payment_ledger_entry(integer, integer, integer, text, numeric, text, text, text, boolean, jsonb) to service_role;

commit;
