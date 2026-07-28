import { readFile } from "node:fs/promises";

import { calculateReadTime, newsBlockText, normalizeNewsBlocks, normalizeTags, type NewsBlock } from "../lib/editorial";
import { getPayloadClient } from "../lib/payload";

type SourceNews = {
  title: string;
  slug: string;
  category: "haber" | "etkinlik" | "duyuru" | "proje";
  excerpt: string;
  coverImageAlt: string;
  tags: unknown;
  featured: boolean;
  publishedAt: string;
  author?: string;
  contentBlocks: unknown;
};

type SourceDocument = { news?: SourceNews[] };

const dryRun = process.argv.includes("--dry-run");

async function run() {
  const source = JSON.parse(await readFile(new URL("../news.json", import.meta.url), "utf8")) as SourceDocument;
  if (!Array.isArray(source.news) || !source.news.length) throw new Error("news.json içinde yayınlanacak haber bulunamadı.");

  const payload = await getPayloadClient();
  const categories = await payload.find({ collection: "news-categories", locale: "tr", pagination: false, limit: 50, depth: 0, overrideAccess: true });
  const categoryBySlug = new Map(categories.docs.map((category) => [String(category.slug), category.id]));
  const seenSlugs = new Set<string>();

  for (const item of source.news) {
    if (!item.title?.trim() || !item.slug?.trim() || !item.excerpt?.trim() || !item.coverImageAlt?.trim()) {
      throw new Error(`Zorunlu haber alanı eksik: ${item.slug || item.title || "başlıksız kayıt"}`);
    }
    if (seenSlugs.has(item.slug)) throw new Error(`JSON içinde mükerrer slug var: ${item.slug}`);
    seenSlugs.add(item.slug);
    if (!categoryBySlug.has(item.category)) throw new Error(`Geçersiz veya pasif haber kategorisi: ${item.category}`);
    if (!Number.isFinite(Date.parse(item.publishedAt))) throw new Error(`Geçersiz yayın tarihi: ${item.slug}`);
  }

  let created = 0;
  let skipped = 0;

  for (const item of source.news) {
    const existing = await payload.find({ collection: "news", pagination: false, limit: 1, depth: 0, overrideAccess: true, where: { slug: { equals: item.slug } } });
    if (existing.docs.length) {
      skipped += 1;
      console.log(`Atlandı (mevcut): ${item.slug}`);
      continue;
    }

    const blocks = normalizeNewsBlocks(item.contentBlocks) as NewsBlock[];
    if (!blocks.length) throw new Error(`İçerik bloğu eksik: ${item.slug}`);
    const tags = normalizeTags(item.tags);
    const searchText = [item.title, item.excerpt, tags.join(" "), newsBlockText(blocks)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    if (dryRun) {
      console.log(`Hazır: ${item.slug} → ${item.category}`);
      continue;
    }

    await payload.create({
      collection: "news",
      locale: "tr",
      fallbackLocale: false,
      overrideAccess: true,
      data: {
        title: item.title.trim(),
        slug: item.slug.trim(),
        category: item.category,
        newsCategory: categoryBySlug.get(item.category),
        availableLocales: ["tr"],
        excerpt: item.excerpt.trim(),
        coverImageAlt: item.coverImageAlt.trim(),
        contentBlocks: blocks,
        tags,
        searchText,
        readTimeMinutes: calculateReadTime(searchText),
        status: "published",
        featured: item.featured === true,
        publishedAt: item.publishedAt,
        author: item.author?.trim() || "Mizan Derneği",
      },
    });
    created += 1;
    console.log(`Yayınlandı: ${item.slug}`);
  }

  console.log(JSON.stringify({ created, skipped, total: source.news.length, dryRun }, null, 2));
}

run().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
