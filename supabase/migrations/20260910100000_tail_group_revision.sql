begin;

-- Internal planning price only: never replaces donation snapshots or actual ledger receipts.
alter table public.operation_groups add column tail_unit_price numeric(14,2)
  check (tail_unit_price is null or tail_unit_price > 0);

create table public.operation_group_revisions (
  id bigserial primary key,
  campaign_id integer not null references public.campaigns(id) on delete restrict,
  actor_id integer not null references public.users(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 5 and 1000),
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);
create index operation_group_revisions_campaign_idx on public.operation_group_revisions(campaign_id,id desc);
alter table public.operation_group_revisions enable row level security;
revoke all on public.operation_group_revisions from public, anon, authenticated;
grant select, insert on public.operation_group_revisions to service_role;
grant usage, select on sequence public.operation_group_revisions_id_seq to service_role;

create function private.guard_group_revision_history() returns trigger language plpgsql as $$
begin raise exception 'group revision history is append-only'; end;
$$;
create trigger group_revision_history_immutable before update or delete on public.operation_group_revisions
for each row execute function private.guard_group_revision_history();

-- Also covers alternate CMS/API writes. UPDATE already holds the campaign row lock,
-- the same lock used by reservations, confirmation, refunds and tail revision.
create function private.guard_campaign_group_plan() returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if tg_op = 'UPDATE' then
    if exists(select 1 from public.operation_group_revisions where campaign_id=old.id)
       and (new.status::text in ('active','draft') or new.is_donation_open is true) then
      raise exception 'tail-revised campaign cannot reopen; create a new campaign for new intake';
    end if;
    if (old.pricing_model,old.video_delivery,old.operation_type,old.group_capacity,old.currency)
        is distinct from (new.pricing_model,new.video_delivery,new.operation_type,new.group_capacity,new.currency)
       and (old.confirmed_units + old.reserved_units > 0 or exists(select 1 from public.operation_groups where campaign_id=old.id)) then
      raise exception 'campaign allocation model is locked after operations exist';
    end if;
  end if;
  if new.total_stock is not null and new.total_stock < new.confirmed_units + new.reserved_units then
    raise exception 'stock is below allocated units';
  end if;
  -- Do not make unrelated updates to legacy non-multiple campaigns fail.
  if tg_op = 'INSERT' or (new.total_stock,new.group_capacity,new.video_delivery,new.pricing_model)
      is distinct from (old.total_stock,old.group_capacity,old.video_delivery,old.pricing_model) then
    if new.pricing_model::text='fixed' and new.video_delivery::text='video' and new.total_stock is not null
       and (new.group_capacity is null or new.group_capacity < 1 or mod(new.total_stock,new.group_capacity) <> 0) then
      raise exception 'stock must be a multiple of group capacity';
    end if;
  end if;
  return new;
end;
$$;
create trigger campaign_group_plan_guard before insert or update on public.campaigns
for each row execute function private.guard_campaign_group_plan();
revoke all on function private.guard_campaign_group_plan() from public, anon, authenticated;
revoke all on function private.guard_group_revision_history() from public, anon, authenticated;
commit;
