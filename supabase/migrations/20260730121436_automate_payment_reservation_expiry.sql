begin;

create extension if not exists pg_cron;

create or replace function private.expire_donation_reservations()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent_id integer;
  v_count integer := 0;
begin
  for v_intent_id in
    select id
    from public.donation_intents
    where reservation_expires_at <= now()
      and status in (
        'reserved',
        'payment_initialized',
        'awaiting_bank_transfer',
        'bank_transfer_submitted'
      )
    order by id
    for update skip locked
  loop
    perform private.release_unified_donation_reservation(
      v_intent_id,
      'expired'
    );

    update public.payment_sessions
    set
      provider_status = 'EXPIRED',
      updated_at = now()
    where donation_intent_id = v_intent_id
      and coalesce(provider_status, '') not in (
        'SUCCESS',
        'PAID',
        'EFT_APPROVED',
        'LATE_SUCCESS_REVIEW_REQUIRED'
      );

    insert into public.audit_logs (
      action,
      actor_email,
      target_collection,
      target_id,
      details
    )
    values (
      'donation.payment_expired',
      'system:payment-expiry',
      'donation-intents',
      v_intent_id::text,
      jsonb_build_object(
        'intentId', v_intent_id,
        'reason', 'reservation_timeout'
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.expire_donation_reservations()
  from public, anon, authenticated;
grant execute on function private.expire_donation_reservations()
  to service_role;

select cron.schedule(
  'expire-unified-donation-reservations',
  '* * * * *',
  'select private.expire_donation_reservations();'
);

commit;
