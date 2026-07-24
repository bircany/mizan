import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";

import type { AppLocale } from "@/lib/i18n";
import { getPayloadClient } from "@/lib/payload";
import { qurbaniQuery } from "@/lib/qurbani/db";

export type PublicQurbaniSeason = {
  id: string;
  year: number;
  title: string;
  description: string;
  salesStartAt: string;
  salesEndAt: string;
  salesOpen: boolean;
  eidAt: string;
  heroImageUrl: string;
  bank: { bankName: string; accountHolder: string; iban: string } | null;
  processSteps: string[];
};

export type PublicQurbaniProduct = {
  id: string;
  seasonId: string;
  title: string;
  description: string;
  region: string;
  kind: "cattle" | "small_livestock";
  price: number;
  currency: string;
  capacity: number;
  imageUrl: string;
  imageAlt: string;
  countryId: string;
  countrySlug: string;
  countryCode: string;
  countryName: string;
  countryDescription: string;
  countryImageUrl: string;
  priceRevisionId: string;
  priceRevision: number;
  remainingShares: number;
  fundingPoolId: string;
};

export type PublicQurbaniCountry = {
  id: string;
  slug: string;
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  remainingShares: number;
  variants: PublicQurbaniProduct[];
};

export type PublicQurbaniCatalog = {
  season: PublicQurbaniSeason;
  products: PublicQurbaniProduct[];
  countries: PublicQurbaniCountry[];
};

export type QurbaniTrackingView = {
  orderNumber: string;
  poolCode: string;
  status: string;
  ownerNames: string[];
  shareCount: number;
  videoUrl: string;
  videoReady: boolean;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function id(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const relation = object(value);
  return typeof relation.id === "string" || typeof relation.id === "number" ? String(relation.id) : "";
}

function localized(value: unknown, locale: AppLocale) {
  if (typeof value === "string") return value.trim();
  const translated = object(value);
  return text(translated[locale]) || text(translated.tr) || text(translated.en) || text(translated.ar);
}

function relationImageUrl(value: unknown) {
  const image = object(value);
  const sizes = object(image.sizes);
  return text(image.url) || text(object(sizes.card).url) || text(object(sizes.thumbnail).url);
}

function steps(value: unknown, locale: AppLocale) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const record = object(item);
      return localized(record.text || record.title || record.description, locale);
    })
    .filter(Boolean);
}

function isWithinSalesWindow(season: Record<string, unknown>, now: number) {
  const start = Date.parse(text(season.salesStartAt));
  const end = Date.parse(text(season.salesEndAt));
  return (!Number.isFinite(start) || start <= now) && (!Number.isFinite(end) || end >= now);
}

function mapSeason(record: Record<string, unknown>, locale: AppLocale): PublicQurbaniSeason {
  const bank = object(record.eftBank || record.bank);
  const bankName = text(record.bankName) || text(bank.bankName);
  const accountHolder = text(record.accountHolder) || text(bank.accountHolder);
  const iban = text(record.iban) || text(bank.iban);
  return {
    id: id(record.id),
    year: number(record.year),
    title: localized(record.heroTitle || record.title, locale) || `${number(record.year)} Kurban Organizasyonu`,
    description: localized(record.heroDescription || record.description, locale),
    salesStartAt: text(record.salesStartAt),
    salesEndAt: text(record.salesEndAt),
    salesOpen: isWithinSalesWindow(record, Date.now()),
    eidAt: text(record.eidAt || record.feastDate),
    heroImageUrl: relationImageUrl(record.heroImage) || text(record.heroImageUrl),
    bank: bankName || accountHolder || iban ? { bankName, accountHolder, iban } : null,
    processSteps: steps(record.processSteps, locale),
  };
}

