"use server";

import { revalidatePath } from "next/cache";
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
} from "payload";

import { requireAdminUser } from "@/lib/admin/data";
import { logAuditEvent } from "@/lib/audit";
import { getPayloadClient } from "@/lib/payload";
import { slugifyEditorial } from "@/lib/editorial";
import {
  adjustQurbaniEmptyStock as adjustQurbaniEmptyStockService,
  createManualPaidQurbaniOrder as createManualPaidQurbaniOrderService,
  createQurbaniFieldPackage as createQurbaniFieldPackageService,
  importManualPaidQurbaniOrders,
  finalizeIncompleteQurbaniPool,
  createQurbaniStockBatch as createQurbaniStockBatchService,
  setQurbaniStockBatchStatus as setQurbaniStockBatchStatusService,
  updateQurbaniStockPrice as updateQurbaniStockPriceService,
} from "@/lib/qurbani/inventory";
import {
  groupQurbaniImportRows,
  parseQurbaniImportCsv,
} from "@/lib/qurbani/manual-import-csv";
import { disconnectEvolutionInstance } from "@/lib/qurbani/evolution";
import {
  approveQurbaniEftOrder,
  approveQurbaniVideo,
  confirmQurbaniPowerOfAttorney,
  prepareQurbaniMessages as prepareQurbaniMessageRecords,
  sendQueuedQurbaniMessages,
  setQurbaniMessageBatchState,
  revokeQurbaniAccessLink,
  transferQurbaniOrder,
} from "@/lib/qurbani/service";

export type QurbaniActionState = {
  success: boolean;
  message: string | null;
  requestKey?: string;
};

const initialFailure = (message: string): QurbaniActionState => ({
  success: false,
  message,
});

