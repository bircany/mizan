-- PostgreSQL enum labels must be committed before an index or constraint can use
-- them. Keep this migration separate from the bounded inventory schema change.
do $$
begin
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'enum_qurbani_pools_status')
    and not exists (
      select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typnamespace = 'public'::regnamespace and t.typname = 'enum_qurbani_pools_status' and e.enumlabel = 'withdrawn'
    ) then
    alter type public.enum_qurbani_pools_status add value 'withdrawn';
  end if;
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'enum_qurbani_videos_status') then
    if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typnamespace='public'::regnamespace and t.typname='enum_qurbani_videos_status' and e.enumlabel='ready_to_send') then
      alter type public.enum_qurbani_videos_status add value 'ready_to_send';
    end if;
    if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typnamespace='public'::regnamespace and t.typname='enum_qurbani_videos_status' and e.enumlabel='superseded') then
      alter type public.enum_qurbani_videos_status add value 'superseded';
    end if;
  end if;
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'enum_qurbani_messages_status')
    and not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typnamespace='public'::regnamespace and t.typname='enum_qurbani_messages_status' and e.enumlabel='paused') then
    alter type public.enum_qurbani_messages_status add value 'paused';
  end if;
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'enum_qurbani_jobs_status') then
    if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typnamespace='public'::regnamespace and t.typname='enum_qurbani_jobs_status' and e.enumlabel='paused') then
      alter type public.enum_qurbani_jobs_status add value 'paused';
    end if;
    if not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typnamespace='public'::regnamespace and t.typname='enum_qurbani_jobs_status' and e.enumlabel='cancelled') then
      alter type public.enum_qurbani_jobs_status add value 'cancelled';
    end if;
  end if;
end;
$$;
