"use server";

import { revalidatePath } from "next/cache";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";

import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS, type PanelRouteKey } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { ContentCollection } from "@/lib/admin/content";

export type ContentActionState = {
  message: string | null;
  success: boolean;
};

type PayloadClient = Awaited<ReturnType<typeof getPayloadClient>>;
type DocId = string | number;
type ResolvedContentData = {
  data: Record<string, unknown>;
  pools?: FundingPoolInput[];
  previousCoverPath?: string;
  uploadedCoverPath?: string;
  uploadedCoverMediaId?: DocId;
};

const CAMPAIGN_COVER_BUCKET = "campaign-covers";
const CAMPAIGN_COVER_MAX_BYTES = 10 * 1024 * 1024;

type UploadedFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name: string;
  size: number;
  type: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function extractDocId(document: unknown) {
  if (!document || typeof document !== "object") return null;
  const record = document as { id?: unknown };
  const recordId = record.id;
  return typeof recordId === "string" || typeof recordId === "number" ? recordId : null;
}

async function findDocIdsByWhere(payload: PayloadClient, collection: string, where: any) {
  const result = await payload.find({
    collection,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
    where,
  });

  return result.docs.map(extractDocId).filter((id): id is DocId => id !== null);
}

async function deleteDocsByIds(payload: PayloadClient, collection: string, ids: DocId[]) {
  let deleted = 0;
  for (const id of ids) {
    await payload.delete({ collection, id });
    deleted += 1;
  }

  return deleted;
}

async function deleteDocsByWhere(payload: PayloadClient, collection: string, where: any) {
  const ids = await findDocIdsByWhere(payload, collection, where);
  return deleteDocsByIds(payload, collection, ids);
}

async function deleteLedgerTablesForCampaignIds(campaignIds: DocId[]) {
  if (!campaignIds.length) return { entriesDeleted: 0, totalsDeleted: 0 };

  const campaignIdStrings = campaignIds.map(String);
  const client = getSupabaseServiceClient();

  const [entriesResult, totalsResult] = await Promise.all([
    client.from("payment_ledger_entries").delete({ count: "exact" }).in("campaign_id", campaignIdStrings),
    client.from("campaign_financial_totals").delete({ count: "exact" }).in("campaign_id", campaignIdStrings),
  ]);

  if (entriesResult.error) throw entriesResult.error;
  if (totalsResult.error) throw totalsResult.error;

  return {
    entriesDeleted: entriesResult.count ?? 0,
    totalsDeleted: totalsResult.count ?? 0,
  };
}

async function cleanupCampaignLinkedRecordsByIds(payload: PayloadClient, campaignIds: DocId[]) {
  if (!campaignIds.length) {
    return {
      reportsDeleted: 0,
      refundsDeleted: 0,
      fulfillmentsDeleted: 0,
      eventsDeleted: 0,
      sessionsDeleted: 0,
      intentsDeleted: 0,
      proofsDeleted: 0,
      tasksDeleted: 0,
      donationsDeleted: 0,
      ledgerEntriesDeleted: 0,
      ledgerTotalsDeleted: 0,
    };
  }

  const donationIds = await findDocIdsByWhere(payload, "donations", { campaign: { in: campaignIds } });
  const intentIds = await findDocIdsByWhere(payload, "donation-intents", { campaign: { in: campaignIds } });
  const sessionIds = await findDocIdsByWhere(payload, "payment-sessions", { donationIntent: { in: intentIds } });
  const reportIds = await findDocIdsByWhere(payload, "donor-reports", { donation: { in: donationIds } });
  const refundIds = await findDocIdsByWhere(payload, "refund-requests", { donation: { in: donationIds } });
  const fulfillmentIds = await findDocIdsByWhere(payload, "donation-fulfillments", { donation: { in: donationIds } });
  const eventIds = await findDocIdsByWhere(payload, "payment-events", { paymentSession: { in: sessionIds } });
  const proofIds = await findDocIdsByWhere(payload, "proof-submissions", { campaign: { in: campaignIds } });
  const taskIds = await findDocIdsByWhere(payload, "field-tasks", { campaign: { in: campaignIds } });

  const reportsDeleted = await deleteDocsByIds(payload, "donor-reports", reportIds);
  const refundsDeleted = await deleteDocsByIds(payload, "refund-requests", refundIds);
  const fulfillmentsDeleted = await deleteDocsByIds(payload, "donation-fulfillments", fulfillmentIds);
  const eventsDeleted = await deleteDocsByIds(payload, "payment-events", eventIds);
  const sessionsDeleted = await deleteDocsByIds(payload, "payment-sessions", sessionIds);
  const intentsDeleted = await deleteDocsByIds(payload, "donation-intents", intentIds);
  const proofsDeleted = await deleteDocsByIds(payload, "proof-submissions", proofIds);
  const tasksDeleted = await deleteDocsByIds(payload, "field-tasks", taskIds);
  const donationsDeleted = await deleteDocsByIds(payload, "donations", donationIds);
  const ledgerDeleted = await deleteLedgerTablesForCampaignIds(campaignIds);

  return {
    reportsDeleted,
    refundsDeleted,
    fulfillmentsDeleted,
    eventsDeleted,
    sessionsDeleted,
    intentsDeleted,
    proofsDeleted,
    tasksDeleted,
    donationsDeleted,
    ledgerEntriesDeleted: ledgerDeleted.entriesDeleted,
    ledgerTotalsDeleted: ledgerDeleted.totalsDeleted,
  };
}