function formText(formData: FormData, field: string, required = false) {
  const value = String(formData.get(field) || "").trim();
  if (required && !value) throw new Error(`${field} alanı zorunludur.`);
  return value;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function asIso(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error("Tarih değeri geçerli değil.");
  return date.toISOString();
}

function validIban(value: string) {
  return !value || /^TR\d{24}$/.test(value.replace(/\s+/g, "").toUpperCase());
}

function relationshipId(value: string) {
  return /^\d+$/.test(value) ? Number(value) : value;
}

async function audit(input: {
  action: string;
  actorEmail: string;
  targetCollection: string;
  targetId: string;
  details?: Record<string, unknown>;
}) {
  try {
    await logAuditEvent(await getPayloadClient(), input);
  } catch (error) {
    console.warn(
      "Kurban denetim kaydı yazılamadı.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function revalidateQurbani() {
  revalidatePath("/panel/kurban");
  revalidatePath("/kurban");
}

export async function saveQurbaniSeason(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const id = formText(formData, "id");
    const year = Number(formText(formData, "year", true));
    if (!Number.isInteger(year) || year < 2020 || year > 2200)
      throw new Error("Sezon yılı geçerli değil.");
    const status = formText(formData, "status", true);
    if (
      !["draft", "active", "sales_closed", "completed", "archived"].includes(
        status,
      )
    )
      throw new Error("Sezon durumu geçerli değil.");
    const salesStartAt = asIso(formText(formData, "salesStartAt", true));
    const salesEndAt = asIso(formText(formData, "salesEndAt", true));
    const eidAt = asIso(formText(formData, "feastAt", true));
    if (
      salesStartAt &&
      salesEndAt &&
      new Date(salesStartAt) >= new Date(salesEndAt)
    )
      throw new Error("Satış bitişi başlangıçtan sonra olmalıdır.");
    const iban = formText(formData, "iban").replace(/\s+/g, "").toUpperCase();
    if (!validIban(iban))
      throw new Error(
        "IBAN TR ile başlayan 26 karakterli geçerli biçimde olmalıdır.",
      );

    const payload = await getPayloadClient();
    const req = await createLocalReq(
      { user: { ...actor, collection: "users" } },
      payload,
    );
    await initTransaction(req);
    try {
      const proxyText = formText(formData, "proxyText_tr", true);
      const translations = {
        tr: formText(formData, "title_tr", true),
        en: formText(formData, "title_en"),
        ar: formText(formData, "title_ar"),
      };
      const common = {
        year,
        status,
        salesStartAt,
        salesEndAt,
        eidAt,
        bankName: formText(formData, "bankName"),
        iban,
        proxyTextVersion: formText(formData, "proxyTextVersion", true),
        availableLocales: (["tr", "en", "ar"] as const).filter((locale) =>
          Boolean(translations[locale]),
        ),
      };
      const saved = id
        ? await payload.update({
            collection: "qurbani-seasons" as never,
            id,
            locale: "tr",
            fallbackLocale: false,
            req,
            data: { ...common, heroTitle: translations.tr, proxyText } as never,
          })
        : await payload.create({
            collection: "qurbani-seasons" as never,
            locale: "tr",
            fallbackLocale: false,
            req,
            data: { ...common, heroTitle: translations.tr, proxyText } as never,
          });
      const savedId = String((saved as { id: string | number }).id);
      for (const locale of ["en", "ar"] as const) {
        if (translations[locale]) {
          await payload.update({
            collection: "qurbani-seasons" as never,
            id: savedId,
            locale,
            fallbackLocale: false,
            req,
            // proxyText is a required localized field. Payload validates the
            // complete locale when updating a translated title, so keep the
            // approved text present for every selected locale until separate
            // translations are introduced in the form.
            data: {
              heroTitle: translations[locale],
              proxyText,
            } as never,
          });
        }
      }
      await commitTransaction(req);
      await audit({
        action: id ? "qurbani.season.updated" : "qurbani.season.created",
        actorEmail: actor.email,
        targetCollection: "qurbani-seasons",
        targetId: savedId,
        details: { status, year },
      });
    } catch (error) {
      await killTransaction(req);
      throw error;
    }
    revalidateQurbani();
    return {
      success: true,
      message: id ? "Kurban sezonu güncellendi." : "Kurban sezonu oluşturuldu.",
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Sezon kaydedilemedi."));
  }
}

export async function saveQurbaniProduct(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const id = formText(formData, "id");
    const animalType = formText(formData, "animalType", true);
    if (!["cattle", "small_livestock"].includes(animalType))
      throw new Error("Kurban türü geçerli değil.");
    const capacity = Number(formText(formData, "capacity", true));
    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > (animalType === "cattle" ? 7 : 1)
    )
      throw new Error(
        animalType === "cattle"
          ? "Büyükbaş kapasitesi 1–7 arasında olmalıdır."
          : "Küçükbaş kapasitesi 1 olmalıdır.",
      );
    const price = Number(formText(formData, "price", true).replace(",", "."));
    if (!Number.isFinite(price) || price <= 0)
      throw new Error("Fiyat sıfırdan büyük olmalıdır.");
    const currency = formText(formData, "currency", true).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency))
      throw new Error("Para birimi üç harfli ISO kodu olmalıdır.");
    const payload = await getPayloadClient();
    const seasonId = formText(formData, "seasonId", true);
    const campaignId = formText(formData, "campaignId", true);
    const fundingPoolId = formText(formData, "fundingPoolId", true);
    await payload.findByID({
      collection: "qurbani-seasons" as never,
      id: relationshipId(seasonId),
      depth: 0,
    });
    const fundingPool = await payload.findByID({
      collection: "campaign-funding-pools",
      id: relationshipId(fundingPoolId),
      depth: 0,
    });
    const fundingCampaignId =
      typeof fundingPool.campaign === "object" && fundingPool.campaign
        ? String(fundingPool.campaign.id)
        : String(fundingPool.campaign);
    if (fundingCampaignId !== campaignId)
      throw new Error("Finans havuzu seçilen bağış alanına ait olmalıdır.");
    if (fundingPool.currency !== currency)
      throw new Error(
        "Kurbanlık seçeneğinin para birimi ile finans havuzunun para birimi aynı olmalıdır.",
      );
    const data = {
      season: relationshipId(seasonId),
      region: formText(formData, "region", true),
      kind: animalType,
      title: formText(formData, "title", true),
      price,
      currency,
      capacity,
      isActive: formData.get("isActive") === "on",
      campaign: relationshipId(campaignId),
      fundingPool: relationshipId(fundingPoolId),
    };
    const saved = id
      ? await payload.update({
          collection: "qurbani-products" as never,
          id,
          locale: "tr",
          fallbackLocale: false,
          data: data as never,
        })
      : await payload.create({
          collection: "qurbani-products" as never,
          locale: "tr",
          fallbackLocale: false,
          data: data as never,
        });
    const savedId = String((saved as { id: string | number }).id);
    await audit({
      action: id ? "qurbani.product.updated" : "qurbani.product.created",
      actorEmail: actor.email,
      targetCollection: "qurbani-products",
      targetId: savedId,
      details: { animalType, capacity, price, currency },
    });
    revalidateQurbani();
    return {
      success: true,
      message: id ? "Kurbanlık seçeneği güncellendi." : "Kurbanlık seçeneği oluşturuldu.",
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Kurbanlık seçeneği kaydedilemedi."));
  }
}

