begin;

alter table public.payload_locked_documents_rels
  add column if not exists campaign_funding_pools_id integer;

alter table public.payload_locked_documents_rels
  drop constraint if exists payload_locked_documents_rels_campaign_funding_pools_fk;

alter table public.payload_locked_documents_rels
  add constraint payload_locked_documents_rels_campaign_funding_pools_fk
  foreign key (campaign_funding_pools_id)
  references public.campaign_funding_pools(id)
  on delete cascade;

create index if not exists payload_locked_documents_rels_campaign_funding_pools_id_idx
  on public.payload_locked_documents_rels (campaign_funding_pools_id);

commit;
