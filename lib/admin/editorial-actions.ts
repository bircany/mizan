"use server";

import { revalidatePath } from "next/cache";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";

import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { calculateReadTime, EDITORIAL_LOCALES, newsBlockText, normalizeNewsBlocks, normalizeTags, slugifyEditorial, type LocalizedNewsInput } from "@/lib/editorial";
import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export type EditorialActionState = { success: boolean; message: string | null };
type PayloadClient = Awaited<ReturnType<typeof getPayloadClient>>;
type Locale = (typeof EDITORIAL_LOCALES)[number];
type UploadedFile = { arrayBuffer(): Promise<ArrayBuffer>; name: string; size: number; type: string };

const NEWS_BUCKET = "news-media";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function parseJson<T>(formData: FormData, name: string): T {
  const value = formData.get(name);
  if (typeof value !== "string" || !value.trim()) throw new Error("Form verisi okunamadi.");
  return JSON.parse(value) as T;
}

function fileValue(value: FormDataEntryValue | null): UploadedFile | null {
  if (!value || typeof value === "string") return null;
  const file = value as Partial<UploadedFile>;
  return typeof file.arrayBuffer === "function" && typeof file.name === "string" && typeof file.size === "number" && typeof file.type === "string" ? file as UploadedFile : null;
}

function safeName(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "image";
}

async function uploadNewsImage(file: UploadedFile, folder: string) {
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error("Gorsel 10 MB'dan buyuk veya bos olamaz.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Yalnizca JPG, PNG veya WebP gorsel yukleyin.");
  const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const storage = getSupabaseServiceClient();
  const result = await storage.storage.from(NEWS_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (result.error) throw new Error(`Gorsel yuklenemedi: ${result.error.message}`);
  return { path, url: storage.storage.from(NEWS_BUCKET).getPublicUrl(path).data.publicUrl };
}

async function removeNewsImages(paths: string[]) {
  if (!paths.length) return;
  const { error } = await getSupabaseServiceClient().storage.from(NEWS_BUCKET).remove([...new Set(paths)]);
  if (error) console.warn("Haber gorselleri temizlenemedi.", error.message);
}

function idOf(value: unknown) {
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id);
  return "";
}

function localizedRelation(value: unknown, locale: Locale) {
  if (value && typeof value === "object" && locale in value) return idOf((value as Record<string, unknown>)[locale]);
  return idOf(value);
}

type CategoryInput = {
  id?: string;
  slug: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
  names: Record<Locale, string>;
  descriptions: Record<Locale, string>;
};

async function saveLocalizedCategory(collection: "categories" | "news-categories", input: CategoryInput, payload: PayloadClient, user: Awaited<ReturnType<typeof requireAdminUser>>) {
  for (const locale of EDITORIAL_LOCALES) {
    if (!input.names[locale]?.trim()) throw new Error(`${locale.toUpperCase()} kategori adi zorunludur.`);
  }
  const slug = slugifyEditorial(input.slug || input.names.tr);
  if (!slug) throw new Error("Gecerli bir URL kisaligi girin.");
  const req = await createLocalReq({ user: { ...user, collection: "users" } }, payload);
  await initTransaction(req);
  try {
    const common = { slug, sortOrder: Math.max(0, Number(input.sortOrder) || 0), isActive: input.isActive !== false };
    const categoryCommon = collection === "categories" ? { ...common, icon: input.icon?.trim() || "category", color: input.color?.trim() || "#0e5a3a" } : common;
    const saved = input.id
      ? await payload.update({ collection, id: input.id, locale: "tr", fallbackLocale: false, req, data: { ...categoryCommon, name: input.names.tr.trim(), description: input.descriptions.tr?.trim() || "" } })
      : await payload.create({ collection, locale: "tr", fallbackLocale: false, req, data: { ...categoryCommon, name: input.names.tr.trim(), description: input.descriptions.tr?.trim() || "" } });
    const id = idOf(saved);
    for (const locale of ["en", "ar"] as const) {
      await payload.update({ collection, id, locale, fallbackLocale: false, req, data: { name: input.names[locale].trim(), description: input.descriptions[locale]?.trim() || "" } });
    }
    await commitTransaction(req);
  } catch (error) {
    await killTransaction(req);
    throw error;
  }
}