export async function saveQurbaniCountry(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const isoCode = formText(formData, "isoCode", true).toUpperCase();
    if (!/^[A-Z]{2}$/.test(isoCode))
      throw new Error("Ülke kodu iki harfli ISO kodu olmalıdır.");
    const names = {
      tr: formText(formData, "name_tr", true),
      en: formText(formData, "name_en"),
      ar: formText(formData, "name_ar"),
    };
    const seasonId = formText(formData, "seasonId", true);
    const salesStartAtInput = asIso(formText(formData, "salesStartAt"));
    const salesEndAtInput = asIso(formText(formData, "salesEndAt"));
    const fieldPreparationAt = asIso(formText(formData, "fieldPreparationAt"));
    const payload = await getPayloadClient();
    const req = await createLocalReq(
      { user: { ...actor, collection: "users" } },
      payload,
    );
    await initTransaction(req);
    try {
      const season = await payload.findByID({ collection: "qurbani-seasons" as never, id: relationshipId(seasonId), depth: 0, req, overrideAccess: true }) as unknown as Record<string, unknown>;
      const salesStartAt = salesStartAtInput || String(season.salesStartAt || "");
      const salesEndAt = salesEndAtInput || String(season.salesEndAt || "");
      if (!salesStartAt || !salesEndAt || new Date(salesStartAt) >= new Date(salesEndAt)) throw new Error("Ülke satış başlangıç ve bitiş tarihleri geçerli olmalıdır.");
      const existing = await payload.find({ collection: "qurbani-countries" as never, where: { isoCode: { equals: isoCode } }, limit: 1, depth: 0, req, overrideAccess: true }) as unknown as { docs: Array<{ id: string | number }> };
      const saved = existing.docs[0] || await payload.create({
        collection: "qurbani-countries" as never,
        locale: "tr",
        fallbackLocale: false,
        req,
        data: {
          isoCode,
          slug: slugifyEditorial(names.tr),
          name: names.tr,
          isActive: formData.get("isActive") === "on",
          sortOrder: 0,
        } as never,
      });
      if (existing.docs[0]) await payload.update({ collection: "qurbani-countries" as never, id: saved.id, locale: "tr", fallbackLocale: false, req, data: { name: names.tr, isActive: formData.get("isActive") === "on" } as never });
      for (const locale of ["en", "ar"] as const)
        if (names[locale])
          await payload.update({
            collection: "qurbani-countries" as never,
            id: saved.id,
            locale,
            fallbackLocale: false,
            req,
            data: { name: names[locale] } as never,
          });
      const regionExisting = await payload.find({ collection: "qurbani-regions" as never, where: { and: [{ season: { equals: relationshipId(seasonId) } }, { country: { equals: saved.id } }] }, limit: 1, depth: 0, req, overrideAccess: true }) as unknown as { docs: Array<{ id: string | number }> };
      const regionData = { season: relationshipId(seasonId), country: saved.id, slug: `${String(season.year || "sezon")}-${slugifyEditorial(names.tr)}`, name: names.tr, salesStartAt, salesEndAt, fieldPreparationAt, countdownAt: fieldPreparationAt || salesEndAt, isActive: formData.get("isActive") === "on", sortOrder: 0 };
      if (regionExisting.docs[0]) await payload.update({ collection: "qurbani-regions" as never, id: regionExisting.docs[0].id, locale: "tr", fallbackLocale: false, req, data: regionData as never });
      else await payload.create({ collection: "qurbani-regions" as never, locale: "tr", fallbackLocale: false, req, data: regionData as never });
      await commitTransaction(req);
      await audit({
        action: "qurbani.country.created",
        actorEmail: actor.email,
        targetCollection: "qurbani-countries",
        targetId: String(saved.id),
        details: { isoCode },
      });
    } catch (error) {
      await killTransaction(req);
      throw error;
    }
    revalidateQurbani();
    return { success: true, message: "Operasyon ülkesi kaydedildi." };
  } catch (error) {
    return initialFailure(errorMessage(error, "Ülke kaydedilemedi."));
  }
}

