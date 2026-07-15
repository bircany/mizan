-- Mizan Dernegi - Server-side public endpoint rate limiting.
-- Function is callable only by Supabase service_role; browser clients have no access.

begin;

create table if not exists public.api_rate_limits (
  rate_limit_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if p_key is null or length(p_key) = 0 or p_window_seconds <= 0 or p_max_requests <= 0 then
    raise exception 'Invalid rate limit input';
  end if;

  insert into public.api_rate_limits (
    rate_limit_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_key, now(), 1, now())
  on conflict (rate_limit_key) do update
  set
    request_count = case
      when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.api_rate_limits.window_started_at
    end,
    updated_at = now()
  returning request_count <= p_max_requests into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_api_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_api_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

commit;
