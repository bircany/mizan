-- Mizan video operations hardening.
--
-- This migration deliberately extends the existing unified donation tables.
-- It does not create replacement tables or remove historical data.

begin;

-- Existing enum values are retained for backwards compatibility. New values are
-- not used as defaults in this transaction because PostgreSQL only makes an
-- added enum value safely usable after the transaction commits.
alter type public.enum_campaigns_status add value if not exists 'paused';

alter type public.enum_operation_groups_status add value if not exists 'collecting';
alter type public.enum_operation_groups_status add value if not exists 'ready_for_slaughter';
alter type public.enum_operation_groups_status add value if not exists 'scheduled';
alter type public.enum_operation_groups_status add value if not exists 'slaughtered';
alter type public.enum_operation_groups_status add value if not exists 'delivery_started';
alter type public.enum_operation_groups_status add value if not exists 'completed';

alter type public.enum_operation_videos_status add value if not exists 'review_pending';
alter type public.enum_operation_videos_status add value if not exists 'processing_failed';
alter type public.enum_operation_videos_status add value if not exists 'quarantined';
alter type public.enum_operation_videos_status add value if not exists 'expired';
alter type public.enum_operation_videos_status add value if not exists 'deleted';

alter type public.enum_delivery_messages_status add value if not exists 'manual_sent';

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'enum_campaigns_operation_type'
  ) then
    create type public.enum_campaigns_operation_type as enum (
      'standard_video',
      'slaughter_video'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'enum_operation_groups_operation_type'
  ) then
    create type public.enum_operation_groups_operation_type as enum (
      'standard_video',
      'slaughter_video'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'enum_operation_videos_content_review_status'
  ) then
    create type public.enum_operation_videos_content_review_status as enum (
      'pending',
      'approved',
      'rejected'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'enum_operation_videos_version_kind'
  ) then
    create type public.enum_operation_videos_version_kind as enum (
      'initial',
      'replacement',
      'correction'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'enum_delivery_messages_message_type'
  ) then
    create type public.enum_delivery_messages_message_type as enum (
      'normal',
      'correction',
      'code_renewal',
      'test'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'enum_delivery_messages_recipient_role'
  ) then
    create type public.enum_delivery_messages_recipient_role as enum (
      'payer',
      'participant',
      'test'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'enum_delivery_messages_retry_class'
  ) then
    create type public.enum_delivery_messages_retry_class as enum (
      'none',
      'transient',
      'permanent',
      'ambiguous'
    );
  end if;
end
$$;

alter table public.campaigns
  add column if not exists operation_type public.enum_campaigns_operation_type,
  add column if not exists pause_reason varchar,
  add column if not exists paused_at timestamptz,
  add column if not exists paused_by_id integer,
  add column if not exists close_reason varchar,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by_id integer,
  add column if not exists slaughter_script varchar,
  add column if not exists slaughter_script_version integer,
  add column if not exists consent_legal_review_required boolean not null default true;

alter table public.donation_participants
  add column if not exists name_reading_consent boolean not null default false,
  add column if not exists name_reading_consent_text_version varchar,
  add column if not exists name_reading_consent_text_snapshot varchar,
  add column if not exists name_reading_consent_accepted_at timestamptz,
  add column if not exists name_reading_consent_ip varchar,
  add column if not exists third_party_data_authority_consent boolean not null default false,
  add column if not exists third_party_data_authority_text_version varchar,
  add column if not exists third_party_data_authority_text_snapshot varchar,
  add column if not exists third_party_data_authority_accepted_at timestamptz,
  add column if not exists third_party_data_authority_ip varchar;