type StockRowInput = {
  productId: string;
  kind: "cattle" | "small_livestock";
  animalCount: number;
  capacity: number;
  price: number;
  currency: string;
  salesStartAt?: string;
  salesEndAt?: string;
  sortOrder?: number;
};

function parseStockRows(formData: FormData) {
  const raw = JSON.parse(
    formText(formData, "rows", true),
  ) as Partial<StockRowInput>[];
  if (!Array.isArray(raw) || !raw.length || raw.length > 50)
    throw new Error("1–50 arasında stok satırı ekleyin.");
  return raw.map((row, index): StockRowInput => {
    const kind = row.kind === "small_livestock" ? "small_livestock" : "cattle";
    const animalCount = Number(row.animalCount);
    const capacity = kind === "small_livestock" ? 1 : Number(row.capacity);
    const price = Number(row.price);
    const currency = String(row.currency || "TRY").toUpperCase();
    const productId = String(row.productId || "");
    if (
      !productId ||
      !Number.isInteger(animalCount) ||
      animalCount < 1 ||
      animalCount > 500 ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 7 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !["TRY", "USD", "EUR", "GBP"].includes(currency)
    )
      throw new Error(`${index + 1}. stok satırı geçerli değil.`);
    return {
      productId,
      kind,
      animalCount,
      capacity,
      price,
      currency,
      salesStartAt: row.salesStartAt
        ? asIso(String(row.salesStartAt))
        : undefined,
      salesEndAt: row.salesEndAt ? asIso(String(row.salesEndAt)) : undefined,
      sortOrder: index,
    };
  });
}

export async function createQurbaniStockBatch(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const idempotencyKey = formText(formData, "idempotencyKey", true);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    )
      throw new Error(
        "İşlem anahtarı geçerli değil; pencereyi kapatıp yeniden açın.",
      );
    const nature = formText(formData, "nature", true);
    if (!["planned", "secured"].includes(nature))
      throw new Error("Stok niteliği geçerli değil.");
    const rows = parseStockRows(formData);
    if (new Set(rows.map((row) => row.productId)).size !== rows.length)
      throw new Error(
        "Aynı kurbanlık seçeneği birden fazla stok satırında kullanılamaz.",
      );
    const result = await createQurbaniStockBatchService(
      await getPayloadClient(),
      {
        seasonId: formText(formData, "seasonId", true),
        countryId: formText(formData, "countryId", true),
        regionId: formText(formData, "regionId") || undefined,
        name: formText(formData, "name", true),
        nature: nature as "planned" | "secured",
        status: "active",
        idempotencyKey,
        startsAt: asIso(formText(formData, "startsAt")),
        endsAt: asIso(formText(formData, "endsAt")),
        notes: formText(formData, "notes"),
        rows,
        actorId: actor.id,
        actorEmail: actor.email,
      },
    );
    revalidateQurbani();
    return {
      success: true,
      requestKey: idempotencyKey,
      message: result.idempotent
        ? `Bu işlem daha önce tamamlanmıştı; mevcut ${result.animalCount} kurbanlık partisi gösteriliyor.`
        : `${result.animalCount} kurbanlık idempotent işlemle oluşturuldu.`,
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Stok partisi oluşturulamadı."));
  }
}

