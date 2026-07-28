begin;

create table public.child_donation_settings (
  id serial primary key,
  campaign_id integer not null references public.campaigns(id) on delete restrict,
  food_price numeric(12,2) not null check (food_price >= 1),
  stationery_price numeric(12,2) not null check (stationery_price >= 1),
  toy_price numeric(12,2) not null check (toy_price >= 1),
  clothing_price numeric(12,2) not null check (clothing_price >= 1),
  updated_at timestamp(3) with time zone not null default now(),
  created_at timestamp(3) with time zone not null default now(),
  constraint child_donation_settings_singleton check (id = 1)
);

alter table public.child_donation_settings enable row level security;
revoke all on public.child_donation_settings from anon, authenticated;
grant select, insert, update, delete on public.child_donation_settings to service_role;
grant usage, select on sequence public.child_donation_settings_id_seq to service_role;

alter table public.payload_locked_documents_rels
  add column child_donation_settings_id integer references public.child_donation_settings(id) on delete cascade;
create index payload_locked_documents_rels_child_donation_settings_idx
  on public.payload_locked_documents_rels (child_donation_settings_id);

commit;
