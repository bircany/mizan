begin;

-- 05 and 06 were applied before this project started recording migrations through MCP.
-- Do not backdate a false migration history: verify their required invariants instead.
do $$
begin
  if to_regclass('public.payment_ledger_entries') is null then
    raise exception 'Missing payment_ledger_entries from pre-MCP hardening';
  end if;

  if to_regclass('public.campaign_financial_totals') is null then
    raise exception 'Missing campaign_financial_totals from pre-MCP hardening';
  end if;

  if to_regclass('public.donations_campaign_status_created_at_idx') is null
    or to_regclass('public.payment_sessions_provider_fraud_created_at_idx') is null
    or to_regclass('public.field_tasks_assigned_status_due_at_idx') is null
    or to_regclass('public.proof_submissions_field_task_status_updated_at_idx') is null
    or to_regclass('public.refund_requests_status_created_at_idx') is null then
    raise exception 'Missing required query indexes from pre-MCP hardening';
  end if;

  if to_regprocedure('public.record_payment_ledger_entry(integer,integer,integer,text,numeric,text,text,text,boolean,jsonb)') is null then
    raise exception 'Missing record_payment_ledger_entry from pre-MCP hardening';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.payment_ledger_entries'::regclass
      and tgname = 'payment_ledger_entries_append_only'
      and not tgisinternal
  ) then
    raise exception 'Missing append-only trigger from pre-MCP hardening';
  end if;
end;
$$;

commit;;
