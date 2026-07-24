import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { EDITORIAL_LOCALES, normalizeNewsBlocks, normalizeTags, type NewsBlock } from "@/lib/editorial";

export type TranslationValue = Record<"tr" | "en" | "ar", string>;

export type DonationCategoryAdminRecord = {
  id: string;
  slug: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
  names: TranslationValue;
  descriptions: TranslationValue;
};

export type NewsCategoryAdminRecord = {
  id: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  postCount: number;
  names: TranslationValue;
  descriptions: TranslationValue;
};

export type CampaignOption = { id: string; title: string; slug: string; isActive: boolean };

export type NewsAdminRecord = {
  id: string;
  slug: string;
  categoryId: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  sortOrder: number;
  viewCount: number;
  publishedAt: string;
  coverImagePath: string;
  coverImageUrl: string;
  relatedCampaignIds: string[];
  availableLocales: Array<"tr" | "en" | "ar">;
  translations: Record<"tr" | "en" | "ar", {
    title: string;
    excerpt: string;
    coverImageAlt: string;
    metaTitle: string;
    metaDescription: string;
    tags: string[];
    blocks: NewsBlock[];
  }>;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function localizedText(value: unknown, locale: "tr" | "en" | "ar") {
  if (typeof value === "string") return value;
  return text(record(value)[locale]);
}

function localizedObject(value: unknown, locale: "tr" | "en" | "ar") {
  const source = record(value);
  return source[locale] ?? value;
}

function relationId(value: unknown) {
  if (typeof value === "number" || typeof value === "string") return String(value);
  const id = record(value).id;
  return typeof id === "number" || typeof id === "string" ? String(id) : "";
}

function relationIds(value: unknown) {
  return Array.isArray(value) ? value.map(relationId).filter(Boolean) : [];
}

function newsMediaUrl(path: string) {
  if (!path) return "";
  return getSupabaseServiceClient().storage.from("news-media").getPublicUrl(path).data.publicUrl;
}

export async function getDonationCategoryAdminRecords(): Promise<DonationCategoryAdminRecord[]> {
  const payload = await getPayloadClient();
  const [categories, campaigns, pools] = await Promise.all([
    payload.find({ collection: "categories", locale: "all", fallbackLocale: false, pagination: false, limit: 500, sort: "sortOrder" }),
    payload.find({ collection: "campaigns", depth: 0, pagination: false, limit: 500 }),
    payload.find({ collection: "campaign-funding-pools", locale: "all", fallbackLocale: false, depth: 0, pagination: false, limit: 1000 }),
  ]);

  return categories.docs.map((item) => {
    const category = record(item);
    const id = String(category.id);
    const campaignIds = new Set<string>();
    campaigns.docs.forEach((campaignValue) => {
      const campaign = record(campaignValue);
      if (relationId(campaign.category) === id) campaignIds.add(String(campaign.id));
    });
    pools.docs.forEach((poolValue) => {
      const pool = record(poolValue);
      const localizedCategory = record(pool.category);
      if (EDITORIAL_LOCALES.some((locale) => relationId(localizedCategory[locale]) === id)) {
        campaignIds.add(relationId(pool.campaign));
      }
    });
    return {
      id,
      slug: text(category.slug),
      icon: text(category.icon),
      color: text(category.color),
      sortOrder: typeof category.sortOrder === "number" ? category.sortOrder : 0,
      isActive: category.isActive !== false,
      usageCount: campaignIds.size,
      names: Object.fromEntries(EDITORIAL_LOCALES.map((locale) => [locale, localizedText(category.name, locale)])) as TranslationValue,
      descriptions: Object.fromEntries(EDITORIAL_LOCALES.map((locale) => [locale, localizedText(category.description, locale)])) as TranslationValue,
    };
  });
}

export async function getNewsAdminData() {
  const payload = await getPayloadClient();
  const [categories, news, campaigns] = await Promise.all([
    payload.find({ collection: "news-categories", locale: "all", fallbackLocale: false, pagination: false, limit: 500, sort: "sortOrder" }),
    payload.find({ collection: "news", locale: "all", fallbackLocale: false, depth: 1, pagination: false, limit: 500, sort: "-updatedAt" }),
    payload.find({ collection: "campaigns", locale: "tr", depth: 0, pagination: false, limit: 500, sort: "title" }),
  ]);

  const newsRecords = news.docs.map((item): NewsAdminRecord => {
    const post = record(item);
    const meta = record(post.meta);
    const path = text(post.coverImagePath);
    const translations = Object.fromEntries(EDITORIAL_LOCALES.map((locale) => {
      const localizedMeta = record(localizedObject(meta, locale));
      return [locale, {
        title: localizedText(post.title, locale),
        excerpt: localizedText(post.excerpt, locale),
        coverImageAlt: localizedText(post.coverImageAlt, locale),
        metaTitle: text(localizedMeta.title),
        metaDescription: text(localizedMeta.description),
        tags: normalizeTags(localizedObject(post.tags, locale)),
        blocks: normalizeNewsBlocks(localizedObject(post.contentBlocks, locale)),
      }];
    })) as NewsAdminRecord["translations"];
    const storedLocales = Array.isArray(post.availableLocales) ? post.availableLocales.filter((locale): locale is "tr" | "en" | "ar" => EDITORIAL_LOCALES.includes(locale as "tr" | "en" | "ar")) : [];
    const availableLocales = storedLocales.length ? storedLocales : EDITORIAL_LOCALES.filter((locale) => Boolean(translations[locale].title));
    return {
      id: String(post.id),
      slug: text(post.slug),
      categoryId: relationId(post.newsCategory),
      status: post.status === "published" || post.status === "archived" ? post.status : "draft",
      featured: post.featured === true,
      sortOrder: typeof post.sortOrder === "number" ? post.sortOrder : 0,
      viewCount: typeof post.viewCount === "number" ? post.viewCount : 0,
      publishedAt: text(post.publishedAt),
      coverImagePath: path,
      coverImageUrl: newsMediaUrl(path) || text(record(post.image).url),
      relatedCampaignIds: relationIds(post.relatedCampaigns),
      availableLocales: availableLocales.length ? availableLocales : ["tr"],
      translations,
    };
  });

  const categoryRecords = categories.docs.map((item): NewsCategoryAdminRecord => {
    const category = record(item);
    const id = String(category.id);
    return {
      id,
      slug: text(category.slug),
      sortOrder: typeof category.sortOrder === "number" ? category.sortOrder : 0,
      isActive: category.isActive !== false,
      postCount: newsRecords.filter((post) => post.categoryId === id).length,
      names: Object.fromEntries(EDITORIAL_LOCALES.map((locale) => [locale, localizedText(category.name, locale)])) as TranslationValue,
      descriptions: Object.fromEntries(EDITORIAL_LOCALES.map((locale) => [locale, localizedText(category.description, locale)])) as TranslationValue,
    };
  });

  return {
    categories: categoryRecords,
    news: newsRecords,
    campaigns: campaigns.docs.map((item): CampaignOption => {
      const campaign = record(item);
      return { id: String(campaign.id), title: localizedText(campaign.title, "tr"), slug: text(campaign.slug), isActive: campaign.isDonationOpen === true };
    }),
  };
}
