import { cache } from "react";

import { normalizeNewsBlocks, normalizeTags, type NewsBlock } from "@/lib/editorial";
import type { AppLocale } from "@/lib/i18n";
import { getPayloadClient } from "@/lib/payload";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export type PublicNewsCategory = { id: string; name: string; slug: string; description: string };
export type PublicNewsCampaign = { id: string; title: string; slug: string; description: string };
export type PublicNewsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string;
  coverImageAlt: string;
  category: PublicNewsCategory | null;
  tags: string[];
  blocks: NewsBlock[];
  searchText: string;
  readTimeMinutes: number;
  featured: boolean;
  publishedAt: string;
  updatedAt: string;
  viewCount: number;
  metaTitle: string;
  metaDescription: string;
  relatedCampaigns: PublicNewsCampaign[];
};

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function lexicalText(value: unknown) {
  const output: string[] = [];
  const visit = (node: unknown) => { const value = object(node); if (typeof value.text === "string") output.push(value.text); if (value.root) visit(value.root); if (Array.isArray(value.children)) value.children.forEach(visit); };
  visit(value); return output.join(" ").replace(/\s+/g, " ").trim();
}
function imageUrl(post: Record<string, unknown>) {
  const path = text(post.coverImagePath);
  if (path) return getSupabaseServiceClient().storage.from("news-media").getPublicUrl(path).data.publicUrl;
  const legacy = object(post.image);
  return text(legacy.url);
}

function toPost(value: unknown, locale: AppLocale): PublicNewsPost | null {
  const post = object(value);
  const availableLocales = Array.isArray(post.availableLocales) ? post.availableLocales.map(String) : [];
  if (availableLocales.length && !availableLocales.includes(locale)) return null;
  const title = text(post.title);
  if (!title) return null;
  const categoryValue = object(post.newsCategory);
  const category = categoryValue.id ? { id: String(categoryValue.id), name: text(categoryValue.name), slug: text(categoryValue.slug), description: text(categoryValue.description) } : null;
  let blocks = normalizeNewsBlocks(post.contentBlocks);
  if (!blocks.length) {
    const legacy = lexicalText(post.content);
    if (legacy) blocks = [{ id: `legacy-${post.id}`, type: "paragraph", text: legacy }];
  }
  const meta = object(post.meta);
  const relatedCampaigns = Array.isArray(post.relatedCampaigns) ? post.relatedCampaigns.map((item) => object(item)).filter((item) => item.id).map((item) => ({ id: String(item.id), title: text(item.title), slug: text(item.slug), description: lexicalText(item.description) })) : [];
  return {
    id: String(post.id), slug: text(post.slug), title, excerpt: text(post.excerpt), coverImageUrl: imageUrl(post), coverImageAlt: text(post.coverImageAlt) || title,
    category, tags: normalizeTags(post.tags), blocks, searchText: text(post.searchText), readTimeMinutes: typeof post.readTimeMinutes === "number" ? post.readTimeMinutes : 1,
    featured: post.featured === true, publishedAt: text(post.publishedAt), updatedAt: text(post.updatedAt), viewCount: typeof post.viewCount === "number" ? post.viewCount : 0,
    metaTitle: text(meta.title) || title, metaDescription: text(meta.description) || text(post.excerpt), relatedCampaigns,
  };
}

export const getPublishedNews = cache(async (locale: AppLocale): Promise<PublicNewsPost[]> => {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({ collection: "news", locale, fallbackLocale: false, depth: 2, pagination: false, limit: 500, sort: ["-featured", "sortOrder", "-publishedAt"], where: { status: { equals: "published" } } });
    return result.docs.map((item) => toPost(item, locale)).filter((item): item is PublicNewsPost => Boolean(item));
  } catch (error) { console.warn("Yayindaki haberler okunamadi.", error); return []; }
});

export const getActiveNewsCategories = cache(async (locale: AppLocale): Promise<PublicNewsCategory[]> => {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({ collection: "news-categories", locale, fallbackLocale: false, depth: 0, pagination: false, limit: 200, sort: "sortOrder", where: { isActive: { equals: true } } });
    return result.docs.map((item) => { const value = object(item); return { id: String(value.id), name: text(value.name), slug: text(value.slug), description: text(value.description) }; }).filter((item) => item.name);
  } catch (error) { console.warn("Haber kategorileri okunamadi.", error); return []; }
});

export const getPublishedNewsBySlug = cache(async (slug: string, locale: AppLocale) => {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "news", locale, fallbackLocale: false, depth: 2, limit: 1, pagination: false, where: { and: [{ slug: { equals: slug } }, { status: { equals: "published" } }] } });
  return result.docs[0] ? toPost(result.docs[0], locale) : null;
});
