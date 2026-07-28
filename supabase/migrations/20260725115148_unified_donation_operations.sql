begin;

-- Payload enum replacements are used instead of ALTER TYPE ... ADD VALUE so the
-- new values can safely be used in the same transactional migration.
create type public.enum_users_role_v2 as enum ('admin', 'field_operator');
alter table public.users alter column role drop default;
alter table public.users
  alter column role type public.enum_users_role_v2
  using (
    case
      when role::text = 'field_operator' then 'field_operator'
      else 'admin'
    end
  )::public.enum_users_role_v2;
drop type public.enum_users_role;
alter type public.enum_users_role_v2 rename to enum_users_role;
alter table public.users alter column role set default 'field_operator'::public.enum_users_role;
alter table public.users add column phone varchar;

create type public.enum_campaigns_pricing_model as enum ('free', 'fixed');
create type public.enum_campaigns_video_delivery as enum ('none', 'video');
create type public.enum_campaigns_status as enum ('draft', 'active', 'closed', 'archived');

alter table public.campaigns
  alter column target_amount drop not null,
  add column pricing_model public.enum_campaigns_pricing_model not null default 'free',
  add column unit_price numeric,
  add column unit_label varchar,
  add column total_stock integer,
  add column reserved_units integer not null default 0,
  add column confirmed_units integer not null default 0,
  add column video_delivery public.enum_campaigns_video_delivery not null default 'none',
  add column group_capacity integer,
  add column participant_required boolean not null default false,
  add column publish_start_at timestamptz,
  add column publish_end_at timestamptz,
  add column message_template varchar,
  add column status public.enum_campaigns_status not null default 'draft';

update public.campaigns
set
  target_amount = greatest(coalesce(target_amount, 0), 1),
  status = case
    when is_donation_open then 'active'
    else 'closed'
  end::public.enum_campaigns_status;

alter table public.campaigns
  add constraint campaigns_pricing_configuration_check check (
    (pricing_model = 'free' and target_amount is not null and target_amount > 0)
    or
    (pricing_model = 'fixed' and unit_price is not null and unit_price > 0 and nullif(btrim(unit_label), '') is not null)
  ),
  add constraint campaigns_total_stock_check check (total_stock is null or total_stock > 0),
  add constraint campaigns_stock_counters_check check (
    reserved_units >= 0
    and confirmed_units >= 0
    and (total_stock is null or reserved_units + confirmed_units <= total_stock)
  ),
  add constraint campaigns_video_configuration_check check (
    video_delivery = 'none'
    or (
      nullif(btrim(message_template), '') is not null
      and (pricing_model = 'free' or (group_capacity is not null and group_capacity > 0))
    )
  ),
  add constraint campaigns_publish_window_check check (
    publish_start_at is null or publish_end_at is null or publish_end_at > publish_start_at
  );

create index campaigns_status_publish_idx
  on public.campaigns (status, publish_start_at, publish_end_at);
create index campaigns_category_status_idx
  on public.campaigns (category_id, status);

create type public.enum_donation_intents_status_v2 as enum (
  'draft',
  'reserved',
  'payment_initialized',
  'awaiting_bank_transfer',
  'bank_transfer_submitted',
  'callback_received',
  'completed',
  'failed',
  'expired',
  'cancelled'
);
alter table public.donation_intents alter column status drop default;
alter table public.donation_intents
  alter column status type public.enum_donation_intents_status_v2
  using status::text::public.enum_donation_intents_status_v2;
drop type public.enum_donation_intents_status;
alter type public.enum_donation_intents_status_v2 rename to enum_donation_intents_status;
alter table public.donation_intents
  alter column status set default 'draft'::public.enum_donation_intents_status;

create type public.enum_donation_intents_payment_method as enum ('card', 'bank_transfer');
alter table public.donation_intents
  add column quantity integer not null default 1,
  add column unit_price_snapshot numeric,
  add column payment_method public.enum_donation_intents_payment_method not null default 'card',
  add column reservation_expires_at timestamptz,
  add constraint donation_intents_quantity_check check (quantity > 0),
  add constraint donation_intents_unit_price_snapshot_check check (
    unit_price_snapshot is null or unit_price_snapshot > 0
  );
