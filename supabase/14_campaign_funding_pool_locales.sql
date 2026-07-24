begin;

alter table public.campaign_funding_pools
  add column if not exists available_locales jsonb not null default '["tr"]'::jsonb;

alter table public.campaign_funding_pools
  drop constraint if exists campaign_funding_pools_available_locales_check;

alter table public.campaign_funding_pools
  add constraint campaign_funding_pools_available_locales_check
  check (
    jsonb_typeof(available_locales) = 'array'
    and available_locales <@ '["tr", "en", "ar"]'::jsonb
    and jsonb_array_length(available_locales) > 0
  );

commit;
