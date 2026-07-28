import type { PoolClient } from "pg";

import { withQurbaniTransaction } from "@/lib/qurbani/db";

type DocId = string | number;

export type QurbaniCleanupInput = {
  seasonIds?: DocId[];
  productIds?: DocId[];
  includeCountries?: boolean;
};

export type QurbaniCleanupReport = {
  totalDeleted: number;
  ledgerEntriesDeleted: number;
  paymentEventsDeleted: number;
  paymentSessionsDeleted: number;
  donationFulfillmentsDeleted: number;
  donorReportsDeleted: number;
  refundRequestsDeleted: number;
  donationsDeleted: number;
  donationIntentsDeleted: number;
  messagesDeleted: number;
  accessLinksDeleted: number;
  videosDeleted: number;
  fieldTasksDeleted: number;
  fieldPackageItemsDeleted: number;
  fieldPackagesDeleted: number;
  allocationsDeleted: number;
  checkoutsDeleted: number;
  ordersDeleted: number;
  sharesDeleted: number;
  poolsDeleted: number;
  documentsDeleted: number;
  stockBatchLinesDeleted: number;
  stockBatchesDeleted: number;
  priceRevisionsDeleted: number;
  productsDeleted: number;
  regionsDeleted: number;
  countriesDeleted: number;
  seasonsDeleted: number;
};

const emptyReport = (): QurbaniCleanupReport => ({
  totalDeleted: 0,
  ledgerEntriesDeleted: 0,
  paymentEventsDeleted: 0,
  paymentSessionsDeleted: 0,
  donationFulfillmentsDeleted: 0,
  donorReportsDeleted: 0,
  refundRequestsDeleted: 0,
  donationsDeleted: 0,
  donationIntentsDeleted: 0,
  messagesDeleted: 0,
  accessLinksDeleted: 0,
  videosDeleted: 0,
  fieldTasksDeleted: 0,
  fieldPackageItemsDeleted: 0,
  fieldPackagesDeleted: 0,
  allocationsDeleted: 0,
  checkoutsDeleted: 0,
  ordersDeleted: 0,
  sharesDeleted: 0,
  poolsDeleted: 0,
  documentsDeleted: 0,
  stockBatchLinesDeleted: 0,
  stockBatchesDeleted: 0,
  priceRevisionsDeleted: 0,
  productsDeleted: 0,
  regionsDeleted: 0,
  countriesDeleted: 0,
  seasonsDeleted: 0,
});

function asInt(value: DocId) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function uniqueInts(values: DocId[] | undefined) {
  return [...new Set((values || []).map(asInt).filter((value): value is number => value !== null))];
}

function bump(report: QurbaniCleanupReport, key: keyof QurbaniCleanupReport, count: number) {
  if (!count) return;
  report[key] += count;
  report.totalDeleted += count;
}

async function selectIds(client: PoolClient, text: string, values: unknown[]) {
  const result = await client.query<{ id: number }>(text, values);
  return [...new Set(result.rows.map((row) => row.id).filter((value) => Number.isInteger(value) && value > 0))];
}

async function deleteByIds(client: PoolClient, table: string, ids: number[]) {
  if (!ids.length) return 0;
  const result = await client.query(`delete from public.${table} where id = any($1::int[])`, [ids]);
  return result.rowCount ?? 0;
}

async function deleteLedgerEntries(client: PoolClient, donationIds: number[], refundIds: number[]) {
  if (!donationIds.length && !refundIds.length) return 0;
  await client.query("alter table public.payment_ledger_entries disable trigger payment_ledger_entries_append_only");
  try {
    const result = await client.query(
      "delete from public.payment_ledger_entries where donation_id = any($1::int[]) or refund_request_id = any($2::int[])",
      [donationIds, refundIds],
    );
    return result.rowCount ?? 0;
  } finally {
    await client.query("alter table public.payment_ledger_entries enable trigger payment_ledger_entries_append_only");
  }
}

