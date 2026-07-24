begin;

create or replace function private.qurbani_claim_job(
  p_worker_id text,
  p_job_type public.enum_qurbani_jobs_type default 'process_video'
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_job_id integer;
begin
  if nullif(btrim(p_worker_id), '') is null then
    raise exception 'Worker id is required';
  end if;

  select id into v_job_id
  from public.qurbani_jobs
  where type = p_job_type
    and status in ('queued', 'failed')
    and run_at <= now()
    and attempt_count < max_attempts
  order by run_at, id
  for update skip locked
  limit 1;

  if v_job_id is null then return null; end if;

  update public.qurbani_jobs
  set status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  where id = v_job_id;

  return v_job_id;
end;
$$;

revoke all on function private.qurbani_claim_job(text, public.enum_qurbani_jobs_type) from public;
revoke all on function private.qurbani_claim_job(text, public.enum_qurbani_jobs_type) from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function private.qurbani_claim_job(text, public.enum_qurbani_jobs_type) to service_role;
  end if;
end;
$$;

commit;
