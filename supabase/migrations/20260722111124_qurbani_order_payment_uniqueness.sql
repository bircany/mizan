begin;

create unique index if not exists donation_intents_qurbani_order_unique_idx
  on public.donation_intents(qurbani_order_id)
  where qurbani_order_id is not null;

create unique index if not exists donations_qurbani_order_unique_idx
  on public.donations(qurbani_order_id)
  where qurbani_order_id is not null;

commit;