async function cleanupQurbaniData(client: PoolClient, input: QurbaniCleanupInput) {
  const report = emptyReport();
  const seasonIds = uniqueInts(input.seasonIds);
  const seedProductIds = uniqueInts(input.productIds);
  const includeCountries = input.includeCountries === true;

  if (!seasonIds.length && !seedProductIds.length) return report;

  const productIds = [...new Set([
    ...seedProductIds,
    ...(seasonIds.length
      ? await selectIds(client, "select id from public.qurbani_products where season_id = any($1::int[])", [seasonIds])
      : []),
  ])];
  const regionIds = seasonIds.length
    ? await selectIds(client, "select id from public.qurbani_regions where season_id = any($1::int[])", [seasonIds])
    : [];
  const poolIds = [...new Set([
    ...(seasonIds.length
      ? await selectIds(client, "select id from public.qurbani_pools where season_id = any($1::int[])", [seasonIds])
      : []),
    ...(productIds.length
      ? await selectIds(client, "select id from public.qurbani_pools where product_id = any($1::int[])", [productIds])
      : []),
  ])];
  const fieldTaskIds = poolIds.length
    ? await selectIds(client, "select id from public.field_tasks where qurbani_pool_id = any($1::int[])", [poolIds])
    : [];
  const videoIds = [...new Set([
    ...(poolIds.length
      ? await selectIds(client, "select id from public.qurbani_videos where pool_id = any($1::int[])", [poolIds])
      : []),
    ...(fieldTaskIds.length
      ? await selectIds(client, "select id from public.qurbani_videos where field_task_id = any($1::int[])", [fieldTaskIds])
      : []),
  ])];
  const orderRows = await client.query<{ id: number; checkout_id: number | null; checkout_line_id: number | null }>(
    "select id, checkout_id, checkout_line_id from public.qurbani_orders where season_id = any($1::int[]) or product_id = any($2::int[]) or pool_id = any($3::int[])",
    [seasonIds, productIds, poolIds],
  );
  const orderIds = [...new Set(orderRows.rows.map((row) => row.id))];
  const checkoutIdsFromOrders = [...new Set(orderRows.rows.map((row) => asInt(row.checkout_id as DocId)).filter((value): value is number => value !== null))];
  const orderLineIds = [...new Set(orderRows.rows.map((row) => asInt(row.checkout_line_id as DocId)).filter((value): value is number => value !== null))];
  const checkoutLineRows = await client.query<{ id: number; checkout_id: number | null }>(
    "select id, checkout_id from public.qurbani_checkout_lines where product_id = any($1::int[]) or checkout_id = any($2::int[]) or order_id = any($3::int[])",
    [productIds, checkoutIdsFromOrders, orderIds],
  );
  const checkoutLineIds = [...new Set([
    ...orderLineIds,
    ...checkoutLineRows.rows.map((row) => row.id),
  ])];
  const checkoutIds = [...new Set([
    ...checkoutIdsFromOrders,
    ...checkoutLineRows.rows.map((row) => asInt(row.checkout_id as DocId)).filter((value): value is number => value !== null),
  ])];
  const holdIds = poolIds.length || checkoutIds.length || checkoutLineIds.length
    ? await selectIds(
        client,
        "select id from public.qurbani_inventory_holds where checkout_id = any($1::int[]) or checkout_line_id = any($2::int[]) or pool_id = any($3::int[])",
        [checkoutIds, checkoutLineIds, poolIds],
      )
    : [];
  const allocationIds = poolIds.length || checkoutIds.length || checkoutLineIds.length || orderIds.length || holdIds.length
    ? await selectIds(
        client,
        "select id from public.qurbani_allocations where checkout_id = any($1::int[]) or checkout_line_id = any($2::int[]) or order_id = any($3::int[]) or pool_id = any($4::int[]) or hold_id = any($5::int[])",
        [checkoutIds, checkoutLineIds, orderIds, poolIds, holdIds],
      )
    : [];
  const fieldPackageIds = seasonIds.length
    ? await selectIds(client, "select id from public.qurbani_field_packages where season_id = any($1::int[])", [seasonIds])
    : [];
  const fieldPackageItemIds = [...new Set([
    ...(fieldPackageIds.length
      ? await selectIds(client, "select id from public.qurbani_field_package_items where field_package_id = any($1::int[])", [fieldPackageIds])
      : []),
    ...(poolIds.length
      ? await selectIds(client, "select id from public.qurbani_field_package_items where pool_id = any($1::int[])", [poolIds])
      : []),
  ])];
  const stockBatchIds = seasonIds.length
    ? await selectIds(client, "select id from public.qurbani_stock_batches where season_id = any($1::int[])", [seasonIds])
    : [];
  const stockBatchLineIds = [...new Set([
    ...(stockBatchIds.length
      ? await selectIds(client, "select id from public.qurbani_stock_batch_lines where batch_id = any($1::int[])", [stockBatchIds])
      : []),
    ...(productIds.length
      ? await selectIds(client, "select id from public.qurbani_stock_batch_lines where product_id = any($1::int[])", [productIds])
      : []),
  ])];
  const priceRevisionIds = [...new Set([
    ...(productIds.length
      ? await selectIds(client, "select id from public.qurbani_price_revisions where product_id = any($1::int[])", [productIds])
      : []),
    ...(stockBatchLineIds.length
      ? await selectIds(client, "select id from public.qurbani_price_revisions where batch_line_id = any($1::int[])", [stockBatchLineIds])
      : []),
  ])];
  const accessLinkIds = [...new Set([
    ...(poolIds.length
      ? await selectIds(client, "select id from public.qurbani_access_links where pool_id = any($1::int[])", [poolIds])
      : []),
    ...(orderIds.length
      ? await selectIds(client, "select id from public.qurbani_access_links where order_id = any($1::int[])", [orderIds])
      : []),
    ...(videoIds.length
      ? await selectIds(client, "select id from public.qurbani_access_links where video_id = any($1::int[])", [videoIds])
      : []),
  ])];
  const messageIds = [...new Set([
    ...(poolIds.length
      ? await selectIds(client, "select id from public.qurbani_messages where pool_id = any($1::int[])", [poolIds])
      : []),
    ...(accessLinkIds.length
      ? await selectIds(client, "select id from public.qurbani_messages where access_link_id = any($1::int[])", [accessLinkIds])
      : []),
  ])];
  const donationIntentRows = await client.query<{ id: number; campaign_id: number | null }>(
    "select id, campaign_id from public.donation_intents where qurbani_order_id = any($1::int[]) or qurbani_checkout_id = any($2::int[])",
    [orderIds, checkoutIds],
  );
  const donationIntentIds = [...new Set(donationIntentRows.rows.map((row) => row.id))];
  const donationRows = await client.query<{ id: number; campaign_id: number | null }>(
    "select id, campaign_id from public.donations where qurbani_order_id = any($1::int[]) or qurbani_checkout_id = any($2::int[])",
    [orderIds, checkoutIds],
  );
  const donationIds = [...new Set(donationRows.rows.map((row) => row.id))];
  const paymentSessionIds = donationIntentIds.length
    ? await selectIds(client, "select id from public.payment_sessions where donation_intent_id = any($1::int[])", [donationIntentIds])
    : [];
  const paymentEventIds = paymentSessionIds.length
    ? await selectIds(client, "select id from public.payment_events where payment_session_id = any($1::int[])", [paymentSessionIds])
    : [];
  const fulfillmentIds = donationIds.length
    ? await selectIds(client, "select id from public.donation_fulfillments where donation_id = any($1::int[])", [donationIds])
    : [];
  const reportIds = donationIds.length
    ? await selectIds(client, "select id from public.donor_reports where donation_id = any($1::int[])", [donationIds])
    : [];
  const refundIds = donationIds.length
    ? await selectIds(client, "select id from public.refund_requests where donation_id = any($1::int[])", [donationIds])
    : [];

  bump(report, "ledgerEntriesDeleted", await deleteLedgerEntries(client, donationIds, refundIds));
  bump(report, "paymentEventsDeleted", await deleteByIds(client, "payment_events", paymentEventIds));
  bump(report, "paymentSessionsDeleted", await deleteByIds(client, "payment_sessions", paymentSessionIds));
  bump(report, "donationFulfillmentsDeleted", await deleteByIds(client, "donation_fulfillments", fulfillmentIds));
  bump(report, "donorReportsDeleted", await deleteByIds(client, "donor_reports", reportIds));
  bump(report, "refundRequestsDeleted", await deleteByIds(client, "refund_requests", refundIds));
  bump(report, "donationsDeleted", await deleteByIds(client, "donations", donationIds));
  bump(report, "donationIntentsDeleted", await deleteByIds(client, "donation_intents", donationIntentIds));
  bump(report, "messagesDeleted", await deleteByIds(client, "qurbani_messages", messageIds));
  bump(report, "accessLinksDeleted", await deleteByIds(client, "qurbani_access_links", accessLinkIds));
  bump(report, "videosDeleted", await deleteByIds(client, "qurbani_videos", videoIds));
  bump(report, "fieldTasksDeleted", await deleteByIds(client, "field_tasks", fieldTaskIds));
  bump(report, "fieldPackageItemsDeleted", await deleteByIds(client, "qurbani_field_package_items", fieldPackageItemIds));
  bump(report, "fieldPackagesDeleted", await deleteByIds(client, "qurbani_field_packages", fieldPackageIds));
  bump(report, "allocationsDeleted", await deleteByIds(client, "qurbani_allocations", allocationIds));
  bump(report, "checkoutsDeleted", await deleteByIds(client, "qurbani_checkouts", checkoutIds));
  bump(report, "ordersDeleted", await deleteByIds(client, "qurbani_orders", orderIds));
  bump(report, "sharesDeleted", await deleteByIds(client, "qurbani_shares", [...new Set([
    ...(orderIds.length ? await selectIds(client, "select id from public.qurbani_shares where order_id = any($1::int[])", [orderIds]) : []),
    ...(poolIds.length ? await selectIds(client, "select id from public.qurbani_shares where pool_id = any($1::int[])", [poolIds]) : []),
  ])]));
  bump(report, "poolsDeleted", await deleteByIds(client, "qurbani_pools", poolIds));
  bump(report, "documentsDeleted", await deleteByIds(client, "qurbani_documents", [...new Set([
    ...(stockBatchIds.length ? await selectIds(client, "select id from public.qurbani_documents where stock_batch_id = any($1::int[])", [stockBatchIds]) : []),
  ])]));
  bump(report, "stockBatchLinesDeleted", await deleteByIds(client, "qurbani_stock_batch_lines", stockBatchLineIds));
  bump(report, "stockBatchesDeleted", await deleteByIds(client, "qurbani_stock_batches", stockBatchIds));
  bump(report, "priceRevisionsDeleted", await deleteByIds(client, "qurbani_price_revisions", priceRevisionIds));
  bump(report, "productsDeleted", await deleteByIds(client, "qurbani_products", productIds));
  bump(report, "regionsDeleted", await deleteByIds(client, "qurbani_regions", regionIds));
  if (includeCountries) {
    const countryIds = await selectIds(client, "select id from public.qurbani_countries", []);
    bump(report, "countriesDeleted", await deleteByIds(client, "qurbani_countries", countryIds));
  }
  bump(report, "seasonsDeleted", await deleteByIds(client, "qurbani_seasons", seasonIds));

  return report;
}

export async function purgeQurbaniData(input: QurbaniCleanupInput) {
  return withQurbaniTransaction((client) => cleanupQurbaniData(client, input));
}

export async function purgeAllQurbaniData(input: { includeCountries?: boolean } = {}) {
  return withQurbaniTransaction(async (client) =>
    cleanupQurbaniData(client, {
      seasonIds: await selectIds(client, "select id from public.qurbani_seasons", []),
      productIds: await selectIds(client, "select id from public.qurbani_products", []),
      includeCountries: input.includeCountries === true,
    }),
  );
}
