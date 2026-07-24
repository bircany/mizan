import type { AdminUser } from "@/lib/admin/data";
import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type RawRecord = Record<string, unknown> & { id: string | number };

export type QurbaniSeasonAdminRecord = {
  id: string;
  year: number;
  status: string;
  salesStartAt: string;
  salesEndAt: string;
  feastAt: string;
  bankName: string;
  iban: string;
  proxyTextVersion: string;
  proxyText: string;
  titles: Record<"tr" | "en" | "ar", string>;
};

export type QurbaniProductAdminRecord = {
  id: string;
  seasonId: string;
  seasonYear: number | null;
  title: string;
  region: string;
  animalType: string;
  price: number;
  currency: string;
  capacity: number;
  isActive: boolean;
  campaignId: string;
  fundingPoolId: string;
  countryId: string;
  regionId: string;
};

export type QurbaniOrderAdminRecord = {
  id: string;
  publicId: string;
  buyerName: string;
  buyerPhone: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  shareCount: number;
  reservationExpiresAt: string;
  proofPath: string;
  proofUrl: string;
  powerOfAttorneyPhoneConfirmedAt: string;
  poolId: string;
  productId: string;
  seasonId: string;
  createdAt: string;
};

export type QurbaniShareAdminRecord = {
  id: string;
  orderId: string;
  ownerName: string;
  ownerPhone: string;
  effectivePhone: string;
  status: string;
  poolId: string;
};

export type QurbaniPoolAdminRecord = {
  id: string;
  code: string;
  productTitle: string;
  productId: string;
  seasonId: string;
  seasonYear: number | null;
  capacity: number;
  reservedCount: number;
  paidCount: number;
  status: string;
  fieldOperatorId: string;
  lockedAt: string;
  stockBatchLineId: string;
  ordinal: number;
};

export type QurbaniVideoAdminRecord = {
  id: string;
  poolId: string;
  poolCode: string;
  status: string;
  originalFilename: string;
  durationSeconds: number | null;
  createdAt: string;
  approvedAt: string;
};

export type QurbaniMessageAdminRecord = {
  id: string;
  poolId: string;
  poolCode: string;
  recipientPhone: string;
  shareCount: number;
  shareNames: string[];
  status: string;
  providerMessageId: string;
  errorMessage: string;
  accessLinkId: string;
  accessRevoked: boolean;
  dispatchBatchId: string;
};

export type QurbaniCountryAdminRecord = {
  id: string;
  isoCode: string;
  slug: string;
  name: string;
  isActive: boolean;
};
export type QurbaniRegionAdminRecord = {
  id: string;
  seasonId: string;
  countryId: string;
  slug: string;
  name: string;
  salesStartAt: string;
  salesEndAt: string;
  fieldPreparationAt: string;
  isActive: boolean;
};
export type QurbaniStockBatchAdminRecord = {
  id: string;
  seasonId: string;
  seasonYear: number | null;
  countryId: string;
  countryName: string;
  regionId: string;
  code: string;
  name: string;
  nature: string;
  status: string;
  animalCount: number;
  totalCapacity: number;
  availableCapacity: number;
  startsAt: string;
  endsAt: string;
};
export type QurbaniStockLineAdminRecord = {
  id: string;
  batchId: string;
  productId: string;
  productTitle: string;
  kind: string;
  animalCount: number;
  capacity: number;
  totalQuantity: number;
  status: string;
  unitPrice: number;
  currency: string;
  salesStartAt: string;
  salesEndAt: string;
};
export type QurbaniFieldPackageAdminRecord = {
  id: string;
  code: string;
  batchId: string;
  fieldTaskId: string;
  animalCount: number;
  status: string;
  preparedAt: string;
  name: string;
  operatorName: string;
  dueAt: string;
};
export type QurbaniDocumentAdminRecord = {
  id: string;
  batchId: string;
  title: string;
  kind: string;
  status: string;
  fileName: string;
  createdAt: string;
};

