begin;

create index if not exists payment_sessions_eft_reviewed_by_idx
  on public.payment_sessions (eft_reviewed_by_id)
  where eft_reviewed_by_id is not null;

create index if not exists news_categories_locales_parent_idx
  on public.news_categories_locales (_parent_id);

commit;