export async function adjustQurbaniStock(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const explicit = formText(formData, "delta");
    const custom = formText(formData, "customDelta");
    const delta = Number(explicit || custom);
    const reason = formText(formData, "reason");
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 500)
      throw new Error(
        "Stok farkı -500 ile +500 arasında sıfır olmayan tam sayı olmalıdır.",
      );
    if (delta < 0 && !reason)
      throw new Error("Boş stok azaltılırken neden zorunludur.");
    await adjustQurbaniEmptyStockService(await getPayloadClient(), {
      batchId: formText(formData, "batchId", true),
      batchLineId: formText(formData, "batchLineId", true),
      delta,
      reason,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return {
      success: true,
      message: `Boş stok ${delta > 0 ? `+${delta}` : delta} güncellendi.`,
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Stok güncellenemedi."));
  }
}

export async function createQurbaniFieldPackage(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const poolIds = formData
      .getAll("poolIds")
      .map(String)
      .filter(Boolean);
    const idempotencyKey = formText(formData, "idempotencyKey", true);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    )
      throw new Error("Saha paketi işlem anahtarı geçerli değil.");
    const result = await createQurbaniFieldPackageService(
      await getPayloadClient(),
      {
        poolIds,
        operatorId: formText(formData, "operatorId", true),
        name: formText(formData, "name", true),
        dueAt: asIso(formText(formData, "dueAt")),
        notes: formText(formData, "notes"),
        allowEarly: formData.get("allowEarly") === "on",
        idempotencyKey,
        actorId: actor.id,
        actorEmail: actor.email,
      },
    );
    revalidateQurbani();
    return {
      success: true,
      message: result.idempotent
        ? `Mevcut ${result.code} saha paketi gösteriliyor.`
        : `${result.code} oluşturuldu; ${result.poolCodes.length} kurban kilitlenip saha görevine devredildi.`,
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Saha paketi oluşturulamadı."));
  }
}

export async function importManualQurbaniCsv(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size < 1)
      throw new Error("CSV dosyası seçilmelidir.");
    if (file.size > 2 * 1024 * 1024)
      throw new Error("CSV dosyası en fazla 2 MB olabilir.");
    const rows = parseQurbaniImportCsv(await file.text());
    const groups = groupQurbaniImportRows(rows);
    const idempotencyKey = formText(formData, "idempotencyKey", true);
    if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey))
      throw new Error("CSV işlem anahtarı geçerli değil.");
    const productIds = new Set(groups.map((group) => group.productId));
    const payload = await getPayloadClient();
    for (const productId of productIds)
      await payload.findByID({
        collection: "qurbani-products" as never,
        id: productId,
        depth: 0,
        overrideAccess: true,
      });
    const result = await importManualPaidQurbaniOrders(payload, {
      idempotencyKey,
      groups,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return {
      success: true,
      message: result.idempotent
        ? "Bu CSV daha önce içe aktarılmıştı; yeni kayıt oluşturulmadı."
        : `${rows.length} satır, ${result.groupCount} kesin ödenmiş sipariş grubu olarak içe aktarıldı.`,
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "CSV içe aktarılamadı."));
  }
}