export type QurbaniAdminSnapshot = {
  seasons: QurbaniSeasonAdminRecord[];
  products: QurbaniProductAdminRecord[];
  orders: QurbaniOrderAdminRecord[];
  shares: QurbaniShareAdminRecord[];
  pools: QurbaniPoolAdminRecord[];
  videos: QurbaniVideoAdminRecord[];
  messages: QurbaniMessageAdminRecord[];
  operators: Array<{ label: string; value: string }>;
  campaigns: Array<{ label: string; value: string }>;
  fundingPools: Array<{
    campaignId: string;
    currency: string;
    label: string;
    value: string;
  }>;
  countries: QurbaniCountryAdminRecord[];
  regions: QurbaniRegionAdminRecord[];
  stockBatches: QurbaniStockBatchAdminRecord[];
  stockLines: QurbaniStockLineAdminRecord[];
  fieldPackages: QurbaniFieldPackageAdminRecord[];
  documents: QurbaniDocumentAdminRecord[];
  packagedPoolIds: string[];
  metrics: {
    activeSeason: number | null;
    reservedShares: number;
    paidShares: number;
    readyVideos: number;
    pendingMessages: number;
    openPools: number;
  };
};

function idOf(value: unknown) {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (value && typeof value === "object" && "id" in value)
    return String((value as { id: unknown }).id);
  return "";
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function relation(value: unknown): RawRecord | null {
  return value && typeof value === "object" && "id" in value
    ? (value as RawRecord)
    : null;
}

function localizedText(
  record: RawRecord,
  field: string,
  locale: "tr" | "en" | "ar",
) {
  const value = record[field];
  if (value && typeof value === "object" && locale in value)
    return text((value as Record<string, unknown>)[locale]);
  return locale === "tr" ? text(value) : "";
}

async function safeFind(
  collection: string,
  options: Record<string, unknown> = {},
) {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: collection as never,
      depth: 2,
      limit: 500,
      pagination: false,
      ...options,
    });
    return result.docs as unknown as RawRecord[];
  } catch (error) {
    console.warn(
      `${collection} panel verisi okunamadi.`,
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

function poolCode(value: unknown) {
  const pool = relation(value);
  return pool ? text(pool.code) : "";
}

export async function getQurbaniAdminSnapshot(
  user: AdminUser,
): Promise<QurbaniAdminSnapshot> {
  const isFieldOperator = user.role === "field_operator";
  const fieldFilter = isFieldOperator
    ? { "fieldTask.assignedTo": { equals: user.id } }
    : undefined;
  const [
    seasonDocs,
    productDocs,
    orderDocs,
    shareDocs,
    poolDocs,
    videoDocs,
    messageDocs,
    operatorDocs,
    campaignDocs,
    fundingPoolDocs,
    countryDocs,
    regionDocs,
    stockBatchDocs,
    stockLineDocs,
    priceRevisionDocs,
    fieldPackageDocs,
    fieldPackageItemDocs,
    documentDocs,
  ] = await Promise.all([
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-seasons", {
          sort: "-year",
          locale: "all",
          fallbackLocale: false,
        }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-products", {
          sort: "sortOrder",
          locale: "all",
          fallbackLocale: false,
        }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-orders", { sort: "-createdAt" }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-shares", { sort: "ownerName" }),
    safeFind("qurbani-pools", { sort: "-createdAt", where: fieldFilter }),
    safeFind("qurbani-videos", { sort: "-createdAt", where: fieldFilter }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-messages", { sort: "-createdAt" }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("users", {
          sort: "name",
          where: { role: { equals: "field_operator" } },
        }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("campaigns", {
          sort: "title",
          locale: "all",
          fallbackLocale: false,
          where: { isDonationOpen: { equals: true } },
        }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("campaign-funding-pools", {
          sort: "internalLabel",
          where: { isDonationOpen: { equals: true } },
        }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-countries", {
          sort: "sortOrder",
          locale: "all",
          fallbackLocale: false,
        }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-regions", {
          sort: "sortOrder",
          locale: "all",
          fallbackLocale: false,
        }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-stock-batches", { sort: "-createdAt" }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-stock-batch-lines", { sort: "sortOrder", depth: 2 }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-price-revisions", { sort: "-revision", depth: 0 }),
    safeFind("qurbani-field-packages", {
      sort: "-createdAt",
      where: fieldFilter,
    }),
    safeFind("qurbani-field-package-items", {
      sort: "sortOrder",
      where: fieldFilter,
    }),
    isFieldOperator
      ? Promise.resolve([])
      : safeFind("qurbani-documents", { sort: "-createdAt", depth: 1 }),
  ]);

  const seasons = seasonDocs.map((record): QurbaniSeasonAdminRecord => ({
    id: idOf(record),
    year: number(record.year),
    status: text(record.status, "draft"),
    salesStartAt: text(record.salesStartAt),
    salesEndAt: text(record.salesEndAt),
    feastAt: text(record.eidAt),
    bankName: text(record.bankName),
    iban: text(record.iban),
    proxyTextVersion: text(record.proxyTextVersion, "1.0"),
    proxyText: localizedText(record, "proxyText", "tr"),
    titles: {
      tr: localizedText(record, "heroTitle", "tr"),
      en: localizedText(record, "heroTitle", "en"),
      ar: localizedText(record, "heroTitle", "ar"),
    },
  }));

  const products = productDocs.map((record): QurbaniProductAdminRecord => {
    const season = relation(record.season);
    return {
      id: idOf(record),
      seasonId: idOf(record.season),
      seasonYear: season ? number(season.year) : null,
      title: localizedText(record, "title", "tr") || text(record.name),
      region: localizedText(record, "region", "tr"),
      animalType: text(record.kind),
      price: number(record.price),
      currency: text(record.currency, "TRY"),
      capacity: number(record.capacity, 1),
      isActive: bool(record.isActive, true),
      campaignId: idOf(record.campaign),
      fundingPoolId: idOf(record.fundingPool),
      countryId: idOf(record.country),
      regionId: idOf(record.regionRef),
    };
  });

  const orders = await Promise.all(
    orderDocs.map(async (record): Promise<QurbaniOrderAdminRecord> => {
      const proofPath = text(record.eftProofPath);
      const proofBucket = text(record.eftProofBucket, "qurbani-eft-proofs");
      let proofUrl = "";
      if (proofPath) {
        try {
          const signed = await getSupabaseServiceClient()
            .storage.from(proofBucket)
            .createSignedUrl(proofPath, 300);
          proofUrl = signed.data?.signedUrl || "";
        } catch (error) {
          console.warn(
            "Kurban EFT dekont bağlantısı oluşturulamadı.",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
      return {
        id: idOf(record),
        publicId: text(record.publicId || record.orderNumber, idOf(record)),
        buyerName: text(record.buyerName),
        buyerPhone: text(record.buyerPhone),
        paymentMethod: text(record.paymentMethod),
        paymentStatus: text(record.paymentStatus || record.status, "reserved"),
        totalAmount: number(record.totalAmount),
        currency: text(record.currency, "TRY"),
        shareCount: number(record.shareCount),
        reservationExpiresAt: text(record.reservedUntil),
        proofPath,
        proofUrl,
        powerOfAttorneyPhoneConfirmedAt: text(record.phoneProxyConfirmedAt),
        poolId: idOf(record.pool),
        productId: idOf(record.product),
        seasonId: idOf(record.season),
        createdAt: text(record.createdAt),
      };
    }),
  );

  const shares = shareDocs.map((record): QurbaniShareAdminRecord => ({
    id: idOf(record),
    orderId: idOf(record.order),
    ownerName: text(record.ownerName),
    ownerPhone: text(record.ownerPhone),
    effectivePhone: text(record.effectivePhone || record.ownerPhone),
    status: text(record.status, "reserved"),
    poolId: idOf(record.pool),
  }));

  const pools = poolDocs.map((record): QurbaniPoolAdminRecord => {
    const product = relation(record.product);
    const season = relation(record.season) || relation(product?.season);
    return {
      id: idOf(record),
      code: text(record.code),
      productTitle: product
        ? localizedText(product, "title", "tr") || text(product.name)
        : "Kurbanlık seçeneği",
      productId: idOf(record.product),
      seasonId: idOf(record.season),
      seasonYear: season ? number(season.year) : null,
      capacity: number(record.capacity, 1),
      reservedCount: number(record.reservedCount),
      paidCount: number(record.confirmedCount),
      status: text(record.status, "open"),
      fieldOperatorId: idOf(relation(record.fieldTask)?.assignedTo),
      lockedAt: text(record.lockedAt),
      stockBatchLineId: idOf(record.stockBatchLine),
      ordinal: number(record.ordinal),
    };
  });

  const videos = videoDocs.map((record): QurbaniVideoAdminRecord => ({
    id: idOf(record),
    poolId: idOf(record.pool),
    poolCode: poolCode(record.pool),
    status: text(record.status, "uploaded"),
    originalFilename: text(record.originalFilename || record.fileName),
    durationSeconds:
      record.durationSeconds == null ? null : number(record.durationSeconds),
    createdAt: text(record.createdAt),
    approvedAt: text(record.approvedAt),
  }));

  const messages = messageDocs.map((record): QurbaniMessageAdminRecord => ({
    id: idOf(record),
    poolId: idOf(record.pool),
    poolCode: poolCode(record.pool),
    recipientPhone: text(record.recipientPhone),
    shareCount: number(
      (record.shareSummary as Record<string, unknown> | undefined)?.count,
    ),
    shareNames: Array.isArray(
      (record.shareSummary as Record<string, unknown> | undefined)?.names,
    )
      ? (
          (record.shareSummary as Record<string, unknown>).names as unknown[]
        ).map(String)
      : [],
    status: text(record.status, "queued"),
    providerMessageId: text(record.providerMessageId),
    errorMessage: text(record.lastError),
    accessLinkId: idOf(record.accessLink),
    accessRevoked: Boolean(relation(record.accessLink)?.revokedAt),
    dispatchBatchId: text(record.dispatchBatchId),
  }));

  const countries = countryDocs.map((record): QurbaniCountryAdminRecord => ({
    id: idOf(record),
    isoCode: text(record.isoCode).toUpperCase(),
    slug: text(record.slug),
    name: localizedText(record, "name", "tr"),
    isActive: bool(record.isActive, true),
  }));
  const regions = regionDocs.map((record): QurbaniRegionAdminRecord => ({
    id: idOf(record),
    seasonId: idOf(record.season),
    countryId: idOf(record.country),
    slug: text(record.slug),
    name: localizedText(record, "name", "tr"),
    salesStartAt: text(record.salesStartAt),
    salesEndAt: text(record.salesEndAt),
    fieldPreparationAt: text(record.fieldPreparationAt),
    isActive: bool(record.isActive, true),
  }));
  const stockBatches = stockBatchDocs.map(
    (record): QurbaniStockBatchAdminRecord => {
      const season = relation(record.season);
      const country = relation(record.country);
      return {
        id: idOf(record),
        seasonId: idOf(record.season),
        seasonYear: season ? number(season.year) : null,
        countryId: idOf(record.country),
        countryName: country ? localizedText(country, "name", "tr") : "",
        regionId: idOf(record.region),
        code: text(record.code),
        name: text(record.name),
        nature: text(record.nature, "planned"),
        status: text(record.status, "draft"),
        animalCount: number(record.animalCount),
        totalCapacity: number(record.totalCapacity),
        availableCapacity: number(record.availableCapacity),
        startsAt: text(record.startsAt || record.salesStartAt),
        endsAt: text(record.endsAt || record.salesEndAt),
      };
    },
  );
  const revisionByLine = new Map<string, RawRecord>();
  for (const revision of priceRevisionDocs) {
    const lineId = idOf(revision.batchLine);
    if (
      lineId &&
      (!revisionByLine.has(lineId) || text(revision.status) === "active")
    )
      revisionByLine.set(lineId, revision);
  }
  const stockLines = stockLineDocs.map(
    (record): QurbaniStockLineAdminRecord => {
      const product = relation(record.product);
      const revision = revisionByLine.get(idOf(record));
      return {
        id: idOf(record),
        batchId: idOf(record.batch),
        productId: idOf(record.product),
        productTitle: product
          ? localizedText(product, "title", "tr")
          : "Kurbanlık seçeneği",
        kind: text(record.kind),
        animalCount: number(record.animalCount),
        capacity: number(record.capacity, 1),
        totalQuantity: number(record.totalQuantity),
        status: text(record.status, "active"),
        unitPrice: number(revision?.unitPrice),
        currency: text(revision?.currency, "TRY"),
        salesStartAt: text(record.salesStartAt),
        salesEndAt: text(record.salesEndAt),
      };
    },
  );
  const fieldPackages = fieldPackageDocs.map(
    (record): QurbaniFieldPackageAdminRecord => ({
      id: idOf(record),
      code: text(record.code || record.packageNumber),
      batchId: idOf(record.stockBatch || record.batch),
      fieldTaskId: idOf(record.fieldTask),
      animalCount: fieldPackageItemDocs.filter(
        (item) => idOf(item.fieldPackage) === idOf(record),
      ).length,
      status: text(record.status, "draft"),
      preparedAt: text(record.preparedAt),
      name: text(record.name),
      operatorName: text(relation(record.assignedTo)?.name),
      dueAt: text(record.dueAt),
    }),
  );
  const documents = documentDocs.map((record): QurbaniDocumentAdminRecord => ({
    id: idOf(record),
    batchId: idOf(record.stockBatch || record.batch),
    title: text(record.title),
    kind: text(record.kind, "other"),
    status: text(record.status, "active"),
    fileName: text(record.fileName),
    createdAt: text(record.createdAt),
  }));

  return {
    seasons,
    products,
    orders,
    shares,
    pools,
    videos,
    messages,
    countries,
    regions,
    stockBatches,
    stockLines,
    fieldPackages,
    documents,
    packagedPoolIds: fieldPackageItemDocs.map((item) => idOf(item.pool)).filter(Boolean),
    operators: operatorDocs.map((record) => ({
      label: text(record.name) || text(record.email),
      value: idOf(record),
    })),
    campaigns: campaignDocs.map((record) => ({
      label: localizedText(record, "title", "tr") || text(record.code),
      value: idOf(record),
    })),
    fundingPools: fundingPoolDocs.map((record) => ({
      campaignId: idOf(record.campaign),
      currency: text(record.currency, "TRY"),
      label: text(record.internalLabel) || localizedText(record, "title", "tr"),
      value: idOf(record),
    })),
    metrics: {
      activeSeason:
        seasons.find((season) => season.status === "active")?.year ?? null,
      reservedShares: shares.filter((share) => share.status === "reserved")
        .length,
      paidShares: shares.filter((share) =>
        ["paid", "confirmed"].includes(share.status),
      ).length,
      readyVideos: videos.filter((video) =>
        ["ready_for_review", "approved"].includes(video.status),
      ).length,
      pendingMessages: messages.filter((message) =>
        ["pending", "queued", "failed"].includes(message.status),
      ).length,
      openPools: pools.filter((pool) => pool.status === "open").length,
    },
  };
}