function mapProduct(record: Record<string, unknown>, locale: AppLocale): PublicQurbaniProduct | null {
  const kindValue = text(record.kind || record.animalType);
  const kind = kindValue === "small_livestock" || kindValue === "small" || kindValue === "sheep"
    ? "small_livestock"
    : "cattle";
  const region = object(record.regionRef);
  const country = object(record.country || region.country);
  const priceRevision = object(record.currentPriceRevision || record.priceRevision);
  const title = localized(record.title || record.name, locale);
  const price = number(priceRevision.price || record.price);
  if (!title || price <= 0) return null;
  return {
    id: id(record.id),
    seasonId: id(record.season),
    title,
    description: localized(record.description, locale),
    region: localized(region.name || record.region, locale) || text(record.region),
    kind,
    price,
    currency: text(record.currency) || "TRY",
    capacity: Math.max(1, Math.min(kind === "cattle" ? 7 : 1, Math.round(number(record.capacity) || (kind === "cattle" ? 7 : 1)))),
    imageUrl: relationImageUrl(record.image) || text(record.imageUrl),
    imageAlt: localized(record.imageAlt, locale) || title,
    countryId: id(country.id) || id(region.id) || localized(region.name, locale),
    countrySlug: text(country.slug) || text(region.slug) || id(country.id) || id(region.id),
    countryCode: text(country.isoCode || country.code || country.countryCode).toUpperCase(),
    countryName: localized(country.name || region.name, locale) || localized(record.region, locale),
    countryDescription: localized(country.description || region.description, locale),
    countryImageUrl: relationImageUrl(country.image || region.image),
    priceRevisionId: id(priceRevision.id) || text(record.priceRevisionId),
    priceRevision: Math.max(1, Math.round(number(priceRevision.revision || record.priceRevisionNumber) || 1)),
    remainingShares: Math.max(0, Math.floor(number(record.remainingShares || record.availableQuantity))),
    fundingPoolId: id(record.fundingPool),
  };
}

function groupCountries(products: PublicQurbaniProduct[]): PublicQurbaniCountry[] {
  const countries = new Map<string, PublicQurbaniCountry>();
  for (const product of products) {
    const key = product.countryId || product.countrySlug || product.region;
    const current = countries.get(key);
    if (current) {
      current.variants.push(product);
      current.remainingShares += product.remainingShares;
      continue;
    }
    countries.set(key, {
      id: product.countryId || key,
      slug: product.countrySlug || key,
      code: product.countryCode,
      name: product.countryName || product.region,
      description: product.countryDescription,
      imageUrl: product.countryImageUrl,
      remainingShares: product.remainingShares,
      variants: [product],
    });
  }
  return Array.from(countries.values());
}

type ProductAvailability = {
  productId: number;
  stockBatchLineId: number;
  priceRevisionId: number;
  revision: number;
  unitPrice: number | string;
  currency: string;
  remainingShares: number;
};

