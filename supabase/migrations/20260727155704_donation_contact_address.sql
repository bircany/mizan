begin;
alter table public.donation_intents add column address varchar, add column city varchar, add column country_code varchar;
commit;
