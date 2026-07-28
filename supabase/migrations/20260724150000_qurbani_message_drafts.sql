do $$
begin
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'enum_qurbani_messages_status')
    and not exists (
      select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
      where t.typnamespace = 'public'::regnamespace and t.typname = 'enum_qurbani_messages_status' and e.enumlabel = 'draft'
    ) then
    alter type public.enum_qurbani_messages_status add value 'draft' before 'queued';
  end if;
end;
$$;
