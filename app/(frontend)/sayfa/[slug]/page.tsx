import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText } from "lucide-react";

import { getPublicLocale, localeTag } from "@/lib/i18n";
import { getPublishedPageBySlug } from "@/lib/public/pages";

export const dynamic = "force-dynamic";
const fallbackBaseUrl = "https://www.mizandernegi.org";
function baseUrl() { return (process.env.NEXT_PUBLIC_BASE_URL || fallbackBaseUrl).replace(/\/$/, ""); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getPublicLocale()]);
  const page = await getPublishedPageBySlug(slug, locale);
  if (!page) notFound();
  const url = `${baseUrl()}/sayfa/${page.slug}`;
  return {
    title: `${page.title} | Mizan Derneği`,
    description: page.excerpt,
    alternates: { canonical: url },
    openGraph: { type: "website", title: page.title, description: page.excerpt, url, siteName: "Mizan Derneği" },
    twitter: { card: "summary", title: page.title, description: page.excerpt },
  };
}

export default async function DynamicContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getPublicLocale()]);
  const page = await getPublishedPageBySlug(slug, locale);
  if (!page) notFound();
  const url = `${baseUrl()}/sayfa/${page.slug}`;
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebPage", name: page.title, description: page.excerpt, url, dateModified: page.updatedAt, inLanguage: localeTag(locale), publisher: { "@type": "Organization", name: "Mizan Derneği" } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: baseUrl() }, { "@type": "ListItem", position: 2, name: page.title, item: url }] },
  ];
  return <>
    <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} type="application/ld+json" />
    <main className="bg-background py-14 md:py-20">
      <article className="mx-auto max-w-4xl px-margin-mobile md:px-margin-desktop">
        <nav aria-label="İçerik yolu" className="flex items-center gap-1 text-sm text-on-surface-variant"><Link className="transition hover:text-primary" href="/">Ana Sayfa</Link><ChevronRight className="size-4" /><span aria-current="page">{page.title}</span></nav>
        <header className="mt-8 border-b border-outline-variant pb-8"><span className="grid size-11 place-items-center rounded-2xl bg-primary-container text-primary"><FileText className="size-5" /></span><h1 className="mt-5 text-display-lg-mobile text-on-surface md:text-display-lg">{page.title}</h1>{page.updatedAt ? <p className="mt-4 text-sm text-on-surface-variant">Son güncelleme: {new Date(page.updatedAt).toLocaleDateString(localeTag(locale), { day: "numeric", month: "long", year: "numeric" })}</p> : null}</header>
        <div className="mt-10 space-y-6 text-body-lg leading-8 text-on-surface-variant" dir={locale === "ar" ? "rtl" : "ltr"}>{page.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}</div>
      </article>
    </main>
  </>;
}