async function exactAvailability(productId: string): Promise<ProductAvailability | null> {
  try {
    const result = await qurbaniQuery<{ result: ProductAvailability }>(
      "select private.qurbani_product_availability($1::integer) as result",
      [Number(productId)],
    );
    const availability = result.rows[0]?.result;
    return availability && Number.isInteger(Number(availability.priceRevisionId)) ? availability : null;
  } catch (error) {
    console.warn("Kurbanlık seçeneğinin kesin stoğu okunamadı.", { productId, error: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}

export const getActiveQurbaniCatalog = cache(async (locale: AppLocale): Promise<PublicQurbaniCatalog | null> => {
  try {
    const payload = await getPayloadClient();
    const seasons = await payload.find({
      collection: "qurbani-seasons" as never,
      depth: 2,
      fallbackLocale: "tr",
      limit: 20,
      locale,
      pagination: false,
      sort: "-year",
      where: { status: { equals: "active" } },
    });
    const now = Date.now();
    const seasonRecords = (seasons.docs as unknown[]).map(object);
    const seasonRecord = seasonRecords.find((item) => isWithinSalesWindow(item, now)) || seasonRecords[0] || {};
    const season = mapSeason(seasonRecord, locale);
    if (!season.id) return null;

    const products = await payload.find({
      collection: "qurbani-products" as never,
      depth: 2,
      fallbackLocale: "tr",
      limit: 100,
      locale,
      pagination: false,
      sort: "sortOrder",
      where: {
        and: [
          { season: { equals: season.id } },
          { isActive: { equals: true } },
        ],
      },
    });

    const activeProductRecords = season.salesOpen ? (products.docs as unknown[])
        .map(object)
        .filter((item) => isWithinSalesWindow(item, now))
        .filter((item) => object(item.country).isActive !== false && object(item.regionRef).isActive !== false)
      : [];
    const availabilityRows = await Promise.all(activeProductRecords.map((item) => exactAvailability(id(item.id))));
    const mappedProducts = activeProductRecords
      .map((item, index) => {
        const availability = availabilityRows[index];
        if (!availability) return null;
        return mapProduct({
          ...item,
          currentPriceRevision: {
            id: availability.priceRevisionId,
            revision: availability.revision,
            price: Number(availability.unitPrice),
          },
          currency: availability.currency,
          remainingShares: availability.remainingShares,
        }, locale);
      })
      .filter((item): item is PublicQurbaniProduct => Boolean(item));

    return {
      season,
      products: mappedProducts,
      countries: groupCountries(mappedProducts),
    };
  } catch (error) {
    console.warn("Aktif kurban sezonu okunamadı.", error);
    return null;
  }
});

export const getQurbaniProduct = cache(async (productId: string, locale: AppLocale): Promise<{ season: PublicQurbaniSeason; product: PublicQurbaniProduct } | null> => {
  const catalog = await getActiveQurbaniCatalog(locale);
  if (!catalog) return null;
  const product = catalog.products.find((item) => item.id === productId);
  return product ? { season: catalog.season, product } : null;
});

export const getQurbaniProducts = cache(async (productIds: string[], locale: AppLocale): Promise<{ season: PublicQurbaniSeason; products: PublicQurbaniProduct[] } | null> => {
  const ids = [...new Set(productIds.map((value) => value.trim()).filter(Boolean))].slice(0, 7);
  if (!ids.length) return null;
  const catalog = await getActiveQurbaniCatalog(locale);
  if (!catalog) return null;
  const byId = new Map(catalog.products.map((product) => [product.id, product]));
  const products = ids.map((productId) => byId.get(productId)).filter((product): product is PublicQurbaniProduct => Boolean(product));
  return products.length === ids.length ? { season: catalog.season, products } : null;
});

function isValidSignedToken(token: string) {
  const separator = token.lastIndexOf(".");
  if (separator < 16) return false;
  const value = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const secret = process.env.QURBANI_TOKEN_SECRET || process.env.PAYLOAD_SECRET;
  if (!secret || secret.length < 32 || !signature) return false;
  const expected = createHmac("sha256", secret).update(value).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const getQurbaniTrackingView = cache(async (token: string): Promise<QurbaniTrackingView | null> => {
  const normalized = token.trim();
  if (!isValidSignedToken(normalized)) return null;
  try {
    const payload = await getPayloadClient();
    const digest = createHash("sha256").update(normalized).digest("hex");
    const links = await payload.find({
      collection: "qurbani-access-links" as never,
      depth: 3,
      fallbackLocale: "tr",
      limit: 1,
      pagination: false,
      where: { tokenDigest: { equals: digest } },
    });
    const link = object(links.docs[0]);
    if (!id(link.id) || link.revokedAt) return null;
    const expiresAt = Date.parse(text(link.expiresAt));
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return null;

    const pool = object(link.pool);
    const order = object(link.order);
    const linkedShares = Array.isArray(link.shares) ? link.shares : [];
    const ownerNames = linkedShares.map((share) => text(object(share).ownerName)).filter(Boolean);
    const video = object(link.video || pool.approvedVideo);
    return {
      orderNumber: text(order.orderNumber || order.reference),
      poolCode: text(pool.code || pool.poolCode),
      status: text(pool.status) || text(order.status) || "pending",
      ownerNames,
      shareCount: ownerNames.length || Math.max(1, Math.round(number(link.shareCount))),
      videoUrl: text(link.videoUrl) || text(video.playbackUrl),
      videoReady: Boolean(
        (["ready_to_send", "approved", "ready"].includes(text(video.status))) && text(video.processedStorageKey)
        || text(link.videoUrl)
        || text(video.playbackUrl),
      ),
    };
  } catch (error) {
    console.warn("Kurban takip bağlantısı okunamadı.", error);
    return null;
  }
});
