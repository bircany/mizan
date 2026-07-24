begin;

alter table public.news
  add column if not exists available_locales jsonb not null default '["tr"]'::jsonb;

alter table public.news
  drop constraint if exists news_available_locales_check;

alter table public.news
  add constraint news_available_locales_check
  check (
    jsonb_typeof(available_locales) = 'array'
    and jsonb_array_length(available_locales) > 0
    and available_locales <@ '["tr", "en", "ar"]'::jsonb
  );

update public.news as news
set available_locales = coalesce(
  (
    select jsonb_agg(
      locales._locale
      order by case locales._locale
        when 'tr' then 1
        when 'en' then 2
        when 'ar' then 3
        else 4
      end
    )
    from public.news_locales as locales
    where locales._parent_id = news.id
      and locales._locale in ('tr', 'en', 'ar')
      and nullif(btrim(locales.title), '') is not null
  ),
  '["tr"]'::jsonb
);

commit;
