begin;

create type public.enum_contact_messages_type as enum ('contact', 'student');
create type public.enum_contact_messages_status as enum ('unread', 'read', 'archived');
create type public.enum_contact_messages_email_notification_status as enum ('sent', 'failed', 'skipped');

create table public.contact_messages (
  id serial primary key,
  type public.enum_contact_messages_type not null default 'contact',
  name varchar not null,
  email varchar not null,
  phone varchar,
  subject varchar,
  program varchar,
  message varchar,
  privacy_consent boolean not null,
  status public.enum_contact_messages_status not null default 'unread',
  read_at timestamptz,
  read_by_id integer references public.users(id) on delete set null,
  email_notification_status public.enum_contact_messages_email_notification_status,
  updated_at timestamp(3) with time zone not null default now(),
  created_at timestamp(3) with time zone not null default now()
);

create index contact_messages_inbox_idx on public.contact_messages (status, created_at desc);
create index contact_messages_read_by_idx on public.contact_messages (read_by_id) where read_by_id is not null;

alter table public.payload_locked_documents_rels
  add column contact_messages_id integer references public.contact_messages(id) on delete cascade;
create index payload_locked_documents_rels_contact_messages_idx
  on public.payload_locked_documents_rels (contact_messages_id);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant select, insert, update, delete on public.contact_messages to service_role;
grant usage, select on sequence public.contact_messages_id_seq to service_role;

commit;
