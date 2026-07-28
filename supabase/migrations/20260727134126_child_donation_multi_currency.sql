begin;

alter table public.child_donation_settings
  add column usd_campaign_id integer references public.campaigns(id) on delete restrict,
  add column eur_campaign_id integer references public.campaigns(id) on delete restrict,
  add column food_usd_price numeric(12,2),
  add column stationery_usd_price numeric(12,2),
  add column toy_usd_price numeric(12,2),
  add column clothing_usd_price numeric(12,2),
  add column food_eur_price numeric(12,2),
  add column stationery_eur_price numeric(12,2),
  add column toy_eur_price numeric(12,2),
  add column clothing_eur_price numeric(12,2);

alter table public.child_donation_settings
  add constraint child_donation_settings_usd_prices_check check (food_usd_price is null or (food_usd_price >= 0.01 and stationery_usd_price >= 0.01 and toy_usd_price >= 0.01 and clothing_usd_price >= 0.01)),
  add constraint child_donation_settings_eur_prices_check check (food_eur_price is null or (food_eur_price >= 0.01 and stationery_eur_price >= 0.01 and toy_eur_price >= 0.01 and clothing_eur_price >= 0.01));

commit;