export async function saveDonationCategory(_: EditorialActionState, formData: FormData): Promise<EditorialActionState> {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentCategories);
  try {
    await saveLocalizedCategory("categories", parseJson<CategoryInput>(formData, "payload"), await getPayloadClient(), user);
    revalidatePath("/panel/icerik/kategoriler");
    revalidatePath("/panel/icerik/bagis-alanlari");
    revalidatePath("/bagis");
    return { success: true, message: "Bagis kategorisi kaydedildi." };
  } catch (error) {
    return { success: false, message: message(error, "Kategori kaydedilemedi.") };
  }
}

export async function deleteDonationCategoryWithTransfer(_: EditorialActionState, formData: FormData): Promise<EditorialActionState> {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentCategories);
  const sourceId = String(formData.get("sourceId") || "");
  const targetId = String(formData.get("targetId") || "");
  if (!sourceId) return { success: false, message: "Silinecek kategori bulunamadi." };
  try {
    const payload = await getPayloadClient();
    const [campaigns, pools] = await Promise.all([
      payload.find({ collection: "campaigns", depth: 0, pagination: false, limit: 1000, where: { category: { equals: sourceId } } }),
      payload.find({ collection: "campaign-funding-pools", locale: "all", fallbackLocale: false, depth: 0, pagination: false, limit: 2000 }),
    ]);
    const matchingPools = pools.docs.filter((item) => EDITORIAL_LOCALES.some((locale) => localizedRelation((item as Record<string, unknown>).category, locale) === sourceId));
    const isUsed = campaigns.totalDocs > 0 || matchingPools.length > 0;
    if (isUsed) {
      if (!targetId || targetId === sourceId) throw new Error("Bagli kayitlar icin farkli bir hedef kategori secin.");
      const target = await payload.findByID({ collection: "categories", id: targetId, depth: 0 });
      if ((target as { isActive?: boolean }).isActive === false) throw new Error("Hedef kategori aktif olmalidir.");
    }
    const req = await createLocalReq({ user: { ...user, collection: "users" } }, payload);
    await initTransaction(req);
    try {
      for (const campaign of campaigns.docs) await payload.update({ collection: "campaigns", id: idOf(campaign), req, data: { category: targetId } });
      for (const pool of matchingPools) {
        const value = (pool as Record<string, unknown>).category;
        for (const locale of EDITORIAL_LOCALES) {
          if (localizedRelation(value, locale) === sourceId) await payload.update({ collection: "campaign-funding-pools", id: idOf(pool), locale, fallbackLocale: false, req, data: { category: targetId } });
        }
      }
      await payload.delete({ collection: "categories", id: sourceId, req });
      await commitTransaction(req);
    } catch (error) {
      await killTransaction(req);
      throw error;
    }
    revalidatePath("/panel/icerik/kategoriler");
    revalidatePath("/panel/icerik/bagis-alanlari");
    revalidatePath("/bagis");
    return { success: true, message: isUsed ? "Kayitlar hedef kategoriye tasindi ve eski kategori silindi." : "Kategori silindi." };
  } catch (error) {
    return { success: false, message: message(error, "Kategori silinemedi.") };
  }
}

export async function saveNewsCategory(_: EditorialActionState, formData: FormData): Promise<EditorialActionState> {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentNews);
  try {
    await saveLocalizedCategory("news-categories", parseJson<CategoryInput>(formData, "payload"), await getPayloadClient(), user);
    revalidatePath("/panel/icerik/haberler");
    revalidatePath("/haberler");
    return { success: true, message: "Haber kategorisi kaydedildi." };
  } catch (error) {
    return { success: false, message: message(error, "Haber kategorisi kaydedilemedi.") };
  }
}