export async function finalizePartialQurbaniPool(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const reason = formText(formData, "reason", true);
    const result = await finalizeIncompleteQurbaniPool(await getPayloadClient(), {
      poolId: formText(formData, "poolId", true),
      reason,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return {
      success: true,
      message: `Havuz ${result.oldCapacity} kapasiteden ${result.newCapacity} kesin hisseye düşürüldü ve saha devrine hazırlandı.`,
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Eksik havuz kesinleştirilemedi."));
  }
}

export async function setQurbaniStockBatchStatus(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const status = formText(formData, "status", true);
    if (
      ![
        "draft",
        "active",
        "paused",
        "preparing",
        "transferred",
        "completed",
        "archived",
      ].includes(status)
    )
      throw new Error("Stok durumu geçerli değil.");
    await setQurbaniStockBatchStatusService(await getPayloadClient(), {
      batchId: formText(formData, "batchId", true),
      status,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return { success: true, message: "Stok durumu güncellendi." };
  } catch (error) {
    return initialFailure(errorMessage(error, "Stok durumu güncellenemedi."));
  }
}

export async function updateQurbaniStockPrice(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const unitPrice = Number(formText(formData, "unitPrice", true));
    const currency = formText(formData, "currency", true).toUpperCase();
    const reason = formText(formData, "reason", true);
    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0 ||
      !["TRY", "USD", "EUR", "GBP"].includes(currency)
    )
      throw new Error("Yeni fiyat veya para birimi geçerli değil.");
    await updateQurbaniStockPriceService(await getPayloadClient(), {
      batchLineId: formText(formData, "batchLineId", true),
      unitPrice,
      currency,
      reason,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return { success: true, message: "Yeni fiyat revizyonu etkinleştirildi." };
  } catch (error) {
    return initialFailure(errorMessage(error, "Fiyat değiştirilemedi."));
  }
}

export async function createManualPaidQurbaniOrder(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const proxyMethod = formText(formData, "proxyMethod", true);
    const proxyAt = asIso(formText(formData, "proxyAt", true));
    if (!proxyAt || !["phone", "written", "digital"].includes(proxyMethod))
      throw new Error("Vekâlet yöntemi ve tarihi geçerli olmalıdır.");
    const shareCount = Number(formText(formData, "shareCount", true));
    const overridePriceText = formText(formData, "overridePrice");
    const overrideReason = formText(formData, "overrideReason");
    if (!Number.isInteger(shareCount) || shareCount < 1 || shareCount > 7)
      throw new Error("Hisse sayısı 1–7 arasında olmalıdır.");
    if (
      overridePriceText &&
      (!Number.isFinite(Number(overridePriceText)) ||
        Number(overridePriceText) <= 0 ||
        !overrideReason)
    )
      throw new Error(
        "Fiyat override için geçerli fiyat ve zorunlu neden girin.",
      );
    await createManualPaidQurbaniOrderService(await getPayloadClient(), {
      productId: formText(formData, "productId", true),
      shareCount,
      buyerName: formText(formData, "buyerName", true),
      buyerPhone: formText(formData, "buyerPhone", true),
      buyerEmail: formText(formData, "buyerEmail"),
      identityNumber: formText(formData, "identityNumber"),
      address: formText(formData, "address"),
      proxyMethod: proxyMethod as "phone" | "written" | "digital",
      proxyAt,
      note: formText(formData, "note"),
      overridePrice: overridePriceText ? Number(overridePriceText) : undefined,
      overrideReason: overrideReason || undefined,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return {
      success: true,
      message:
        "Manuel kesin ödenmiş kayıt oluşturuldu ve havuza yerleştirildi.",
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Manuel kayıt oluşturulamadı."));
  }
}

export async function assignQurbaniPool(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const poolId = formText(formData, "poolId", true);
    const operatorId = formText(formData, "operatorId", true);
    const payload = await getPayloadClient();
    const pool = (await payload.findByID({
      collection: "qurbani-pools" as never,
      id: poolId,
      depth: 2,
    })) as unknown as Record<string, unknown>;
    if (
      pool.lockedAt ||
      [
        "in_progress",
        "video_processing",
        "ready",
        "notified",
        "closed",
      ].includes(String(pool.status))
    )
      throw new Error("Saha süreci başlamış havuzun ataması değiştirilemez.");
    if (String(pool.status) !== "full")
      throw new Error(
        "Yalnızca kesin ödemelerle dolmuş havuz saha görevlisine atanabilir.",
      );
    if (pool.fieldTask)
      throw new Error("Bu havuz için saha görevi zaten oluşturulmuş.");
    const product =
      pool.product && typeof pool.product === "object"
        ? (pool.product as Record<string, unknown>)
        : null;
    const campaignId =
      product?.campaign &&
      typeof product.campaign === "object" &&
      "id" in product.campaign
        ? String((product.campaign as { id: unknown }).id)
        : String(product?.campaign || "");
    if (!campaignId)
      throw new Error("Kurbanlık seçeneğinin bağlı bağış alanı bulunamadı.");
    const fieldTask = await payload.create({
      collection: "field-tasks",
      data: {
        assignedTo: operatorId,
        campaign: campaignId,
        qurbaniPool: poolId,
        title: `${String(pool.code || "Kurban havuzu")} kesim ve video görevi`,
        location: String(product?.region || "Kurban operasyon sahası"),
        notes:
          "Kesim tamamlandıktan sonra kurban kodu görünür olacak şekilde videoyu yükleyin.",
        status: "todo",
      } as never,
    });
    const fieldTaskId = String(fieldTask.id);
    await payload.update({
      collection: "qurbani-pools" as never,
      id: poolId,
      data: { fieldTask: fieldTaskId, status: "assigned" } as never,
    });
    await audit({
      action: "qurbani.pool.assigned",
      actorEmail: actor.email,
      targetCollection: "qurbani-pools",
      targetId: poolId,
      details: { operatorId, fieldTaskId },
    });
    revalidateQurbani();
    return { success: true, message: "Havuz saha görevlisine atandı." };
  } catch (error) {
    return initialFailure(errorMessage(error, "Havuz atanamadı."));
  }
}

export async function markPowerOfAttorneyConfirmed(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const orderId = formText(formData, "orderId", true);
    await confirmQurbaniPowerOfAttorney(await getPayloadClient(), {
      orderId,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return { success: true, message: "Telefonla vekâlet teyidi kaydedildi." };
  } catch (error) {
    return initialFailure(errorMessage(error, "Vekâlet teyidi kaydedilemedi."));
  }
}

export async function approveQurbaniEft(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const orderId = formText(formData, "orderId", true);
    await approveQurbaniEftOrder(await getPayloadClient(), {
      orderId,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    revalidatePath("/panel/odemeler");
    return {
      success: true,
      message: "EFT dekontu onaylandı ve ödeme kesinleştirildi.",
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "EFT ödemesi onaylanamadı."));
  }
}

export async function transferQurbaniOrderToPool(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const orderId = formText(formData, "orderId", true);
    const targetPoolId = formText(formData, "targetPoolId", true);
    await transferQurbaniOrder(await getPayloadClient(), {
      orderId,
      targetPoolId,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return {
      success: true,
      message: "Sipariş ve bütün hisseleri hedef havuza aktarıldı.",
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Havuz transferi yapılamadı."));
  }
}

export async function approveQurbaniVideoRecord(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const videoId = formText(formData, "videoId", true);
    await approveQurbaniVideo(await getPayloadClient(), {
      videoId,
      actorId: actor.id,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return {
      success: true,
      message: "Video onaylandı. Mesaj hazırlama aşamasına geçebilirsiniz.",
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Video onaylanamadı."));
  }
}

export async function disconnectQurbaniWhatsApp(
  _: QurbaniActionState,
  _formData: FormData,
): Promise<QurbaniActionState> {
  await requireAdminUser(["super_admin"]);
  try {
    await disconnectEvolutionInstance();
    revalidateQurbani();
    return {
      success: true,
      message: "WhatsApp bağlantısı açık talebinizle kapatıldı.",
    };
  } catch (error) {
    return initialFailure(
      errorMessage(error, "WhatsApp bağlantısı kapatılamadı."),
    );
  }
}

export async function prepareQurbaniMessages(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const poolId = formText(formData, "poolId", true);
    const created = await prepareQurbaniMessageRecords(
      await getPayloadClient(),
      { poolId, actorId: actor.id, actorEmail: actor.email },
    );
    revalidateQurbani();
    return {
      success: true,
      message: `${created.length} tekilleştirilmiş WhatsApp mesajı hazırlandı.`,
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Mesajlar hazırlanamadı."));
  }
}

export async function sendQurbaniMessages(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  await requireAdminUser(["super_admin"]);
  try {
    const ids = formText(formData, "messageIds", true)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const result = await sendQueuedQurbaniMessages(
      await getPayloadClient(),
      ids,
    );
    revalidateQurbani();
    return {
      success: result.failed === 0,
      message: `${result.queued} mesaj 30-60 saniyelik güvenli aralıklarla gönderim kuyruğuna alındı.`,
    };
  } catch (error) {
    return initialFailure(errorMessage(error, "Mesajlar gönderilemedi."));
  }
}

export async function setQurbaniMessageDispatchState(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const dispatchBatchId = formText(formData, "dispatchBatchId", true);
    const action = formText(formData, "batchAction", true);
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(dispatchBatchId)) throw new Error("Mesaj gönderim partisi geçerli değil.");
    if (!["pause", "resume", "cancel"].includes(action)) throw new Error("Mesaj partisi işlemi geçerli değil.");
    const result = await setQurbaniMessageBatchState(await getPayloadClient(), { dispatchBatchId, action: action as "pause" | "resume" | "cancel" });
    await audit({ action: `qurbani.message_batch.${action}`, actorEmail: actor.email, targetCollection: "qurbani-messages", targetId: dispatchBatchId, details: { affected: result.affected } });
    revalidateQurbani();
    return { success: true, message: `${result.affected} mesaj kaydı güncellendi.` };
  } catch (error) { return initialFailure(errorMessage(error, "Mesaj gönderim partisi güncellenemedi.")); }
}

export async function revokeQurbaniTrackingLink(
  _: QurbaniActionState,
  formData: FormData,
): Promise<QurbaniActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const accessLinkId = formText(formData, "accessLinkId", true);
    await revokeQurbaniAccessLink(await getPayloadClient(), {
      accessLinkId,
      actorEmail: actor.email,
    });
    revalidateQurbani();
    return { success: true, message: "Kişisel takip bağlantısı iptal edildi." };
  } catch (error) {
    return initialFailure(
      errorMessage(error, "Takip bağlantısı iptal edilemedi."),
    );
  }
}
