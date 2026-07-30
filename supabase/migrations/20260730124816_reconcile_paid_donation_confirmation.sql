begin;

alter type public.enum_donation_fulfillments_receipt_status
  add value if not exists 'not_requested';

create or replace function private.set_operation_group_type_from_campaign()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.operation_type is null then
    select c.operation_type::text::public.enum_operation_groups_operation_type
      into new.operation_type
    from public.campaigns c
    where c.id = new.campaign_id;
  end if;

  return new;
end;
$$;

revoke all on function private.set_operation_group_type_from_campaign()
  from public, anon, authenticated;

drop trigger if exists operation_groups_set_operation_type
  on public.operation_groups;
create trigger operation_groups_set_operation_type
before insert or update of campaign_id, operation_type
on public.operation_groups
for each row
execute function private.set_operation_group_type_from_campaign();

update public.operation_groups g
set
  operation_type =
    c.operation_type::text::public.enum_operation_groups_operation_type,
  status = case
    when c.operation_type::text = 'slaughter_video'
      and g.slaughtered_at is null
      and g.status::text in ('full', 'video_pending')
      and g.capacity is not null
      and g.confirmed_count >= g.capacity
      and g.reserved_count = 0
      then 'ready_for_slaughter'::public.enum_operation_groups_status
    else g.status
  end,
  updated_at = now()
from public.campaigns c
where c.id = g.campaign_id
  and g.operation_type is null
  and c.operation_type is not null;

create or replace function private.confirm_unified_donation(
  p_intent_id integer,
  p_donation_id integer,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_intent public.donation_intents%rowtype;
  v_donation public.donations%rowtype;
  v_group record;
begin
  select *
    into v_intent
  from public.donation_intents
  where id = p_intent_id
  for update;
  if not found then
    raise exception 'donation intent not found';
  end if;

  select *
    into v_donation
  from public.donations
  where id = p_donation_id
  for update;
  if not found or v_donation.donation_intent_id <> p_intent_id then
    raise exception 'donation does not belong to intent';
  end if;

  if v_intent.status = 'completed' then
    return jsonb_build_object(
      'intentId', p_intent_id,
      'donationId', p_donation_id,
      'confirmed', false
    );
  end if;
  if v_intent.status not in (
    'reserved',
    'payment_initialized',
    'awaiting_bank_transfer',
    'bank_transfer_submitted',
    'callback_received'
  ) then
    raise exception 'donation intent is not confirmable';
  end if;

  perform 1
  from public.campaigns
  where id = v_intent.campaign_id
  for update;

  for v_group in
    select group_id, count(*)::integer as member_count
    from public.operation_group_members
    where donation_intent_id = p_intent_id
      and status = 'reserved'
    group by group_id
    order by group_id
  loop
    perform 1
    from public.operation_groups
    where id = v_group.group_id
    for update;

    update public.operation_groups
    set
      reserved_count = greatest(0, reserved_count - v_group.member_count),
      confirmed_count = confirmed_count + v_group.member_count,
      status = case
        when capacity is not null
          and confirmed_count + v_group.member_count >= capacity
          then case
            when operation_type::text = 'slaughter_video'
              then 'ready_for_slaughter'::public.enum_operation_groups_status
            else 'video_pending'::public.enum_operation_groups_status
          end
        else status
      end,
      updated_at = now()
    where id = v_group.group_id;
  end loop;

  update public.operation_group_members
  set
    donation_id = p_donation_id,
    status = 'confirmed',
    confirmed_at = now(),
    updated_at = now()
  where donation_intent_id = p_intent_id
    and status = 'reserved';

  update public.donation_participants
  set donation_id = p_donation_id, updated_at = now()
  where donation_intent_id = p_intent_id;

  update public.campaigns
  set
    reserved_units = greatest(0, reserved_units - v_intent.quantity),
    confirmed_units = confirmed_units + v_intent.quantity,
    updated_at = now()
  where id = v_intent.campaign_id;

  update public.donation_intents
  set status = 'completed', updated_at = now()
  where id = p_intent_id;

  insert into public.audit_logs (
    action,
    actor_email,
    target_collection,
    target_id,
    details
  )
  values (
    'donation.confirmed',
    nullif(p_actor, ''),
    'donations',
    p_donation_id::text,
    jsonb_build_object(
      'intentId', p_intent_id,
      'campaignId', v_intent.campaign_id
    )
  );

  return jsonb_build_object(
    'intentId', p_intent_id,
    'donationId', p_donation_id,
    'confirmed', true
  );
end;
$$;

revoke all on function private.confirm_unified_donation(integer, integer, text)
  from public, anon, authenticated;
grant execute on function private.confirm_unified_donation(integer, integer, text)
  to service_role;

create or replace function private.reconcile_paid_donation_confirmations()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_error text;
begin
  for v_row in
    select
      d.id as donation_id,
      d.donation_intent_id as intent_id,
      d.campaign_id,
      d.net_confirmed_amount,
      d.currency::text as currency,
      d.payment_id,
      di.status::text as intent_status
    from public.donations d
    join public.donation_intents di
      on di.id = d.donation_intent_id
    where d.status::text in ('paid', 'partially_refunded')
      and (
        di.status::text <> 'completed'
        or not exists (
          select 1
          from public.payment_ledger_entries ple
          where ple.idempotency_key = case
            when nullif(d.payment_id, '') is not null
              then 'capture:' || d.payment_id
            else 'capture:donation:' || d.id::text
          end
        )
        or not exists (
          select 1
          from public.donation_fulfillments df
          where df.donation_id = d.id
        )
      )
    order by d.id
    for update of di skip locked
  loop
    begin
      if v_row.intent_status <> 'completed' then
        perform private.confirm_unified_donation(
          v_row.intent_id,
          v_row.donation_id,
          'system:payment-reconciliation'
        );
      end if;

      perform public.record_payment_ledger_entry(
        v_row.donation_id,
        v_row.campaign_id,
        null,
        'capture',
        v_row.net_confirmed_amount,
        v_row.currency,
        v_row.payment_id,
        case
          when nullif(v_row.payment_id, '') is not null
            then 'capture:' || v_row.payment_id
          else 'capture:donation:' || v_row.donation_id::text
        end,
        false,
        jsonb_build_object('source', 'payment-reconciliation')
      );

      insert into public.donation_fulfillments (donation_id)
      values (v_row.donation_id)
      on conflict (donation_id) do nothing;

      insert into public.audit_logs (
        action,
        actor_email,
        target_collection,
        target_id,
        details
      )
      values (
        'payment.reconciled',
        'system:payment-reconciliation',
        'donations',
        v_row.donation_id::text,
        jsonb_build_object(
          'intentId', v_row.intent_id,
          'campaignId', v_row.campaign_id
        )
      );

      v_count := v_count + 1;
    exception
      when others then
        get stacked diagnostics v_error = message_text;
        insert into public.audit_logs (
          action,
          actor_email,
          target_collection,
          target_id,
          details
        )
        values (
          'payment.reconciliation_failed',
          'system:payment-reconciliation',
          'donations',
          v_row.donation_id::text,
          jsonb_build_object(
            'intentId', v_row.intent_id,
            'campaignId', v_row.campaign_id,
            'error', left(v_error, 1000)
          )
        );
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.reconcile_paid_donation_confirmations()
  from public, anon, authenticated;
grant execute on function private.reconcile_paid_donation_confirmations()
  to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'reconcile-paid-donation-confirmations';

select cron.schedule(
  'reconcile-paid-donation-confirmations',
  '* * * * *',
  'select private.reconcile_paid_donation_confirmations();'
);

commit;