export async function deleteNewsCategory(_: EditorialActionState, formData: FormData): Promise<EditorialActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentNews);
  const id = String(formData.get("id") || "");
  try {
    const payload = await getPayloadClient();
    const posts = await payload.find({ collection: "news", depth: 0, limit: 1, pagination: false, where: { newsCategory: { equals: id } } });
    if (posts.totalDocs) throw new Error("Bu kategori haberlere bagli. Once haberlerin kategorisini degistirin.");
    await payload.delete({ collection: "news-categories", id });
    revalidatePath("/panel/icerik/haberler");
    revalidatePath("/haberler");
    return { success: true, message: "Haber kategorisi silindi." };
  } catch (error) {
    return { success: false, message: message(error, "Haber kategorisi silinemedi.") };
  }
}

type NewsInput = {
  id?: string;
  slug: string;
  categoryId: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  sortOrder: number;
  relatedCampaignIds: string[];
  availableLocales: Locale[];
  translations: Record<Locale, LocalizedNewsInput>;
};

async function validateCampaigns(payload: PayloadClient, ids: string[]) {
  if (!ids.length) return;
  const result = await payload.find({ collection: "campaigns", depth: 0, pagination: false, limit: ids.length, where: { and: [{ id: { in: ids } }, { isDonationOpen: { equals: true } }] } });
  if (result.totalDocs !== ids.length) throw new Error("Ilgili bagis alanlarindan biri artik aktif degil.");
}