alter table public.operation_groups
  add column if not exists operation_type public.enum_operation_groups_operation_type,
  add column if not exists capacity_override_original integer,
  add column if not exists capacity_override_reason varchar,
  add column if not exists capacity_override_covered_by_association boolean,
  add column if not exists capacity_overridden_at timestamptz,
  add column if not exists capacity_overridden_by_id integer,
  add column if not exists slaughter_scheduled_at timestamptz,
  add column if not exists slaughter_order integer,
  add column if not exists slaughter_place varchar,
  add column if not exists assigned_operator_id integer,
  add column if not exists field_notes varchar,
  add column if not exists slaughtered_at timestamptz,
  add column if not exists slaughtered_by_id integer,
  add column if not exists slaughter_reverted_at timestamptz,
  add column if not exists slaughter_reverted_by_id integer,
  add column if not exists slaughter_revert_reason varchar,
  add column if not exists slaughter_script_snapshot varchar,
  add column if not exists group_code_confirmation_failures integer not null default 0,
  add column if not exists group_code_locked_until timestamptz,
  add column if not exists active_video_id integer,
  add column if not exists public_link_token_hash varchar,
  add column if not exists access_code_hash varchar,
  add column if not exists access_code_ciphertext varchar,
  add column if not exists access_code_rotated_at timestamptz,
  add column if not exists access_code_rotated_by_id integer,
  add column if not exists access_code_rotation_count integer not null default 0,
  add column if not exists expires_at timestamptz,
  add column if not exists extension_used boolean not null default false,
  add column if not exists extended_at timestamptz,
  add column if not exists extended_by_id integer,
  add column if not exists test_message_video_id integer,
  add column if not exists test_message_fingerprint varchar,
  add column if not exists test_message_passed_at timestamptz,
  add column if not exists test_message_passed_by_id integer,
  add column if not exists test_message_invalidated_at timestamptz,
  add column if not exists dispatch_pause_reason varchar,
  add column if not exists provider_healthy_since timestamptz,
  add column if not exists provider_health_check_count integer not null default 0,
  add column if not exists consecutive_system_failures integer not null default 0;

alter table public.operation_videos
  add column if not exists upload_token_jti varchar,
  add column if not exists upload_nonce_hash varchar,
  add column if not exists upload_token_expires_at timestamptz,
  add column if not exists upload_token_consumed_at timestamptz,
  add column if not exists upload_max_bytes bigint not null default 2147483648,
  add column if not exists detected_mime_type varchar,
  add column if not exists container_format varchar,
  add column if not exists video_codec varchar,
  add column if not exists audio_codec varchar,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists raw_sha256 varchar,
  add column if not exists processed_sha256 varchar,
  add column if not exists technical_metadata jsonb,
  add column if not exists processing_settings_snapshot jsonb,
  add column if not exists watermark_snapshot jsonb,
  add column if not exists closing_card_snapshot jsonb,
  add column if not exists slaughter_script_snapshot varchar,
  add column if not exists field_checklist jsonb not null default '{}'::jsonb,
  add column if not exists field_checked_at timestamptz,
  add column if not exists field_checked_by_id integer,
  add column if not exists review_checklist jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_id integer,
  add column if not exists content_review_status public.enum_operation_videos_content_review_status
    not null default 'pending',
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_failed_at timestamptz,
  add column if not exists last_error_code varchar,
  add column if not exists ffmpeg_log varchar,
  add column if not exists retry_after timestamptz,
  add column if not exists quarantine_until timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists expired_at timestamptz,
  add column if not exists physical_deleted_at timestamptz,
  add column if not exists extension_used boolean not null default false,
  add column if not exists extended_at timestamptz,
  add column if not exists extended_by_id integer,
  add column if not exists version_kind public.enum_operation_videos_version_kind
    not null default 'initial',
  add column if not exists is_active boolean not null default false;

alter table public.delivery_messages
  add column if not exists message_type public.enum_delivery_messages_message_type
    not null default 'normal',
  add column if not exists recipient_role public.enum_delivery_messages_recipient_role,
  add column if not exists normalized_phone varchar,
  add column if not exists body_snapshot varchar,
  add column if not exists message_snapshot jsonb,
  add column if not exists system_payload_snapshot jsonb,
  add column if not exists provider_status varchar,
  add column if not exists provider_payload jsonb,
  add column if not exists retry_class public.enum_delivery_messages_retry_class
    not null default 'none',
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists last_error_code varchar,
  add column if not exists provider_lookup_at timestamptz,
  add column if not exists manual_sent_at timestamptz,
  add column if not exists manual_sent_by_id integer,
  add column if not exists manual_sent_reason varchar,
  add column if not exists is_test boolean not null default false,
  add column if not exists test_number_key varchar,
  add column if not exists test_fingerprint varchar;

