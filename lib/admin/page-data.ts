import { getPayloadClient } from "@/lib/payload";
import { lexicalParagraphs, PAGE_LOCALES } from "@/lib/pages";
import { MANAGED_SITE_PAGES, managedSitePagePath } from "@/lib/site-pages";

export type PageTranslation = { title: string; content: string };
export type PageAdminRecord = {
  id?: string;
  slug: string;
  published: boolean;
  updatedAt: string;
  isSystemPage: boolean;
  publicPath: string;
  translations: Record<(typeof PAGE_LOCALES)[number], PageTranslation>;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function localized(value: unknown, locale: string) {
  if (typeof value === "string") return value;
  return object(value)[locale];
}

export async function getPageAdminRecords(): Promise<PageAdminRecord[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "pages", locale: "all", fallbackLocale: false, pagination: false, limit: 500, sort: "-updatedAt" });
  const records = result.docs.map((value) => {
    const page = object(value);
    return {
      id: String(page.id),
      slug: typeof page.slug === "string" ? page.slug : "",
      published: page.published === true,
      updatedAt: typeof page.updatedAt === "string" ? page.updatedAt : "",
      isSystemPage: false,
      publicPath: managedSitePagePath(typeof page.slug === "string" ? page.slug : ""),
      translations: Object.fromEntries(PAGE_LOCALES.map((locale) => {
        const title = localized(page.title, locale);
        const content = localized(page.content, locale);
        return [locale, {
          title: typeof title === "string" ? title : "",
          content: lexicalParagraphs(content).join("\n\n"),
        }];
      })) as PageAdminRecord["translations"],
    };
  });
  const bySlug = new Map(records.map((page) => [page.slug, page]));
  const systemRecords = MANAGED_SITE_PAGES.map((definition): PageAdminRecord => {
    const saved = bySlug.get(definition.slug);
    if (saved) return { ...saved, isSystemPage: true, publicPath: managedSitePagePath(definition.slug) };
    return {
      slug: definition.slug,
      published: true,
      updatedAt: "",
      isSystemPage: true,
      publicPath: managedSitePagePath(definition.slug),
      translations: {
        tr: { title: definition.title, content: definition.content },
        en: { title: "", content: "" },
        ar: { title: "", content: "" },
      },
    };
  });
  return [...systemRecords, ...records.filter((page) => !MANAGED_SITE_PAGES.some((definition) => definition.slug === page.slug))];
}
