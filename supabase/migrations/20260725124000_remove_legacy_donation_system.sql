begin;

-- These records were explicitly classified as test data before cutover.
delete from public.delivery_messages;
delete from public.operation_videos;
delete from public.operation_group_members;
delete from public.operation_groups;
delete from public.donation_participants;
delete from public.donation_fulfillments;
delete from public.refund_requests;
delete from public.payment_events;
delete from public.payment_ledger_entries;
delete from public.campaign_financial_totals;
delete from public.donations;
delete from public.payment_sessions;
delete from public.donation_intents;

drop table if exists public.campaign_funding_pool_financial_totals cascade;
drop table if exists public.campaign_funding_pools_locales cascade;
drop table if exists public.campaign_funding_pools cascade;

drop table if exists public.qurbani_access_links_rels cascade;
drop table if exists public.qurbani_access_links cascade;
drop table if exists public.qurbani_allocations cascade;
drop table if exists public.qurbani_checkout_lines cascade;
drop table if exists public.qurbani_inventory_holds cascade;
drop table if exists public.qurbani_checkouts cascade;
drop table if exists public.qurbani_field_package_items cascade;
drop table if exists public.qurbani_field_packages cascade;
drop table if exists public.qurbani_documents cascade;
drop table if exists public.qurbani_messages cascade;
drop table if exists public.qurbani_jobs cascade;
drop table if exists public.qurbani_videos cascade;
drop table if exists public.qurbani_shares cascade;
drop table if exists public.qurbani_orders cascade;
drop table if exists public.qurbani_pools cascade;
drop table if exists public.qurbani_price_revisions cascade;
drop table if exists public.qurbani_stock_batch_lines cascade;
drop table if exists public.qurbani_stock_batches cascade;
drop table if exists public.qurbani_products_locales cascade;
drop table if exists public.qurbani_products cascade;
drop table if exists public.qurbani_regions_locales cascade;
drop table if exists public.qurbani_regions cascade;
drop table if exists public.qurbani_countries_locales cascade;
drop table if exists public.qurbani_countries cascade;
drop table if exists public.qurbani_seasons_locales cascade;
drop table if exists public.qurbani_seasons cascade;

drop table if exists public.proof_assets cascade;
drop table if exists public.proof_submissions cascade;
drop table if exists public.field_tasks cascade;
drop table if exists public.donor_reports_rels cascade;
drop table if exists public.donor_reports cascade;
drop table if exists public.panel_settings cascade;

alter table public.donation_intents
  drop column if exists funding_pool_id,
  drop column if exists qurbani_order_id,
  drop column if exists qurbani_checkout_id;
alter table public.donations
  drop column if exists funding_pool_id,
  drop column if exists qurbani_order_id,
  drop column if exists qurbani_checkout_id;

do $$
declare
  v_column record;
begin
  for v_column in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payload_locked_documents_rels'
      and (
        column_name like 'qurbani\_%' escape '\'
        or column_name in (
          'campaign_funding_pools_id',
          'field_tasks_id',
          'proof_submissions_id',
          'proof_assets_id',
          'donor_reports_id',
          'panel_settings_id'
        )
      )
  loop
    execute format(
      'alter table public.payload_locked_documents_rels drop column if exists %I cascade',
      v_column.column_name
    );
  end loop;
end;
$$;

do $$
declare
  v_function record;
begin
  for v_function in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where
      (n.nspname = 'private' and p.proname like 'qurbani\_%' escape '\')
      or (
        n.nspname in ('public', 'private')
        and p.proname like '%funding_pool%'
      )
  loop
    execute format(
      'drop function if exists %I.%I(%s) cascade',
      v_function.schema_name,
      v_function.function_name,
      v_function.identity_arguments
    );
  end loop;
end;
$$;

delete from public.campaigns;

commit;