export async function saveNewsPost(_: EditorialActionState, formData: FormData): Promise<EditorialActionState> {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentNews);
  const uploadedPaths: string[] = [];
  let previousCoverPath = "";
  try {
    const input = parseJson<NewsInput>(formData, "payload");
    const availableLocales = [...new Set((input.availableLocales || []).filter((locale): locale is Locale => EDITORIAL_LOCALES.includes(locale)))];
    if (!availableLocales.length) throw new Error("En az bir yayın dili seçin.");
    const primaryLocale = availableLocales[0];
    const primaryTitle = input.translations[primaryLocale]?.title?.trim() || "";
    if (!primaryTitle) throw new Error(`${primaryLocale.toUpperCase()} haber başlığı zorunludur.`);
    const payload = await getPayloadClient();
    const category = await payload.findByID({ collection: "news-categories", id: input.categoryId, depth: 0 });
    if ((category as { isActive?: boolean }).isActive === false && input.status === "published") throw new Error("Yayindaki haber icin aktif bir kategori secin.");
    const normalized = {} as Record<Locale, LocalizedNewsInput & { searchText: string; readTimeMinutes: number }>;
    const blockCampaignIds = new Set<string>();
    for (const locale of availableLocales) {
      const translation = input.translations[locale];
      const rawBlocks = Array.isArray(translation?.blocks) ? translation.blocks.map((block) => ({ ...block })) : [];
      for (const block of rawBlocks) {
        if (block.type === "image" && typeof block.id === "string") {
          const file = fileValue(formData.get(`block-image-${locale}-${block.id}`));
          if (file?.size) {
            const uploaded = await uploadNewsImage(file, `blocks/${input.slug || slugifyEditorial(primaryTitle)}`);
            uploadedPaths.push(uploaded.path);
            block.src = uploaded.url;
          }
        }
      }
      const blocks = normalizeNewsBlocks(rawBlocks);
      blocks.forEach((block) => { if (block.type === "campaign") blockCampaignIds.add(String(block.campaignId)); });
      const tags = normalizeTags(translation?.tags);
      const title = translation?.title?.trim() || "";
      const excerpt = translation?.excerpt?.trim() || "";
      const coverImageAlt = translation?.coverImageAlt?.trim() || "";
      if (input.status === "published" && (!title || !excerpt || !coverImageAlt || !blocks.length)) throw new Error(`${locale.toUpperCase()} yayini icin baslik, ozet, kapak alt metni ve icerik zorunludur.`);
      const searchText = [title, excerpt, tags.join(" "), newsBlockText(blocks)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      normalized[locale] = { ...translation, title, excerpt, coverImageAlt, tags, blocks, searchText, readTimeMinutes: calculateReadTime(searchText) };
    }
    const relatedCampaignIds = [...new Set([...(input.relatedCampaignIds || []).map(String), ...blockCampaignIds])];
    await validateCampaigns(payload, relatedCampaignIds);
    const current = input.id ? await payload.findByID({ collection: "news", id: input.id, locale: "all", fallbackLocale: false, depth: 0 }) as Record<string, unknown> : null;
    previousCoverPath = current && typeof current.coverImagePath === "string" ? current.coverImagePath : "";
    const coverFile = fileValue(formData.get("coverImage"));
    const uploadedCover = coverFile?.size ? await uploadNewsImage(coverFile, `covers/${input.slug || slugifyEditorial(primaryTitle)}`) : null;
    if (uploadedCover) uploadedPaths.push(uploadedCover.path);
    const slug = slugifyEditorial(input.slug || primaryTitle);
    if (!slug) throw new Error("Gecerli bir URL kisaligi girin.");
    const wasPublished = current?.status === "published" || Boolean(current?.publishedAt);
    const publishedAt = input.status === "published" ? (wasPublished && typeof current?.publishedAt === "string" ? current.publishedAt : new Date().toISOString()) : (typeof current?.publishedAt === "string" ? current.publishedAt : undefined);
    const req = await createLocalReq({ user: { ...user, collection: "users" } }, payload);
    await initTransaction(req);
    try {
      const common = { slug, newsCategory: input.categoryId, availableLocales, status: input.status, featured: input.featured === true, sortOrder: Number(input.sortOrder) || 0, relatedCampaigns: relatedCampaignIds, publishedAt, coverImagePath: uploadedCover?.path || previousCoverPath || undefined };
      const localeData = (locale: Locale) => ({ title: normalized[locale].title || "Taslak", excerpt: normalized[locale].excerpt, coverImageAlt: normalized[locale].coverImageAlt, contentBlocks: normalized[locale].blocks, tags: normalized[locale].tags, searchText: normalized[locale].searchText, readTimeMinutes: normalized[locale].readTimeMinutes, meta: { title: normalized[locale].metaTitle?.trim() || normalized[locale].title, description: normalized[locale].metaDescription?.trim() || normalized[locale].excerpt } });
      const saved = input.id
        ? await payload.update({ collection: "news", id: input.id, locale: primaryLocale, fallbackLocale: false, req, data: { ...common, ...localeData(primaryLocale) } })
        : await payload.create({ collection: "news", locale: primaryLocale, fallbackLocale: false, req, data: { ...common, ...localeData(primaryLocale) } });
      const id = idOf(saved);
      for (const locale of availableLocales.filter((locale) => locale !== primaryLocale)) {
        const translation = normalized[locale];
        if (!translation.title) continue;
        await payload.update({ collection: "news", id, locale, fallbackLocale: false, req, data: localeData(locale) });
      }
      await commitTransaction(req);
    } catch (error) {
      await killTransaction(req);
      throw error;
    }
    if (uploadedCover && previousCoverPath && previousCoverPath !== uploadedCover.path) await removeNewsImages([previousCoverPath]);
    revalidatePath("/panel/icerik/haberler");
    revalidatePath("/haberler");
    revalidatePath(`/haberler/${slug}`);
    return { success: true, message: input.id ? "Haber guncellendi." : "Haber olusturuldu." };
  } catch (error) {
    await removeNewsImages(uploadedPaths);
    return { success: false, message: message(error, "Haber kaydedilemedi.") };
  }
}

export async function deleteNewsPost(_: EditorialActionState, formData: FormData): Promise<EditorialActionState> {
  await requireAdminUser(PANEL_ROUTE_ACCESS.contentNews);
  const id = String(formData.get("id") || "");
  try {
    const payload = await getPayloadClient();
    const post = await payload.findByID({ collection: "news", id, depth: 0 }) as Record<string, unknown>;
    await payload.delete({ collection: "news", id });
    if (typeof post.coverImagePath === "string") await removeNewsImages([post.coverImagePath]);
    revalidatePath("/panel/icerik/haberler");
    revalidatePath("/haberler");
    return { success: true, message: "Haber silindi." };
  } catch (error) {
    return { success: false, message: message(error, "Haber silinemedi.") };
  }
}