create index donation_intents_reservation_expiry_idx
  on public.donation_intents (reservation_expires_at)
  where status in ('reserved', 'payment_initialized', 'awaiting_bank_transfer', 'bank_transfer_submitted');

create type public.enum_donations_payment_method as enum ('card', 'bank_transfer');
alter table public.donations
  add column donation_intent_id integer,
  add column quantity integer not null default 1,
  add column unit_price_snapshot numeric,
  add column payment_method public.enum_donations_payment_method not null default 'card',
  add column confirmed_at timestamptz,
  add constraint donations_donation_intent_fk
    foreign key (donation_intent_id) references public.donation_intents(id) on delete restrict,
  add constraint donations_quantity_check check (quantity > 0),
  add constraint donations_unit_price_snapshot_check check (
    unit_price_snapshot is null or unit_price_snapshot > 0
  );
create unique index donations_donation_intent_uidx
  on public.donations (donation_intent_id)
  where donation_intent_id is not null;
create index donations_confirmed_at_idx on public.donations (confirmed_at);

create table public.donation_participants (
  id serial primary key,
  donation_intent_id integer not null references public.donation_intents(id) on delete cascade,
  donation_id integer references public.donations(id) on delete set null,
  order_index integer not null check (order_index > 0),
  name varchar not null,
  phone varchar,
  effective_phone varchar not null,
  is_payer boolean not null default false,
  contact_consent boolean not null default false,
  proxy_consent boolean not null default false,
  updated_at timestamp(3) with time zone not null default now(),
  created_at timestamp(3) with time zone not null default now(),
  unique (donation_intent_id, order_index)
);
create index donation_participants_donation_idx
  on public.donation_participants (donation_id)
  where donation_id is not null;

create type public.enum_operation_groups_status as enum (
  'open', 'full', 'video_pending', 'video_ready', 'notified', 'closed', 'action_required'
);
create type public.enum_operation_groups_dispatch_state as enum (
  'idle', 'countdown', 'queued', 'sending', 'paused', 'completed', 'cancelled', 'failed'
);
create table public.operation_groups (
  id serial primary key,
  campaign_id integer not null references public.campaigns(id) on delete restrict,
  code varchar not null unique,
  year integer not null check (year >= 2020),
  ordinal integer not null check (ordinal > 0),
  capacity integer check (capacity is null or capacity > 0),
  reserved_count integer not null default 0 check (reserved_count >= 0),
  confirmed_count integer not null default 0 check (confirmed_count >= 0),
  status public.enum_operation_groups_status not null default 'open',
  message_template varchar not null,
  dispatch_state public.enum_operation_groups_dispatch_state not null default 'idle',
  dispatch_locked_at timestamptz,
  dispatch_locked_by varchar,
  updated_at timestamp(3) with time zone not null default now(),
  created_at timestamp(3) with time zone not null default now(),
  constraint operation_groups_capacity_counters_check check (
    capacity is null or reserved_count + confirmed_count <= capacity
  ),
  unique (year, ordinal)
);
create index operation_groups_campaign_status_idx
  on public.operation_groups (campaign_id, status, ordinal);
create index operation_groups_dispatch_idx
  on public.operation_groups (dispatch_state, dispatch_locked_at);
create unique index operation_groups_free_campaign_uidx
  on public.operation_groups (campaign_id)
  where capacity is null;

