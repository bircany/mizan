alter table public.qurbani_messages
  alter column status set default 'draft';

create index if not exists qurbani_messages_draft_idx
  on public.qurbani_messages (status, updated_at)
  where status = 'draft';
