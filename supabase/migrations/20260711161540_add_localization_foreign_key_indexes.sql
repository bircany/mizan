begin;

-- Payload joins localized content to its parent record through _parent_id.
create index if not exists campaigns_locales_parent_id_idx
  on public.campaigns_locales (_parent_id);
create index if not exists categories_locales_parent_id_idx
  on public.categories_locales (_parent_id);
create index if not exists news_locales_parent_id_idx
  on public.news_locales (_parent_id);
create index if not exists pages_locales_parent_id_idx
  on public.pages_locales (_parent_id);

commit;;
