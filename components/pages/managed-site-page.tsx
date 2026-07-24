import { FileText } from "lucide-react";

import { getPublicLocale, localeTag } from "@/lib/i18n";
import { getPublishedPageBySlug } from "@/lib/public/pages";
import { getManagedSitePage } from "@/lib/site-pages";

export async function ManagedSitePage({ slug }: { slug: string }) {
  const [locale, fallback] = await Promise.all([getPublicLocale(), Promise.resolve(getManagedSitePage(slug))]);
  const page = await getPublishedPageBySlug(slug, locale);
  const title = page?.title || fallback?.title || "Bilgilendirme sayfası";
  const paragraphs = page?.paragraphs?.length
    ? page.paragraphs
    : (fallback?.content || "Bu sayfanın içeriği henüz hazırlanmadı.").split(/\n\s*\n/).filter(Boolean);

  return (
    <main className="bg-background py-14 md:py-20">
      <article className="mx-auto max-w-4xl px-margin-mobile md:px-margin-desktop">
        <header className="border-b border-outline-variant pb-8">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary-container text-primary"><FileText className="size-5" /></span>
          <h1 className="mt-5 text-display-lg-mobile text-on-surface md:text-display-lg">{title}</h1>
          {page?.updatedAt ? <p className="mt-4 text-sm text-on-surface-variant">Son güncelleme: {new Date(page.updatedAt).toLocaleDateString(localeTag(locale), { day: "numeric", month: "long", year: "numeric" })}</p> : null}
        </header>
        <div className="mt-10 space-y-6 whitespace-pre-line text-body-lg leading-8 text-on-surface-variant" dir={locale === "ar" ? "rtl" : "ltr"}>
          {paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
        </div>
      </article>
    </main>
  );
}