create type public.enum_operation_group_members_status as enum (
  'reserved', 'confirmed', 'released', 'refunded', 'action_required'
);
create table public.operation_group_members (
  id serial primary key,
  group_id integer not null references public.operation_groups(id) on delete restrict,
  donation_intent_id integer not null references public.donation_intents(id) on delete restrict,
  donation_id integer references public.donations(id) on delete restrict,
  participant_id integer references public.donation_participants(id) on delete restrict,
  member_key varchar not null unique,
  unit_index integer not null check (unit_index > 0),
  status public.enum_operation_group_members_status not null default 'reserved',
  reservation_expires_at timestamptz not null,
  confirmed_at timestamptz,
  updated_at timestamp(3) with time zone not null default now(),
  created_at timestamp(3) with time zone not null default now(),
  unique (donation_intent_id, unit_index)
);
create index operation_group_members_group_status_idx
  on public.operation_group_members (group_id, status);
create index operation_group_members_donation_idx
  on public.operation_group_members (donation_id)
  where donation_id is not null;
create unique index operation_group_members_participant_uidx
  on public.operation_group_members (participant_id)
  where participant_id is not null;
create index operation_group_members_expiry_idx
  on public.operation_group_members (reservation_expires_at)
  where status = 'reserved';

create type public.enum_operation_videos_status as enum (
  'uploading', 'uploaded', 'processing', 'ready', 'superseded', 'rejected', 'failed'
);
create table public.operation_videos (
  id serial primary key,
  group_id integer not null references public.operation_groups(id) on delete restrict,
  uploaded_by_id integer not null references public.users(id) on delete restrict,
  upload_id varchar not null unique,
  raw_storage_key varchar not null,
  processed_storage_key varchar,
  thumbnail_storage_key varchar,
  original_filename varchar not null,
  mime_type varchar not null,
  size_bytes bigint not null check (size_bytes > 0),
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  status public.enum_operation_videos_status not null default 'uploading',
  version integer not null default 1 check (version > 0),
  replaces_video_id integer references public.operation_videos(id) on delete restrict,
  ready_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error varchar,
  raw_delete_after timestamptz not null,
  processed_delete_after timestamptz not null,
  updated_at timestamp(3) with time zone not null default now(),
  created_at timestamp(3) with time zone not null default now(),
  unique (group_id, version)
);
create index operation_videos_group_status_idx
  on public.operation_videos (group_id, status);
create index operation_videos_uploaded_by_idx on public.operation_videos (uploaded_by_id);
create index operation_videos_replaces_idx
  on public.operation_videos (replaces_video_id)
  where replaces_video_id is not null;
create index operation_videos_raw_retention_idx
  on public.operation_videos (raw_delete_after)
  where raw_storage_key is not null;
create index operation_videos_processed_retention_idx
  on public.operation_videos (processed_delete_after)
  where processed_storage_key is not null;

create type public.enum_delivery_messages_status as enum (
  'draft', 'countdown', 'queued', 'paused', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled'
);
create table public.delivery_messages (
  id serial primary key,
  group_id integer not null references public.operation_groups(id) on delete restrict,
  video_id integer not null references public.operation_videos(id) on delete restrict,
  donation_id integer references public.donations(id) on delete restrict,
  participant_id integer references public.donation_participants(id) on delete restrict,
  member_id integer references public.operation_group_members(id) on delete restrict,
  recipient_phone varchar,
  recipient_phone_hash varchar not null,
  body varchar,
  idempotency_key varchar not null unique,
  status public.enum_delivery_messages_status not null default 'draft',
  dispatch_batch_id varchar,
  scheduled_at timestamptz,
  locked_at timestamptz,
  locked_by varchar,
  provider_message_id varchar,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error varchar,
  access_token_digest varchar not null unique,
  expires_at timestamptz not null,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  redacted_at timestamptz,
  updated_at timestamp(3) with time zone not null default now(),
  created_at timestamp(3) with time zone not null default now()
);
create index delivery_messages_group_status_idx
  on public.delivery_messages (group_id, status, scheduled_at);
create index delivery_messages_video_idx on public.delivery_messages (video_id);
create index delivery_messages_donation_idx
  on public.delivery_messages (donation_id)
  where donation_id is not null;
create index delivery_messages_participant_idx
  on public.delivery_messages (participant_id)
  where participant_id is not null;
create index delivery_messages_member_idx
  on public.delivery_messages (member_id)
  where member_id is not null;