-- Foreign keys are introduced without scanning existing live rows. They still
-- protect every new or changed row and can be VALIDATEd during a quiet window.
do $$
declare
  fk record;
begin
  for fk in
    select *
    from (
      values
        ('campaigns_paused_by_fk', 'campaigns', 'paused_by_id', 'users'),
        ('campaigns_closed_by_fk', 'campaigns', 'closed_by_id', 'users'),
        ('operation_groups_capacity_overridden_by_fk', 'operation_groups', 'capacity_overridden_by_id', 'users'),
        ('operation_groups_assigned_operator_fk', 'operation_groups', 'assigned_operator_id', 'users'),
        ('operation_groups_slaughtered_by_fk', 'operation_groups', 'slaughtered_by_id', 'users'),
        ('operation_groups_slaughter_reverted_by_fk', 'operation_groups', 'slaughter_reverted_by_id', 'users'),
        ('operation_groups_access_code_rotated_by_fk', 'operation_groups', 'access_code_rotated_by_id', 'users'),
        ('operation_groups_extended_by_fk', 'operation_groups', 'extended_by_id', 'users'),
        ('operation_groups_active_video_fk', 'operation_groups', 'active_video_id', 'operation_videos'),
        ('operation_groups_test_message_video_fk', 'operation_groups', 'test_message_video_id', 'operation_videos'),
        ('operation_groups_test_message_passed_by_fk', 'operation_groups', 'test_message_passed_by_id', 'users'),
        ('operation_videos_field_checked_by_fk', 'operation_videos', 'field_checked_by_id', 'users'),
        ('operation_videos_reviewed_by_fk', 'operation_videos', 'reviewed_by_id', 'users'),
        ('operation_videos_extended_by_fk', 'operation_videos', 'extended_by_id', 'users'),
        ('delivery_messages_manual_sent_by_fk', 'delivery_messages', 'manual_sent_by_id', 'users')
    ) as values_list(constraint_name, table_name, column_name, referenced_table)
  loop
    if not exists (
      select 1
      from pg_constraint
      where conname = fk.constraint_name
        and conrelid = format('public.%I', fk.table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete set null not valid',
        fk.table_name,
        fk.constraint_name,
        fk.column_name,
        fk.referenced_table
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaigns_video_operation_type_check'
      and conrelid = 'public.campaigns'::regclass
  ) then
    alter table public.campaigns
      add constraint campaigns_video_operation_type_check
      check (video_delivery::text <> 'video' or operation_type is not null)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campaigns_pause_reason_check'
      and conrelid = 'public.campaigns'::regclass
  ) then
    alter table public.campaigns
      add constraint campaigns_pause_reason_check
      check (
        status::text <> 'paused'
        or (
          nullif(btrim(pause_reason), '') is not null
          and paused_at is not null
          and paused_by_id is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campaigns_close_reason_check'
      and conrelid = 'public.campaigns'::regclass
  ) then
    alter table public.campaigns
      add constraint campaigns_close_reason_check
      check (
        status::text <> 'closed'
        or (
          nullif(btrim(close_reason), '') is not null
          and closed_at is not null
          and closed_by_id is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campaigns_slaughter_script_version_check'
      and conrelid = 'public.campaigns'::regclass
  ) then
    alter table public.campaigns
      add constraint campaigns_slaughter_script_version_check
      check (
        slaughter_script_version is null
        or (
          slaughter_script_version > 0
          and nullif(btrim(slaughter_script), '') is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'donation_participants_name_consent_check'
      and conrelid = 'public.donation_participants'::regclass
  ) then
    alter table public.donation_participants
      add constraint donation_participants_name_consent_check
      check (
        not name_reading_consent
        or (
          nullif(btrim(name_reading_consent_text_version), '') is not null
          and nullif(btrim(name_reading_consent_text_snapshot), '') is not null
          and name_reading_consent_accepted_at is not null
          and nullif(btrim(name_reading_consent_ip), '') is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'donation_participants_third_party_authority_check'
      and conrelid = 'public.donation_participants'::regclass
  ) then
    alter table public.donation_participants
      add constraint donation_participants_third_party_authority_check
      check (
        not third_party_data_authority_consent
        or (
          nullif(btrim(third_party_data_authority_text_version), '') is not null
          and nullif(btrim(third_party_data_authority_text_snapshot), '') is not null
          and third_party_data_authority_accepted_at is not null
          and nullif(btrim(third_party_data_authority_ip), '') is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_groups_capacity_override_check'
      and conrelid = 'public.operation_groups'::regclass
  ) then
    alter table public.operation_groups
      add constraint operation_groups_capacity_override_check
      check (
        capacity_override_original is null
        or (
          capacity_override_original > 0
          and capacity is not null
          and capacity <= capacity_override_original
          and capacity >= confirmed_count
          and nullif(btrim(capacity_override_reason), '') is not null
          and capacity_override_covered_by_association is true
          and capacity_overridden_at is not null
          and capacity_overridden_by_id is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_groups_slaughter_lifecycle_check'
      and conrelid = 'public.operation_groups'::regclass
  ) then
    alter table public.operation_groups
      add constraint operation_groups_slaughter_lifecycle_check
      check (
        operation_type is null
        or operation_type::text <> 'slaughter_video'
        or status::text not in (
          'slaughtered',
          'video_pending',
          'video_ready',
          'delivery_started',
          'completed'
        )
        or (
          slaughtered_at is not null
          and slaughtered_by_id is not null
          and nullif(btrim(slaughter_script_snapshot), '') is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_groups_group_code_lock_check'
      and conrelid = 'public.operation_groups'::regclass
  ) then
    alter table public.operation_groups
      add constraint operation_groups_group_code_lock_check
      check (
        group_code_confirmation_failures between 0 and 3
        and (
          group_code_confirmation_failures < 3
          or group_code_locked_until is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_groups_access_code_pair_check'
      and conrelid = 'public.operation_groups'::regclass
  ) then
    alter table public.operation_groups
      add constraint operation_groups_access_code_pair_check
      check (
        (access_code_hash is null) = (access_code_ciphertext is null)
        and access_code_rotation_count >= 0
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_groups_public_link_hash_check'
      and conrelid = 'public.operation_groups'::regclass
  ) then
    alter table public.operation_groups
      add constraint operation_groups_public_link_hash_check
      check (
        public_link_token_hash is null
        or public_link_token_hash ~ '^[0-9a-f]{64}$'
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_groups_extension_once_check'
      and conrelid = 'public.operation_groups'::regclass
  ) then
    alter table public.operation_groups
      add constraint operation_groups_extension_once_check
      check (
        not extension_used
        or (
          extended_at is not null
          and extended_by_id is not null
          and expires_at is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_groups_dispatch_health_check'
      and conrelid = 'public.operation_groups'::regclass
  ) then
    alter table public.operation_groups
      add constraint operation_groups_dispatch_health_check
      check (
        provider_health_check_count >= 0
        and consecutive_system_failures >= 0
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_upload_limits_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_upload_limits_check
      check (
        size_bytes <= 2147483648
        and upload_max_bytes > 0
        and upload_max_bytes <= 2147483648
        and (duration_seconds is null or duration_seconds <= 600)
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_upload_token_window_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_upload_token_window_check
      check (
        upload_token_expires_at is null
        or (
          upload_token_jti is not null
          and upload_nonce_hash is not null
          and upload_token_expires_at > created_at
          and upload_token_expires_at <= created_at + interval '10 minutes'
          and (
            upload_token_consumed_at is null
            or upload_token_consumed_at <= upload_token_expires_at
          )
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_detected_format_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_detected_format_check
      check (
        detected_mime_type is null
        or detected_mime_type in ('video/mp4', 'video/quicktime', 'video/webm')
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_upload_nonce_hash_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_upload_nonce_hash_check
      check (
        upload_nonce_hash is null
        or upload_nonce_hash ~ '^[0-9a-f]{64}$'
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_dimensions_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_dimensions_check
      check (
        (width is null and height is null)
        or (width > 0 and height > 0)
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_raw_sha256_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_raw_sha256_check
      check (raw_sha256 is null or raw_sha256 ~ '^[0-9a-f]{64}$')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_processed_sha256_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_processed_sha256_check
      check (processed_sha256 is null or processed_sha256 ~ '^[0-9a-f]{64}$')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_ready_review_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_ready_review_check
      check (
        status::text <> 'ready'
        or (
          ready_at is not null
          and processed_storage_key is not null
          and processed_sha256 is not null
          and processing_settings_snapshot is not null
          and watermark_snapshot is not null
          and closing_card_snapshot is not null
          and content_review_status::text = 'approved'
          and reviewed_at is not null
          and reviewed_by_id is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'operation_videos_extension_once_check'
      and conrelid = 'public.operation_videos'::regclass
  ) then
    alter table public.operation_videos
      add constraint operation_videos_extension_once_check
      check (
        not extension_used
        or (
          extended_at is not null
          and extended_by_id is not null
          and expires_at is not null
          and physical_deleted_at is null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'delivery_messages_retry_budget_check'
      and conrelid = 'public.delivery_messages'::regclass
  ) then
    alter table public.delivery_messages
      add constraint delivery_messages_retry_budget_check
      check (attempt_count between 0 and 4)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'delivery_messages_manual_sent_check'
      and conrelid = 'public.delivery_messages'::regclass
  ) then
    alter table public.delivery_messages
      add constraint delivery_messages_manual_sent_check
      check (
        status::text <> 'manual_sent'
        or (
          manual_sent_at is not null
          and manual_sent_by_id is not null
          and nullif(btrim(manual_sent_reason), '') is not null
        )
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'delivery_messages_test_type_check'
      and conrelid = 'public.delivery_messages'::regclass
  ) then
    alter table public.delivery_messages
      add constraint delivery_messages_test_type_check
      check (
        (message_type::text = 'test') = is_test
        and (
          not is_test
          or (
            nullif(btrim(test_number_key), '') is not null
            and nullif(btrim(test_fingerprint), '') is not null
          )
        )
      )
      not valid;
  end if;
end
$$;

create index if not exists campaigns_operation_status_idx
  on public.campaigns (operation_type, status)
  where operation_type is not null;

create index if not exists donation_participants_name_consent_idx
  on public.donation_participants (donation_intent_id, name_reading_consent)
  where name_reading_consent is true;

create index if not exists operation_groups_operation_status_idx
  on public.operation_groups (operation_type, status, slaughter_scheduled_at);

create index if not exists operation_groups_assignee_schedule_idx
  on public.operation_groups (assigned_operator_id, slaughter_scheduled_at, id)
  where assigned_operator_id is not null
    and slaughter_scheduled_at is not null
    and slaughtered_at is null;

create unique index if not exists operation_groups_public_link_token_uidx
  on public.operation_groups (public_link_token_hash)
  where public_link_token_hash is not null;

create index if not exists operation_groups_access_expiry_idx
  on public.operation_groups (expires_at, id)
  where expires_at is not null;

create unique index if not exists operation_videos_upload_token_jti_uidx
  on public.operation_videos (upload_token_jti)
  where upload_token_jti is not null;

create unique index if not exists operation_videos_upload_nonce_uidx
  on public.operation_videos (upload_nonce_hash)
  where upload_nonce_hash is not null;

create index if not exists operation_videos_processing_claim_idx
  on public.operation_videos (created_at, id)
  where status = 'uploaded';

create unique index if not exists operation_videos_active_group_uidx
  on public.operation_videos (group_id)
  where is_active is true;

create index if not exists operation_videos_group_checksum_idx
  on public.operation_videos (group_id, raw_sha256)
  where raw_sha256 is not null;

create index if not exists operation_videos_expiry_cleanup_idx
  on public.operation_videos (expires_at, id)
  where expires_at is not null and physical_deleted_at is null;

create index if not exists operation_videos_expired_grace_idx
  on public.operation_videos (expired_at, id)
  where expired_at is not null and physical_deleted_at is null;

create index if not exists operation_videos_quarantine_cleanup_idx
  on public.operation_videos (quarantine_until, id)
  where quarantine_until is not null and physical_deleted_at is null;

create index if not exists delivery_messages_queue_claim_idx
  on public.delivery_messages (scheduled_at, id)
  where status = 'queued'
    and scheduled_at is not null
    and provider_message_id is null;

create index if not exists delivery_messages_retry_claim_idx
  on public.delivery_messages (next_retry_at, id)
  where status = 'queued'
    and next_retry_at is not null
    and provider_message_id is null;

create index if not exists delivery_messages_manual_review_idx
  on public.delivery_messages (last_attempt_at, id)
  where status = 'failed' and manual_sent_at is null;

create index if not exists delivery_messages_test_fingerprint_idx
  on public.delivery_messages (group_id, test_fingerprint)
  where is_test is true and test_fingerprint is not null;

create index if not exists delivery_messages_provider_status_idx
  on public.delivery_messages (provider_status, provider_lookup_at)
  where provider_message_id is not null;

-- The original uniqueness prevented correction/code-renewal/test history for
-- the same video and recipient. Idempotency is enforced by idempotency_key;
-- this remains a lookup index rather than a second business-identity rule.
drop index if exists public.delivery_messages_video_phone_uidx;
create index if not exists delivery_messages_video_phone_idx
  on public.delivery_messages (video_id, recipient_phone_hash);

create or replace function private.prevent_video_consent_snapshot_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if (
    old.name_reading_consent_accepted_at is not null
    or old.name_reading_consent_text_snapshot is not null
  ) and (
    old.name_reading_consent is distinct from new.name_reading_consent
    or old.name_reading_consent_text_version is distinct from new.name_reading_consent_text_version
    or old.name_reading_consent_text_snapshot is distinct from new.name_reading_consent_text_snapshot
    or old.name_reading_consent_accepted_at is distinct from new.name_reading_consent_accepted_at
    or old.name_reading_consent_ip is distinct from new.name_reading_consent_ip
  ) then
    raise exception 'name-reading consent snapshot is immutable';
  end if;

  if (
    old.third_party_data_authority_accepted_at is not null
    or old.third_party_data_authority_text_snapshot is not null
  ) and (
    old.third_party_data_authority_consent is distinct from new.third_party_data_authority_consent
    or old.third_party_data_authority_text_version is distinct from new.third_party_data_authority_text_version
    or old.third_party_data_authority_text_snapshot is distinct from new.third_party_data_authority_text_snapshot
    or old.third_party_data_authority_accepted_at is distinct from new.third_party_data_authority_accepted_at
    or old.third_party_data_authority_ip is distinct from new.third_party_data_authority_ip
  ) then
    raise exception 'third-party data authority consent snapshot is immutable';
  end if;

  return new;
end;
$$;

create or replace function private.prevent_operation_video_snapshot_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.processing_settings_snapshot is not null
    and old.processing_settings_snapshot is distinct from new.processing_settings_snapshot then
    raise exception 'processing settings snapshot is immutable';
  end if;

  if old.watermark_snapshot is not null
    and old.watermark_snapshot is distinct from new.watermark_snapshot then
    raise exception 'watermark snapshot is immutable';
  end if;

  if old.closing_card_snapshot is not null
    and old.closing_card_snapshot is distinct from new.closing_card_snapshot then
    raise exception 'closing card snapshot is immutable';
  end if;

  if old.slaughter_script_snapshot is not null
    and old.slaughter_script_snapshot is distinct from new.slaughter_script_snapshot then
    raise exception 'slaughter script snapshot is immutable';
  end if;

  if old.field_checked_at is not null and (
    old.field_checklist is distinct from new.field_checklist
    or old.field_checked_at is distinct from new.field_checked_at
    or old.field_checked_by_id is distinct from new.field_checked_by_id
  ) then
    raise exception 'completed field checklist is immutable';
  end if;

  if old.reviewed_at is not null and (
    old.review_checklist is distinct from new.review_checklist
    or old.reviewed_at is distinct from new.reviewed_at
    or old.reviewed_by_id is distinct from new.reviewed_by_id
  ) then
    raise exception 'completed video review is immutable';
  end if;

  return new;
end;
$$;

create or replace function private.prevent_delivery_message_snapshot_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  is_retention_redaction boolean;
begin
  is_retention_redaction :=
    old.redacted_at is null
    and new.redacted_at is not null
    and new.recipient_phone is null
    and new.normalized_phone is null
    and new.body is null
    and new.body_snapshot is null
    and new.message_snapshot is null
    and old.system_payload_snapshot is not distinct from new.system_payload_snapshot
    and old.message_type is not distinct from new.message_type
    and old.recipient_phone_hash is not distinct from new.recipient_phone_hash;

  if old.status::text <> 'draft' and not is_retention_redaction and (
    old.recipient_phone is distinct from new.recipient_phone
    or old.body is distinct from new.body
    or old.body_snapshot is distinct from new.body_snapshot
    or old.message_snapshot is distinct from new.message_snapshot
    or old.system_payload_snapshot is distinct from new.system_payload_snapshot
    or old.message_type is distinct from new.message_type
    or old.normalized_phone is distinct from new.normalized_phone
    or old.recipient_phone_hash is distinct from new.recipient_phone_hash
  ) then
    raise exception 'queued delivery message snapshot is immutable';
  end if;

  return new;
end;
$$;

create or replace function private.prevent_audit_log_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception 'audit logs are append-only';
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'donation_participants_consent_immutable'
      and tgrelid = 'public.donation_participants'::regclass
      and not tgisinternal
  ) then
    create trigger donation_participants_consent_immutable
      before update on public.donation_participants
      for each row
      execute function private.prevent_video_consent_snapshot_mutation();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'operation_videos_snapshots_immutable'
      and tgrelid = 'public.operation_videos'::regclass
      and not tgisinternal
  ) then
    create trigger operation_videos_snapshots_immutable
      before update on public.operation_videos
      for each row
      execute function private.prevent_operation_video_snapshot_mutation();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'delivery_messages_snapshots_immutable'
      and tgrelid = 'public.delivery_messages'::regclass
      and not tgisinternal
  ) then
    create trigger delivery_messages_snapshots_immutable
      before update on public.delivery_messages
      for each row
      execute function private.prevent_delivery_message_snapshot_mutation();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'audit_logs_append_only'
      and tgrelid = 'public.audit_logs'::regclass
      and not tgisinternal
  ) then
    create trigger audit_logs_append_only
      before update or delete on public.audit_logs
      for each row
      execute function private.prevent_audit_log_mutation();
  end if;
end
$$;

alter table public.campaigns enable row level security;
alter table public.donation_participants enable row level security;
alter table public.operation_groups enable row level security;
alter table public.operation_videos enable row level security;
alter table public.delivery_messages enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.campaigns from anon, authenticated;
revoke all on public.donation_participants from anon, authenticated;
revoke all on public.operation_groups from anon, authenticated;
revoke all on public.operation_videos from anon, authenticated;
revoke all on public.delivery_messages from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

revoke delete on public.donation_participants from service_role;
revoke delete on public.operation_groups from service_role;
revoke delete on public.operation_videos from service_role;
revoke delete on public.delivery_messages from service_role;
revoke update, delete on public.audit_logs from service_role;

grant select, insert, update on
  public.campaigns,
  public.donation_participants,
  public.operation_groups,
  public.operation_videos,
  public.delivery_messages
to service_role;
grant select, insert on public.audit_logs to service_role;

revoke all on function private.prevent_video_consent_snapshot_mutation()
  from public, anon, authenticated;
revoke all on function private.prevent_operation_video_snapshot_mutation()
  from public, anon, authenticated;
revoke all on function private.prevent_delivery_message_snapshot_mutation()
  from public, anon, authenticated;
revoke all on function private.prevent_audit_log_mutation()
  from public, anon, authenticated;

commit;
