-- Mizan Dernegi - Payload tablolarini Supabase Data API erisimine kapatir.
-- Uygulama verisine yalnizca Payload/Postgres server baglantisi ile erisilir.
-- Bilerek policy eklenmez: anon ve authenticated roller varsayilan olarak tum
-- uygulama tablolarinda deny-by-default davranir.

begin;

alter table public.users_sessions enable row level security;
alter table public.users enable row level security;
alter table public.media enable row level security;
alter table public.categories enable row level security;
alter table public.categories_locales enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaigns_locales enable row level security;
alter table public.news enable row level security;
alter table public.news_locales enable row level security;
alter table public.pages enable row level security;
alter table public.pages_locales enable row level security;
alter table public.donation_intents enable row level security;
alter table public.payment_sessions enable row level security;
alter table public.payment_events enable row level security;
alter table public.donations enable row level security;
alter table public.refund_requests enable row level security;
alter table public.field_tasks enable row level security;
alter table public.proof_submissions enable row level security;
alter table public.proof_assets enable row level security;
alter table public.donor_reports enable row level security;
alter table public.donor_reports_rels enable row level security;
alter table public.audit_logs enable row level security;
alter table public.payload_kv enable row level security;
alter table public.payload_locked_documents enable row level security;
alter table public.payload_locked_documents_rels enable row level security;
alter table public.payload_preferences enable row level security;
alter table public.payload_preferences_rels enable row level security;
alter table public.payload_migrations enable row level security;

commit;;
