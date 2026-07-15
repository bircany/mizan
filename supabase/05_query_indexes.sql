-- Mizan Dernegi - Dashboard, finance ve field queue sorgulari icin bileşik indeksler.

begin;

create index if not exists donations_campaign_status_created_at_idx
  on public.donations (campaign_id, status, created_at desc);

create index if not exists payment_sessions_provider_fraud_created_at_idx
  on public.payment_sessions (provider_status, fraud_status, created_at desc);

create index if not exists payment_events_reference_created_at_idx
  on public.payment_events (reference_id, created_at desc);

create index if not exists field_tasks_assigned_status_due_at_idx
  on public.field_tasks (assigned_to_id, status, due_at asc);

create index if not exists proof_submissions_field_task_status_updated_at_idx
  on public.proof_submissions (field_task_id, status, updated_at desc);

create index if not exists refund_requests_status_created_at_idx
  on public.refund_requests (status, created_at desc);

commit;
