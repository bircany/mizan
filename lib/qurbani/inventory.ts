import "server-only";

import type { Payload } from "payload";

import { qurbaniQuery } from "@/lib/qurbani/db";

type Id = string | number;
type Currency = "TRY" | "USD" | "EUR" | "GBP";

export type CreateQurbaniStockBatchInput = {
  seasonId: Id;
  countryId: Id;
  regionId?: Id;
  name: string;
  nature: "planned" | "secured";
  status: "draft" | "active" | "paused" | "preparing" | "transferred" | "completed" | "archived";
  idempotencyKey: string;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
  rows: Array<{
    productId: Id;
    kind: "cattle" | "small_livestock";
    animalCount: number;
    capacity: number;
    price: number;
    currency: Currency | string;
    salesStartAt?: string;
    salesEndAt?: string;
    sortOrder?: number;
  }>;
  actorId: Id;
  actorEmail: string;
};

export type StockBatchMutationResult = {
  batchId: number;
  animalCount: number;
  totalCapacity: number;
  availableCapacity: number;
  idempotent?: boolean;
};

function integer(value: Id, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} geçerli değil.`);
  return parsed;
}

async function callInventoryRpc<T>(functionName: string, input: unknown) {
  const result = await qurbaniQuery<{ result: T }>(
    `select private.${functionName}($1::jsonb) as result`,
    [JSON.stringify(input)],
  );
  if (!result.rows[0]?.result) throw new Error("Kurban stok işlemi sonuç üretmedi.");
  return result.rows[0].result;
}

export async function createQurbaniStockBatch(
  payload: Payload,
  input: CreateQurbaniStockBatchInput,
): Promise<StockBatchMutationResult> {
  void payload;
  return callInventoryRpc<StockBatchMutationResult>("qurbani_create_stock_batch", {
    ...input,
    seasonId: integer(input.seasonId, "Sezon"),
    countryId: integer(input.countryId, "Ülke"),
    regionId: input.regionId ? integer(input.regionId, "Sezon ülke ayarı") : null,
    actorId: integer(input.actorId, "Yönetici"),
    rows: input.rows.map((row) => ({
      ...row,
      productId: integer(row.productId, "Ürün"),
      animalCount: Math.trunc(row.animalCount),
      capacity: row.kind === "small_livestock" ? 1 : Math.trunc(row.capacity),
      price: Number(row.price),
      currency: String(row.currency).toUpperCase(),
    })),
  });
}

export async function adjustQurbaniEmptyStock(
  payload: Payload,
  input: { batchId: Id; batchLineId: Id; delta: number; reason?: string; actorId: Id; actorEmail: string },
) {
  void payload;
  return callInventoryRpc<StockBatchMutationResult>("qurbani_adjust_empty_stock", {
    ...input,
    batchId: integer(input.batchId, "Stok partisi"),
    batchLineId: integer(input.batchLineId, "Stok satırı"),
    actorId: integer(input.actorId, "Yönetici"),
    delta: Math.trunc(input.delta),
  });
}

export async function setQurbaniStockBatchStatus(
  payload: Payload,
  input: { batchId: Id; status: string; actorId: Id; actorEmail: string },
) {
  void payload;
  return callInventoryRpc<StockBatchMutationResult>("qurbani_set_stock_batch_status", {
    ...input,
    batchId: integer(input.batchId, "Stok partisi"),
    actorId: integer(input.actorId, "Yönetici"),
  });
}

export async function updateQurbaniStockPrice(
  payload: Payload,
  input: { batchLineId: Id; unitPrice: number; currency: string; reason: string; actorId: Id; actorEmail: string },
) {
  void payload;
  return callInventoryRpc<{ batchLineId: number; priceRevisionId: number; revision: number }>(
    "qurbani_update_stock_price",
    {
      ...input,
      batchLineId: integer(input.batchLineId, "Stok satırı"),
      actorId: integer(input.actorId, "Yönetici"),
      unitPrice: Number(input.unitPrice),
      currency: input.currency.toUpperCase(),
    },
  );
}

export async function createManualPaidQurbaniOrder(
  payload: Payload,
  input: {
    productId: Id;
    shareCount: number;
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    identityNumber?: string;
    address?: string;
    proxyMethod: "phone" | "written" | "digital";
    proxyAt: string;
    note?: string;
    overridePrice?: number;
    overrideReason?: string;
    actorId: Id;
    actorEmail: string;
  },
) {
  void payload;
  return callInventoryRpc<{ checkoutId: number; orderIds: number[]; state: string }>(
    "qurbani_create_manual_paid_order",
    {
      ...input,
      productId: integer(input.productId, "Ürün"),
      actorId: integer(input.actorId, "Yönetici"),
      shareCount: Math.trunc(input.shareCount),
      overridePrice: input.overridePrice == null ? null : Number(input.overridePrice),
    },
  );
}

export async function createQurbaniFieldPackage(
  payload: Payload,
  input: {
    poolIds: Id[];
    operatorId: Id;
    name: string;
    dueAt?: string;
    notes?: string;
    allowEarly?: boolean;
    idempotencyKey: string;
    actorId: Id;
    actorEmail: string;
  },
) {
  void payload;
  if (!input.poolIds.length || input.poolIds.length > 250)
    throw new Error("Saha paketi 1-250 kurban içermelidir.");
  return callInventoryRpc<{
    packageId: number;
    code: string;
    fieldTaskIds: number[];
    poolCodes: string[];
    idempotent: boolean;
  }>("qurbani_create_field_package", {
    ...input,
    poolIds: [...new Set(input.poolIds.map((id) => integer(id, "Havuz")))],
    operatorId: integer(input.operatorId, "Saha görevlisi"),
    actorId: integer(input.actorId, "Yönetici"),
  });
}

export async function importManualPaidQurbaniOrders(
  payload: Payload,
  input: {
    idempotencyKey: string;
    groups: Array<{
      orderGroup: string;
      productId: Id;
      buyerName: string;
      buyerPhone: string;
      paymentReference: string;
      proxyMethod: "phone" | "written" | "digital";
      proxyAt: string;
      shareholders: Array<{ name: string; phone?: string }>;
    }>;
    actorId: Id;
    actorEmail: string;
  },
) {
  void payload;
  return callInventoryRpc<{
    success: boolean;
    idempotent: boolean;
    groupCount: number;
  }>("qurbani_import_manual_paid_orders", {
    ...input,
    actorId: integer(input.actorId, "Yönetici"),
    groups: input.groups.map((group) => ({
      ...group,
      productId: integer(group.productId, "Ürün"),
    })),
  });
}

export async function finalizeIncompleteQurbaniPool(
  payload: Payload,
  input: { poolId: Id; reason: string; actorId: Id; actorEmail: string },
) {
  void payload;
  return callInventoryRpc<{
    poolId: number;
    oldCapacity: number;
    newCapacity: number;
  }>("qurbani_finalize_incomplete_pool", {
    ...input,
    poolId: integer(input.poolId, "Havuz"),
    actorId: integer(input.actorId, "Yönetici"),
  });
}