const contentRouteMap: Record<ContentCollection, PanelRouteKey> = {
  campaigns: "contentCampaigns",
  categories: "contentCategories",
  news: "contentNews",
  pages: "contentPages",
};

const contentPathMap: Record<ContentCollection, string> = {
  campaigns: "/panel/icerik/bagis-alanlari",
  categories: "/panel/icerik/kategoriler",
  news: "/panel/icerik/haberler",
  pages: "/panel/icerik/sayfalar",
};

function readText(formData: FormData, name: string, required = false) {
  const value = String(formData.get(name) || "").trim();
  if (required && !value) throw new Error(`${name} zorunludur.`);
  return value;
}

function readCollection(formData: FormData): ContentCollection {
  const collection = readText(formData, "collection", true);
  if (collection === "campaigns" || collection === "categories" || collection === "news" || collection === "pages") {
    return collection;
  }

  throw new Error("Geçersiz içerik türü.");
}

type ContentLocale = "tr" | "en" | "ar";

function localeEntries(pool: FundingPoolInput) {
  return Object.entries(pool.translations).filter(
    (entry): entry is [ContentLocale, NonNullable<FundingPoolInput["translations"][ContentLocale]>] => Boolean(entry[1]),
  );
}

function plainTitle(value: string, label: string) {
  const title = value.trim();
  if (!title) throw new Error(`${label} başlığı zorunludur.`);

  const looksLikeSerializedData = title.startsWith("{") || title.startsWith("[") || title.startsWith('"');
  if (looksLikeSerializedData) {
    try {
      JSON.parse(title);
      throw new Error(`${label} basligi JSON degil, duz metin olmalidir.`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("duz metin")) throw error;
    }
  }

  try {
    const parsed = JSON.parse(title);
    if (parsed && typeof parsed === "object") {
      throw new Error(`${label} başlığı JSON değil, düz metin olmalıdır.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("düz metin")) throw error;
  }

  return title;
}

function localized(value: string) {
  return { tr: value };
}

type FundingPoolInput = {
  id?: string;
  currency: "TRY" | "USD" | "EUR" | "GBP";
  isDonationOpen: boolean;
  reportingMode: "pool" | "donation_based";
  targetAmount: number;
  translations: Partial<Record<"tr" | "en" | "ar", { category: number; description: string; title: string }>>;
};

function localizedRichText(value: ReturnType<typeof plainTextEditorState>) {
  return { tr: value };
}

function parseFundingPools(formData: FormData): FundingPoolInput[] {
  const raw = readText(formData, "fundingPools", true);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Para birimi havuzları okunamadı.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("En az bir para birimi havuzu seçin.");

  const selectedLocales = String(formData.get("selectedLocales") || "").split(",").filter((locale): locale is "tr" | "en" | "ar" => locale === "tr" || locale === "en" || locale === "ar");
  if (!selectedLocales.length) throw new Error("En az bir dil seçin.");
  const currencies = new Set<string>();
  return parsed.map((pool, index) => {
    if (!pool || typeof pool !== "object") throw new Error(`Havuz ${index + 1} geçersiz.`);
    const record = pool as Record<string, unknown>;
    const currency = parseCurrency(String(record.currency || "")) as FundingPoolInput["currency"];
    if (currencies.has(currency)) throw new Error(`${currency} için yalnızca bir havuz oluşturabilirsiniz.`);
    currencies.add(currency);
    const translationsRecord = record.translations;
    if (!translationsRecord || typeof translationsRecord !== "object") throw new Error(`${currency} için dil içerikleri eksik.`);

    const translations: FundingPoolInput["translations"] = {};
    for (const locale of selectedLocales) {
      const translation = (translationsRecord as Record<string, unknown>)[locale];
      if (!translation || typeof translation !== "object") throw new Error(`${currency} için ${locale.toUpperCase()} içeriği zorunludur.`);
      const content = translation as Record<string, unknown>;
      const title = plainTitle(String(content.title || ""), `${currency} ${locale.toUpperCase()}`);
      const description = String(content.description || "").trim();
      if (!title || !description) throw new Error(`${currency} için ${locale.toUpperCase()} başlık ve açıklama zorunludur.`);
      translations[locale] = {
        category: parseRelationId(String(content.category || ""), `${locale.toUpperCase()} kategori`),
        description,
        title,
      };
    }

    return {
      id: typeof record.id === "string" ? record.id : undefined,
      currency,
      isDonationOpen: record.isDonationOpen !== false,
      reportingMode: record.reportingMode === "donation_based" ? "donation_based" : "pool",
      targetAmount: parsePositiveAmount(String(record.targetAmount || "")),
      translations,
    };
  });
}

function plainTextEditorState(text: string) {
  return {
    root: {
      children: [
        {
          children: [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }],
          direction: "ltr",
          format: "",
          indent: 0,
          textFormat: 0,
          textStyle: "",
          type: "paragraph",
          version: 1,
        },
      ],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

function parsePositiveAmount(value: string) {
  const amount = Number(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Hedef tutar geçersiz.");
  return amount;
}

function parseNewsCategory(value: string) {
  return ["haber", "etkinlik", "duyuru", "proje"].includes(value) ? value : "haber";
}

function parseCurrency(value: string) {
  return ["TRY", "USD", "EUR", "GBP"].includes(value) ? value : "TRY";
}

function parseReportingMode(value: string) {
  return value === "donation_based" ? "donation_based" : "pool";
}

function parseRelationId(value: string, fieldName: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${fieldName} geçersiz.`);
  }

  return id;
}

function safeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-");
  return normalized.replace(/-+/g, "-").replace(/^-|-$|^$/g, "dosya").slice(0, 120);
}