create index delivery_messages_provider_idx
  on public.delivery_messages (provider_message_id)
  where provider_message_id is not null;
create index delivery_messages_redaction_idx
  on public.delivery_messages (sent_at)
  where redacted_at is null and sent_at is not null;
create unique index delivery_messages_video_phone_uidx
  on public.delivery_messages (video_id, recipient_phone_hash);

alter table public.payload_locked_documents_rels
  add column donation_participants_id integer references public.donation_participants(id) on delete cascade,
  add column operation_groups_id integer references public.operation_groups(id) on delete cascade,
  add column operation_group_members_id integer references public.operation_group_members(id) on delete cascade,
  add column operation_videos_id integer references public.operation_videos(id) on delete cascade,
  add column delivery_messages_id integer references public.delivery_messages(id) on delete cascade;
create index payload_locked_documents_rels_donation_participants_idx
  on public.payload_locked_documents_rels (donation_participants_id);
create index payload_locked_documents_rels_operation_groups_idx
  on public.payload_locked_documents_rels (operation_groups_id);
create index payload_locked_documents_rels_operation_group_members_idx
  on public.payload_locked_documents_rels (operation_group_members_id);
create index payload_locked_documents_rels_operation_videos_idx
  on public.payload_locked_documents_rels (operation_videos_id);
create index payload_locked_documents_rels_delivery_messages_idx
  on public.payload_locked_documents_rels (delivery_messages_id);

alter table public.donation_participants enable row level security;
alter table public.operation_groups enable row level security;
alter table public.operation_group_members enable row level security;
alter table public.operation_videos enable row level security;
alter table public.delivery_messages enable row level security;

revoke all on public.donation_participants from anon, authenticated;
revoke all on public.operation_groups from anon, authenticated;
revoke all on public.operation_group_members from anon, authenticated;
revoke all on public.operation_videos from anon, authenticated;
revoke all on public.delivery_messages from anon, authenticated;
grant select, insert, update, delete on
  public.donation_participants,
  public.operation_groups,
  public.operation_group_members,
  public.operation_videos,
  public.delivery_messages
to service_role;
grant usage, select on sequence
  public.donation_participants_id_seq,
  public.operation_groups_id_seq,
  public.operation_group_members_id_seq,
  public.operation_videos_id_seq,
  public.delivery_messages_id_seq
