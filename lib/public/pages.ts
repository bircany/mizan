import type { AppLocale } from "@/lib/i18n";
import { lexicalParagraphs, pageExcerpt } from "@/lib/pages";
import { getPayloadClient } from "@/lib/payload";

export type PublicPage = { id: string; slug: string; title: string; paragraphs: string[]; excerpt: string; updatedAt: string };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function mapPage(value: unknown): PublicPage {
  const page = record(value);
  const paragraphs = lexicalParagraphs(page.content);
  return {
    id: String(page.id),
    slug: typeof page.slug === "string" ? page.slug : "",
    title: typeof page.title === "string" ? page.title : "",
    paragraphs,
    excerpt: pageExcerpt(paragraphs),
    updatedAt: typeof page.updatedAt === "string" ? page.updatedAt : "",
  };
}

export async function getPublishedPageBySlug(slug: string, locale: AppLocale): Promise<PublicPage | null> {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "pages", locale, fallbackLocale: "tr", depth: 0, limit: 1, pagination: false, where: { and: [{ slug: { equals: slug } }, { published: { equals: true } }] } });
  return result.docs[0] ? mapPage(result.docs[0]) : null;
}

export async function getPublishedPages(locale: AppLocale = "tr"): Promise<PublicPage[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "pages", locale, fallbackLocale: "tr", depth: 0, pagination: false, limit: 500, sort: "title", where: { published: { equals: true } } });
  return result.docs.map(mapPage).filter((page) => page.slug && page.title);
}