function uploadedFile(value: FormDataEntryValue | null): UploadedFile | null {
  if (!value || typeof value === "string") return null;
  const candidate = value as Partial<UploadedFile>;
  if (
    typeof candidate.arrayBuffer !== "function" ||
    typeof candidate.name !== "string" ||
    typeof candidate.size !== "number" ||
    typeof candidate.type !== "string"
  ) {
    return null;
  }

  return candidate as UploadedFile;
}

function getLocalizedString(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "tr" in value) {
    const localizedValue = (value as { tr?: unknown }).tr;
    return typeof localizedValue === "string" ? localizedValue : "";
  }

  return "";
}

async function uploadCampaignCoverImage(file: UploadedFile, slug: string, payload: PayloadClient) {
  if (file.size > CAMPAIGN_COVER_MAX_BYTES) {
    throw new Error("Kapak fotografi en fazla 10 MB olabilir.");
  }
  if (!file.size) throw new Error("Kapak fotoğrafı boş olamaz.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Kapak fotoğrafı için jpeg, png veya webp yükleyin.");
  }

  const filename = `${safeFileName(slug)}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const media = await payload.create({
    collection: "media",
    data: { alt: slug },
    file: {
      data: Buffer.from(await file.arrayBuffer()),
      mimetype: file.type,
      name: filename,
      size: file.size,
    },
  });
  const mediaId = extractDocId(media);
  if (!mediaId) throw new Error("Kapak fotoğrafı yerel medya kaydına bağlanamadı.");
  return {
    path: "",
    url: typeof media.url === "string" ? media.url : `/media/${filename}`,
    mediaId,
  };
}

async function removeCampaignCoverImage(path?: string | null) {
  if (!path) return;
  const storage = getSupabaseServiceClient();
  const { error } = await storage.storage.from(CAMPAIGN_COVER_BUCKET).remove([path]);
  if (error) {
    console.warn("Kapak fotoğrafı temizlenemedi:", error.message);
  }
}

function slugifyText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getLocalizedInput(formData: FormData, name: string, required = false) {
  const value = readText(formData, name, required);
  return value;
}

async function buildCampaignIdentifiers(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  title: string,
  existingId?: string,
  currentRecord?: Record<string, unknown> | null,
) {
  const base = slugifyText(title) || "bagis-alani";
  const currentSlug = currentRecord && typeof currentRecord.slug === "string" ? currentRecord.slug : "";
  const currentCode = currentRecord && typeof currentRecord.code === "string" ? currentRecord.code : "";
  if (existingId && currentSlug === base && currentCode) {
    return {
      code: currentCode,
      slug: currentSlug,
    };
  }

  let candidate = base;

  for (let index = 0; index < 20; index += 1) {
    const result = await payload.find({
      collection: "campaigns",
      limit: 1,
      pagination: false,
      overrideAccess: true,
      where: existingId
        ? {
            and: [
              {
                slug: {
                  equals: candidate,
                },
              },
              {
                id: {
                  not_equals: existingId,
                },
              },
            ],
          }
        : {
            slug: {
              equals: candidate,
            },
          },
    });

    if (result.totalDocs === 0) {
      return {
        code: candidate,
        slug: candidate,
      };
    }

    candidate = `${base}-${index + 2}`;
  }

  const fallback = `${base}-${Date.now()}`;
  return {
    code: fallback,
    slug: fallback,
  };
}

async function contentData(
  collection: ContentCollection,
  formData: FormData,
  payload?: Awaited<ReturnType<typeof getPayloadClient>>,
  existingId?: string,
) {
  if (collection === "campaigns") {
    const pools = parseFundingPools(formData);
    const primaryPool = pools[0];
    const primaryTranslation = primaryPool.translations.tr || Object.values(primaryPool.translations)[0];
    if (!primaryTranslation) throw new Error("Bağış alanı için dil içeriği bulunamadı.");
    const title = primaryTranslation.title;
    const currentRecord =
      payload && existingId
        ? ((await payload.findByID({
            collection: "campaigns",
            id: existingId,
            depth: 0,
            overrideAccess: true,
          })) as unknown as Record<string, unknown>)
        : null;
    const identifiers = payload
      ? await buildCampaignIdentifiers(payload, title, existingId, currentRecord)
      : { code: slugifyText(title), slug: slugifyText(title) };
    const coverFile = uploadedFile(formData.get("coverImage"));
    const previousCoverPath = currentRecord && typeof currentRecord.coverImagePath === "string" ? currentRecord.coverImagePath : "";
    const coverImageAlt = primaryTranslation.title;
    const resolvedCover =
      coverFile && coverFile.size > 0
        ? await uploadCampaignCoverImage(coverFile, identifiers.slug, payload as PayloadClient)
        : null;

    return {
      data: {
        category: primaryTranslation.category,
        code: identifiers.code,
        coverImageAlt,
        coverImagePath: resolvedCover ? "" : (previousCoverPath || undefined),
        image: resolvedCover?.mediaId,
        // Legacy parent fields are retained while totals move to funding pools.
        currency: primaryPool.currency,
        description: plainTextEditorState(primaryTranslation.description),
        isDonationOpen: pools.some((pool) => pool.isDonationOpen),
        reportingMode: primaryPool.reportingMode,
        slug: identifiers.slug,
        targetAmount: 0,
        title: primaryTranslation.title,
      },
      pools,
      previousCoverPath: previousCoverPath || undefined,
      uploadedCoverPath: resolvedCover?.path,
      uploadedCoverMediaId: resolvedCover?.mediaId,
    };
  }

  if (collection === "categories") {
    return {
      color: readText(formData, "color"),
      icon: readText(formData, "icon"),
      name: localized(readText(formData, "name", true)),
      slug: readText(formData, "slug", true),
    };
  }

  if (collection === "news") {
    const content = readText(formData, "content");
    const publishedAt = readText(formData, "publishedAt");
    return {
      author: readText(formData, "author"),
      category: parseNewsCategory(readText(formData, "category")),
      content: content ? localizedRichText(plainTextEditorState(content)) : undefined,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      slug: readText(formData, "slug", true),
      title: localized(readText(formData, "title", true)),
    };
  }

  const content = readText(formData, "content");
  return {
    content: content ? localizedRichText(plainTextEditorState(content)) : undefined,
    published: formData.get("published") === "on",
    slug: readText(formData, "slug", true),
    title: localized(readText(formData, "title", true)),
  };
}

async function validateFundingPoolCategories(payload: PayloadClient, pools: FundingPoolInput[]) {
  const categoryIds = [...new Set(
    pools.flatMap((pool) => Object.values(pool.translations).map((translation) => translation?.category).filter((id): id is number => typeof id === "number")),
  )];
  const categories = await payload.find({
    collection: "categories",
    depth: 0,
    limit: categoryIds.length,
    pagination: false,
    where: { and: [{ id: { in: categoryIds } }, { isActive: { equals: true } }] },
  });
  const foundIds = new Set(categories.docs.map((category) => Number((category as { id: number }).id)));
  const missingId = categoryIds.find((id) => !foundIds.has(id));

  if (missingId !== undefined) {
    throw new Error("Seçilen kategori artık bulunmuyor. Kategori listesini yenileyip tekrar seçin.");
  }
}

async function saveLocalizedCampaign(
  payload: PayloadClient,
  id: string,
  result: ResolvedContentData,
  user: Parameters<typeof createLocalReq>[0]["user"],
) {
  const pools = result.pools || [];
  const primaryPool = pools[0];
  const primaryEntries = primaryPool ? localeEntries(primaryPool) : [];
  const primaryEntry = primaryEntries.find(([locale]) => locale === "tr") || primaryEntries[0];
  if (!primaryPool || !primaryEntry) throw new Error("Bağış alanı için dil içeriği bulunamadı.");

  await validateFundingPoolCategories(payload, pools);
  const req = await createLocalReq({ user }, payload);
  await initTransaction(req);

  try {
    const [primaryLocale, primaryTranslation] = primaryEntry;
    const campaignData = {
      ...result.data,
      description: plainTextEditorState(primaryTranslation.description),
      title: primaryTranslation.title,
    };
    const savedCampaign = id
      ? await payload.update({ collection: "campaigns", data: campaignData, fallbackLocale: false, id, locale: primaryLocale, req })
      : await payload.create({ collection: "campaigns", data: campaignData, fallbackLocale: false, locale: primaryLocale, req });
    const campaignId = extractDocId(savedCampaign);
    if (!campaignId) throw new Error("Bağış alanı kaydedildi ancak kimliği okunamadı.");

    for (const [locale, translation] of primaryEntries) {
      if (locale === primaryLocale) continue;
      await payload.update({
        collection: "campaigns",
        data: {
          description: plainTextEditorState(translation.description),
          title: translation.title,
        },
        fallbackLocale: false,
        id: campaignId,
        locale,
        req,
      });
    }

    const retainedPoolIds = new Set<string>();
    for (const pool of pools) {
      const entries = localeEntries(pool);
      const firstEntry = entries.find(([locale]) => locale === "tr") || entries[0];
      if (!firstEntry) throw new Error(`${pool.currency} havuzu için dil içeriği bulunamadı.`);
      const [firstLocale, firstTranslation] = firstEntry;
      const availableLocales = entries.map(([locale]) => locale);
      const poolData = {
        availableLocales,
        campaign: campaignId,
        category: firstTranslation.category,
        coverImageAlt: firstTranslation.title,
        currency: pool.currency,
        description: plainTextEditorState(firstTranslation.description),
        internalLabel: `${pool.currency} havuzu`,
        isDonationOpen: pool.isDonationOpen,
        reportingMode: pool.reportingMode,
        targetAmount: pool.targetAmount,
        title: firstTranslation.title,
      };
      const savedPool = pool.id
        ? await payload.update({ collection: "campaign-funding-pools", data: poolData, fallbackLocale: false, id: pool.id, locale: firstLocale, req })
        : await payload.create({ collection: "campaign-funding-pools", data: poolData, fallbackLocale: false, locale: firstLocale, req });
      const poolId = extractDocId(savedPool);
      if (!poolId) throw new Error(`${pool.currency} havuzu kaydedildi ancak kimliği okunamadı.`);
      retainedPoolIds.add(String(poolId));

      for (const [locale, translation] of entries) {
        if (locale === firstLocale) continue;
        await payload.update({
          collection: "campaign-funding-pools",
          data: {
            category: translation.category,
            coverImageAlt: translation.title,
            description: plainTextEditorState(translation.description),
            title: translation.title,
          },
          fallbackLocale: false,
          id: poolId,
          locale,
          req,
        });
      }
    }

    if (id) {
      const existingPools = await payload.find({
        collection: "campaign-funding-pools",
        depth: 0,
        fallbackLocale: false,
        limit: 100,
        pagination: false,
        req,
        where: { campaign: { equals: campaignId } },
      });
      for (const existingPool of existingPools.docs) {
        const existingPoolId = extractDocId(existingPool);
        if (existingPoolId !== null && !retainedPoolIds.has(String(existingPoolId))) {
          await payload.delete({ collection: "campaign-funding-pools", id: existingPoolId, req });
        }
      }
    }

    await commitTransaction(req);
    return savedCampaign;
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}

export async function saveContentRecord(_: ContentActionState, formData: FormData): Promise<ContentActionState> {
  const collection = readCollection(formData);
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS[contentRouteMap[collection]]);

  let result: ResolvedContentData | null = null;
  try {
    const payload = await getPayloadClient();
    const id = readText(formData, "id");
    const contentResult = await contentData(collection, formData, payload, id || undefined);
    const isCampaignContent = collection === "campaigns";
    const data = isCampaignContent ? (contentResult as ResolvedContentData).data : contentResult;
    result = isCampaignContent ? (contentResult as ResolvedContentData) : null;

    if (collection === "campaigns" && result) {
      await saveLocalizedCampaign(payload, id, result, { ...user, collection: "users" });
    }
    else if (id) await payload.update({ collection, data, id });
    else await payload.create({ collection, data });

    if (collection === "campaigns" && result) {
      if (result.uploadedCoverPath && result.previousCoverPath && result.uploadedCoverPath !== result.previousCoverPath) {
        await removeCampaignCoverImage(result.previousCoverPath);
      }
    }

    revalidatePath(contentPathMap[collection]);
    revalidatePath("/panel");
    return { message: id ? "İçerik kaydı güncellendi." : "Yeni içerik kaydı oluşturuldu.", success: true };
  } catch (error) {
    console.error("saveContentRecord failed:", error);
    if (result?.uploadedCoverPath) {
      await removeCampaignCoverImage(result.uploadedCoverPath);
    }
    return {
      message: getErrorMessage(error, "Kayıt kaydedilemedi. Zorunlu alanları ve benzersiz URL kısalığını kontrol edin."),
      success: false,
    };
  }
}

export async function deleteContentRecord(_: ContentActionState, formData: FormData): Promise<ContentActionState> {
  const collection = readCollection(formData);
  const id = readText(formData, "id", true);
  await requireAdminUser(PANEL_ROUTE_ACCESS[contentRouteMap[collection]]);

  try {
    const payload = await getPayloadClient();

    if (collection === "campaigns") {
      const record = await payload.findByID({
        collection: "campaigns",
        id,
        depth: 0,
        overrideAccess: true,
      });
      await cleanupCampaignLinkedRecordsByIds(payload, [id]);
      await payload.delete({ collection, id });
      await removeCampaignCoverImage(typeof (record as Record<string, unknown>).coverImagePath === "string" ? String((record as Record<string, unknown>).coverImagePath) : null);
      revalidatePath(contentPathMap[collection]);
      revalidatePath("/panel");
      return { message: "Kayıt silindi.", success: true };
    }

    await payload.delete({ collection, id });
    revalidatePath(contentPathMap[collection]);
    revalidatePath("/panel");
    return { message: "Kayıt silindi.", success: true };
  } catch (error) {
    return {
      message: getErrorMessage(error, "Kayıt silinemedi. Bağlı verileri kontrol edin veya alanı pasife alın."),
      success: false,
    };
  }
}

export async function deleteMediaAsset(_: ContentActionState, formData: FormData): Promise<ContentActionState> {
  const id = readText(formData, "id", true);
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentMedia);

  try {
    const payload = await getPayloadClient();
    const usedInCampaigns = await payload.find({
      collection: "campaigns",
      limit: 1,
      pagination: false,
      overrideAccess: true,
      where: {
        image: {
          equals: id,
        },
      },
    });

    if (usedInCampaigns.totalDocs > 0) {
      return {
        message: "Bu görsel bağlı bir bağış alanında kullanıldığı için silinemez. Önce görseli ilgili kayıtlardan kaldırın.",
        success: false,
      };
    }

    await payload.delete({ collection: "media", id });
    revalidatePath("/panel/icerik/medya");
    return { message: "Görsel silindi.", success: true };
  } catch (error) {
    return {
      message: getErrorMessage(error, "Görsel silinemedi. Bağlı kayıtları kontrol edin."),
      success: false,
    };
  }
}

export async function setCampaignDonationOpen(_: ContentActionState, formData: FormData): Promise<ContentActionState> {
  const id = readText(formData, "id", true);
  const isDonationOpen = readText(formData, "isDonationOpen", true) === "true";
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentCampaigns);

  try {
    const payload = await getPayloadClient();
    await payload.update({
      collection: "campaigns",
      data: {
        isDonationOpen,
      },
      id,
    });

    revalidatePath(contentPathMap.campaigns);
    revalidatePath("/panel");
    revalidatePath("/bagis");

    return {
      message: isDonationOpen ? "Bağış alanı yayına alındı." : "Bağış alanı pasife alındı.",
      success: true,
    };
  } catch (error) {
    return {
      message: getErrorMessage(error, "Bağış alanı güncellenemedi."),
      success: false,
    };
  }
}

export async function cleanupCampaignLinkedRecords(_: ContentActionState, formData: FormData): Promise<ContentActionState> {
  const id = readText(formData, "id", true);
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentCampaigns);

  try {
    const payload = await getPayloadClient();
    const cleanup = await cleanupCampaignLinkedRecordsByIds(payload, [id]);

    revalidatePath(contentPathMap.campaigns);
    revalidatePath("/panel");
    revalidatePath("/panel/odemeler");
    revalidatePath("/panel/bagislar");
    revalidatePath("/panel/iadeler");
    revalidatePath("/panel/teslimatlar");
    revalidatePath("/panel/saha");
    revalidatePath("/panel/raporlar");
    revalidatePath("/bagis");

    return {
      message: `Bağlı kayıtlar temizlendi. Silinenler: ${[
        cleanup.reportsDeleted,
        cleanup.refundsDeleted,
        cleanup.fulfillmentsDeleted,
        cleanup.donationsDeleted,
        cleanup.eventsDeleted,
        cleanup.sessionsDeleted,
        cleanup.intentsDeleted,
        cleanup.proofsDeleted,
        cleanup.tasksDeleted,
        cleanup.ledgerEntriesDeleted,
        cleanup.ledgerTotalsDeleted,
      ].reduce((sum, value) => sum + value, 0)} kayıt.`,
      success: true,
    };
  } catch (error) {
    return {
      message: getErrorMessage(error, "Bağlı kayıtlar temizlenemedi."),
      success: false,
    };
  }
}

export async function purgeAllCampaignRecords(_: ContentActionState): Promise<ContentActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentCampaigns);

  try {
    const payload = await getPayloadClient();
    const campaignIds = await findDocIdsByWhere(payload, "campaigns", {});

    if (!campaignIds.length) {
      return { message: "Silinecek bağış alanı bulunmuyor.", success: true };
    }

    const cleanup = await cleanupCampaignLinkedRecordsByIds(payload, campaignIds);
    const campaignsDeleted = await deleteDocsByIds(payload, "campaigns", campaignIds);
    const totalDeleted =
      cleanup.reportsDeleted +
      cleanup.refundsDeleted +
      cleanup.fulfillmentsDeleted +
      cleanup.eventsDeleted +
      cleanup.sessionsDeleted +
      cleanup.intentsDeleted +
      cleanup.proofsDeleted +
      cleanup.tasksDeleted +
      cleanup.donationsDeleted +
      cleanup.ledgerEntriesDeleted +
      cleanup.ledgerTotalsDeleted +
      campaignsDeleted;

    revalidatePath("/panel/icerik/bagis-alanlari");
    revalidatePath("/panel");
    revalidatePath("/panel/odemeler");
    revalidatePath("/panel/bagislar");
    revalidatePath("/panel/iadeler");
    revalidatePath("/panel/teslimatlar");
    revalidatePath("/panel/saha");
    revalidatePath("/panel/raporlar");
    revalidatePath("/bagis");

    return {
      message: `Tüm bağış alanları ve bağlı kayıtlar temizlendi. Silinen toplam kayıt: ${totalDeleted}.`,
      success: true,
    };
  } catch (error) {
    return {
      message: getErrorMessage(error, "Toplu temizlik tamamlanamadı."),
      success: false,
    };
  }
}