to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.next_operation_group_identity(p_year integer)
returns table (ordinal integer, code text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_year < 2020 or p_year > 9999 then
    raise exception 'invalid operation year';
  end if;

  perform pg_advisory_xact_lock(hashtext('operation-group-year:' || p_year::text));

  select coalesce(max(g.ordinal), 0) + 1
    into ordinal
  from public.operation_groups g
  where g.year = p_year;

  code := format('MD-%s-%s', p_year, lpad(ordinal::text, 4, '0'));
  return next;
end;
$$;

create or replace function private.reserve_unified_donation(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent_id integer := nullif(p_input ->> 'intentId', '')::integer;
  v_campaign_id integer := nullif(p_input ->> 'campaignId', '')::integer;
  v_quantity integer := nullif(p_input ->> 'quantity', '')::integer;
  v_expires_at timestamptz := nullif(p_input ->> 'reservationExpiresAt', '')::timestamptz;
  v_participant_ids integer[] := array(
    select value::integer
    from jsonb_array_elements_text(coalesce(p_input -> 'participantIds', '[]'::jsonb))
  );
  v_campaign public.campaigns%rowtype;
  v_intent public.donation_intents%rowtype;
  v_group_id integer;
  v_group_capacity integer;
  v_available integer;
  v_take integer;
  v_unit integer := 1;
  v_offset integer;
  v_member_id integer;
  v_identity record;
  v_group_ids integer[] := '{}'::integer[];
  v_member_ids integer[] := '{}'::integer[];
  v_participant_id integer;
begin
  if v_intent_id is null or v_campaign_id is null or v_quantity is null or v_quantity < 1 then
    raise exception 'intentId, campaignId and positive quantity are required';
  end if;
  if v_expires_at is null or v_expires_at <= now() then
    raise exception 'reservationExpiresAt must be in the future';
  end if;

  select * into v_intent
  from public.donation_intents
  where id = v_intent_id
  for update;
  if not found or v_intent.campaign_id <> v_campaign_id then
    raise exception 'donation intent not found for campaign';
  end if;
  if v_intent.status <> 'draft' then
    raise exception 'donation intent is not reservable';
  end if;

  select * into v_campaign
  from public.campaigns
  where id = v_campaign_id
  for update;
  if not found or v_campaign.status <> 'active' then
    raise exception 'campaign is not active';
  end if;
  if v_campaign.publish_start_at is not null and v_campaign.publish_start_at > now() then
    raise exception 'campaign has not started';
  end if;
  if v_campaign.publish_end_at is not null and v_campaign.publish_end_at <= now() then
    raise exception 'campaign has ended';
  end if;
  if v_intent.currency::text <> v_campaign.currency::text then
    raise exception 'intent and campaign currencies do not match';
  end if;

  if v_campaign.pricing_model = 'free' then
    if v_quantity <> 1 or v_intent.amount <= 0 then
      raise exception 'free donations require quantity 1 and a positive amount';
    end if;
  elsif v_intent.amount <> v_campaign.unit_price * v_quantity then
    raise exception 'fixed donation amount does not match current unit price';
  end if;

  if v_campaign.total_stock is not null
     and v_campaign.reserved_units + v_campaign.confirmed_units + v_quantity > v_campaign.total_stock then
    raise exception 'campaign stock is insufficient';
  end if;

  if v_campaign.participant_required then
    if coalesce(array_length(v_participant_ids, 1), 0) <> v_quantity then
      raise exception 'one participant is required for each unit';
    end if;
    if (
      select count(*)
      from public.donation_participants p
      where p.donation_intent_id = v_intent_id
        and p.id = any(v_participant_ids)
    ) <> v_quantity then
      raise exception 'participant list does not belong to donation intent';
    end if;
  end if;

  if v_campaign.video_delivery = 'video' then
    if v_campaign.pricing_model = 'free' then
      select id into v_group_id
      from public.operation_groups
      where campaign_id = v_campaign_id and capacity is null
      for update;

      if v_group_id is null then
        select * into v_identity from private.next_operation_group_identity(extract(year from now())::integer);
        insert into public.operation_groups (
          campaign_id, code, year, ordinal, capacity, message_template
        ) values (
          v_campaign_id, v_identity.code, extract(year from now())::integer,
          v_identity.ordinal, null, v_campaign.message_template
        )
        returning id into v_group_id;
      end if;

      v_participant_id := case when array_length(v_participant_ids, 1) >= 1 then v_participant_ids[1] else null end;
      insert into public.operation_group_members (
        group_id, donation_intent_id, participant_id, member_key, unit_index, reservation_expires_at
      ) values (
        v_group_id, v_intent_id, v_participant_id, v_intent_id::text || ':1', 1, v_expires_at
      )
      returning id into v_member_id;
      update public.operation_groups
      set reserved_count = reserved_count + 1, updated_at = now()
      where id = v_group_id;
      v_group_ids := array_append(v_group_ids, v_group_id);
      v_member_ids := array_append(v_member_ids, v_member_id);
    else
      v_group_capacity := v_campaign.group_capacity;
      while v_unit <= v_quantity loop
        select id, capacity - reserved_count - confirmed_count
          into v_group_id, v_available
        from public.operation_groups
        where campaign_id = v_campaign_id
          and capacity is not null
          and status = 'open'
          and reserved_count + confirmed_count < capacity
        order by ordinal
        limit 1
        for update;

        if v_group_id is null then
          select * into v_identity from private.next_operation_group_identity(extract(year from now())::integer);
          insert into public.operation_groups (
            campaign_id, code, year, ordinal, capacity, message_template
          ) values (
            v_campaign_id, v_identity.code, extract(year from now())::integer,
            v_identity.ordinal, v_group_capacity, v_campaign.message_template
          )
          returning id into v_group_id;
          v_available := v_group_capacity;
        end if;

        v_take := least(v_available, v_quantity - v_unit + 1);
        for v_offset in 0..v_take - 1 loop
          v_participant_id := case
            when array_length(v_participant_ids, 1) >= v_unit + v_offset
              then v_participant_ids[v_unit + v_offset]
            else null
          end;
          insert into public.operation_group_members (
            group_id, donation_intent_id, participant_id, member_key, unit_index, reservation_expires_at
          ) values (
            v_group_id, v_intent_id, v_participant_id,
            v_intent_id::text || ':' || (v_unit + v_offset)::text,
            v_unit + v_offset, v_expires_at
          )
          returning id into v_member_id;
          v_member_ids := array_append(v_member_ids, v_member_id);
        end loop;

        update public.operation_groups
        set
          reserved_count = reserved_count + v_take,
          status = case
            when reserved_count + confirmed_count + v_take >= capacity then 'full'
            else status
          end,
          updated_at = now()
        where id = v_group_id;

        if not v_group_id = any(v_group_ids) then
          v_group_ids := array_append(v_group_ids, v_group_id);
        end if;
        v_unit := v_unit + v_take;
        v_group_id := null;
      end loop;
    end if;
  end if;

  update public.campaigns
  set reserved_units = reserved_units + v_quantity, updated_at = now()
  where id = v_campaign_id;

  update public.donation_intents
  set
    quantity = v_quantity,
    unit_price_snapshot = case when v_campaign.pricing_model = 'fixed' then v_campaign.unit_price else null end,
    reservation_expires_at = v_expires_at,
    status = 'reserved',
    updated_at = now()
  where id = v_intent_id;

  return jsonb_build_object(
    'intentId', v_intent_id,
    'campaignId', v_campaign_id,
    'quantity', v_quantity,
    'reservationExpiresAt', v_expires_at,
    'groupIds', to_jsonb(v_group_ids),
    'memberIds', to_jsonb(v_member_ids)
  );
end;
$$;

create or replace function private.confirm_unified_donation(
  p_intent_id integer,
  p_donation_id integer,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent public.donation_intents%rowtype;
  v_donation public.donations%rowtype;
  v_group record;
begin
  select * into v_intent from public.donation_intents where id = p_intent_id for update;
  if not found then raise exception 'donation intent not found'; end if;

  select * into v_donation from public.donations where id = p_donation_id for update;
  if not found or v_donation.donation_intent_id <> p_intent_id then
    raise exception 'donation does not belong to intent';
  end if;

  if v_intent.status = 'completed' then
    return jsonb_build_object('intentId', p_intent_id, 'donationId', p_donation_id, 'confirmed', false);
  end if;
  if v_intent.status not in ('reserved', 'payment_initialized', 'awaiting_bank_transfer', 'bank_transfer_submitted', 'callback_received') then
    raise exception 'donation intent is not confirmable';
  end if;

  perform 1 from public.campaigns where id = v_intent.campaign_id for update;

  for v_group in
    select group_id, count(*)::integer as member_count
    from public.operation_group_members
    where donation_intent_id = p_intent_id and status = 'reserved'
    group by group_id
    order by group_id
  loop
    perform 1 from public.operation_groups where id = v_group.group_id for update;
    update public.operation_groups
    set
      reserved_count = greatest(0, reserved_count - v_group.member_count),
      confirmed_count = confirmed_count + v_group.member_count,
      status = case
        when capacity is not null and confirmed_count + v_group.member_count >= capacity then 'video_pending'
        else status
      end,
      updated_at = now()
    where id = v_group.group_id;
  end loop;

  update public.operation_group_members
  set donation_id = p_donation_id, status = 'confirmed', confirmed_at = now(), updated_at = now()
  where donation_intent_id = p_intent_id and status = 'reserved';
  update public.donation_participants
  set donation_id = p_donation_id, updated_at = now()
  where donation_intent_id = p_intent_id;
  update public.campaigns
  set
    reserved_units = greatest(0, reserved_units - v_intent.quantity),
    confirmed_units = confirmed_units + v_intent.quantity,
    updated_at = now()
  where id = v_intent.campaign_id;
  update public.donation_intents
  set status = 'completed', updated_at = now()
  where id = p_intent_id;

  insert into public.audit_logs (action, actor_email, target_collection, target_id, details)
  values (
    'donation.confirmed',
    nullif(p_actor, ''),
    'donations',
    p_donation_id::text,
    jsonb_build_object('intentId', p_intent_id, 'campaignId', v_intent.campaign_id)
  );

  return jsonb_build_object('intentId', p_intent_id, 'donationId', p_donation_id, 'confirmed', true);
end;
$$;

create or replace function private.release_unified_donation_reservation(
  p_intent_id bigint,
  p_reason text default 'released'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent public.donation_intents%rowtype;
  v_group record;
  v_released integer := 0;
begin
  select * into v_intent
  from public.donation_intents
  where id = p_intent_id
  for update;
  if not found then raise exception 'donation intent not found'; end if;

  if v_intent.status in ('completed', 'expired', 'cancelled') then
    return jsonb_build_object('intentId', p_intent_id, 'released', 0, 'idempotent', true);
  end if;

  perform 1 from public.campaigns where id = v_intent.campaign_id for update;
  for v_group in
    select group_id, count(*)::integer as member_count
    from public.operation_group_members
    where donation_intent_id = p_intent_id and status = 'reserved'
    group by group_id
    order by group_id
  loop
    perform 1 from public.operation_groups where id = v_group.group_id for update;
    update public.operation_groups
    set
      reserved_count = greatest(0, reserved_count - v_group.member_count),
      status = case
        when status = 'full' and confirmed_count + reserved_count - v_group.member_count < capacity then 'open'
        else status
      end,
      updated_at = now()
    where id = v_group.group_id;
    v_released := v_released + v_group.member_count;
  end loop;

  update public.operation_group_members
  set status = 'released', updated_at = now()
  where donation_intent_id = p_intent_id and status = 'reserved';
  update public.campaigns
  set reserved_units = greatest(0, reserved_units - v_intent.quantity), updated_at = now()
  where id = v_intent.campaign_id;
  update public.donation_intents
  set
    status = case
      when p_reason = 'expired' then 'expired'::public.enum_donation_intents_status
      else 'cancelled'::public.enum_donation_intents_status
    end,
    updated_at = now()
  where id = p_intent_id;

  return jsonb_build_object(
    'intentId', p_intent_id,
    'released', greatest(v_released, v_intent.quantity),
    'reason', coalesce(nullif(p_reason, ''), 'released'),
    'idempotent', false
  );
end;
$$;

create or replace function private.expire_donation_reservations()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent_id integer;
  v_count integer := 0;
begin
  for v_intent_id in
    select id
    from public.donation_intents
    where reservation_expires_at <= now()
      and status in ('reserved', 'payment_initialized', 'awaiting_bank_transfer', 'bank_transfer_submitted')
    order by id
    for update skip locked
  loop
    perform private.release_unified_donation_reservation(v_intent_id, 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.next_operation_group_identity(integer) from public, anon, authenticated;
revoke all on function private.reserve_unified_donation(jsonb) from public, anon, authenticated;
revoke all on function private.confirm_unified_donation(integer, integer, text) from public, anon, authenticated;
revoke all on function private.release_unified_donation_reservation(bigint, text) from public, anon, authenticated;
revoke all on function private.expire_donation_reservations() from public, anon, authenticated;
grant execute on function private.reserve_unified_donation(jsonb) to service_role;
grant execute on function private.confirm_unified_donation(integer, integer, text) to service_role;
grant execute on function private.release_unified_donation_reservation(bigint, text) to service_role;
grant execute on function private.expire_donation_reservations() to service_role;

commit;
