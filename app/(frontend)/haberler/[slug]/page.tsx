import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock3, Eye, Tag } from "lucide-react";

import { NewsBlockRenderer } from "@/components/news/news-block-renderer";
import { NewsViewTracker } from "@/components/news/news-view-tracker";
import { getPublicLocale, localeTag } from "@/lib/i18n";
import { getPublishedNews, getPublishedNewsBySlug } from "@/lib/public/news";

export const dynamic = "force-dynamic";
const fallbackBaseUrl = "https://www.mizandernegi.org";

function baseUrl() { return (process.env.NEXT_PUBLIC_BASE_URL || fallbackBaseUrl).replace(/\/$/, ""); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getPublicLocale()]);
  const post = await getPublishedNewsBySlug(slug, locale);
  if (!post) return { title: "Haber bulunamadı | Mizan Derneği" };
  const url = `${baseUrl()}/haberler/${post.slug}`;
  return {
    title: post.metaTitle,
    description: post.metaDescription,
    alternates: { canonical: url },
    openGraph: { type: "article", title: post.metaTitle, description: post.metaDescription, url, publishedTime: post.publishedAt, modifiedTime: post.updatedAt, section: post.category?.name || "Haberler", images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.coverImageAlt }] : undefined },
    twitter: { card: "summary_large_image", title: post.metaTitle, description: post.metaDescription, images: post.coverImageUrl ? [post.coverImageUrl] : undefined },
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getPublicLocale()]);
  const [post, allPosts] = await Promise.all([getPublishedNewsBySlug(slug, locale), getPublishedNews(locale)]);
  if (!post) notFound();
  const related = allPosts.filter((item) => item.id !== post.id && ((post.category && item.category?.id === post.category.id) || item.tags.some((tag) => post.tags.includes(tag)))).slice(0, 3);
  const url = `${baseUrl()}/haberler/${post.slug}`;
  const jsonLd = [{ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.metaDescription, image: post.coverImageUrl ? [post.coverImageUrl] : undefined, datePublished: post.publishedAt, dateModified: post.updatedAt, author: { "@type": "Organization", name: "Mizan Derneği" }, publisher: { "@type": "Organization", name: "Mizan Derneği", logo: { "@type": "ImageObject", url: `${baseUrl()}/logo.png` } }, mainEntityOfPage: url, keywords: post.tags.join(", ") }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: baseUrl() }, { "@type": "ListItem", position: 2, name: "Haberler", item: `${baseUrl()}/haberler` }, { "@type": "ListItem", position: 3, name: post.title, item: url }] }];
  return <>
    <NewsViewTracker slug={post.slug} />
    <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} type="application/ld+json" />
    <header className="relative min-h-[420px] overflow-hidden bg-primary md:min-h-[520px]">{post.coverImageUrl ? <Image alt={post.coverImageAlt} className="object-cover" fill priority sizes="100vw" src={post.coverImageUrl} /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15"/><div className="relative mx-auto flex min-h-[420px] max-w-container-max flex-col justify-end px-margin-mobile py-xl text-white md:min-h-[520px] md:px-margin-desktop">{post.category ? <Link className="mb-4 w-fit rounded-full bg-secondary px-4 py-1.5 text-sm font-bold" href={`/haberler/kategori/${post.category.slug}`}>{post.category.name}</Link> : null}<h1 className="max-w-4xl text-display-lg-mobile md:text-display-lg">{post.title}</h1><div className="mt-5 flex flex-wrap gap-5 text-sm text-white/80"><span className="flex items-center gap-2"><CalendarDays className="size-4"/>{new Date(post.publishedAt).toLocaleDateString(localeTag(locale), { day:"numeric", month:"long", year:"numeric" })}</span><span className="flex items-center gap-2"><Clock3 className="size-4"/>{post.readTimeMinutes} dk okuma</span><span className="flex items-center gap-2"><Eye className="size-4"/>{post.viewCount} görüntülenme</span></div></div></header>
    <main className="mx-auto grid max-w-container-max gap-xl px-margin-mobile py-xl md:px-margin-desktop lg:grid-cols-[minmax(0,1fr)_320px]"><article><p className="mb-8 text-headline-md leading-8 text-on-surface">{post.excerpt}</p><NewsBlockRenderer blocks={post.blocks} campaigns={post.relatedCampaigns} />{post.tags.length ? <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-6"><Tag className="size-4 text-primary"/>{post.tags.map((tag) => <span className="rounded-full bg-surface-container px-3 py-1 text-sm" key={tag}>#{tag}</span>)}</div> : null}</article><aside className="space-y-5"><div className="rounded-[24px] border border-outline-variant bg-surface p-5"><h2 className="text-headline-md">İlgili bağış alanları</h2>{post.relatedCampaigns.length ? <div className="mt-4 space-y-3">{post.relatedCampaigns.map((campaign) => <Link className="block rounded-xl border border-outline-variant p-4 transition hover:border-primary" href={`/bagis/${campaign.slug}`} key={campaign.id}><strong className="text-on-surface">{campaign.title}</strong><p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{campaign.description}</p></Link>)}</div> : <p className="mt-3 text-sm text-on-surface-variant">Bu haber için bağlı bağış alanı yok.</p>}</div><Link className="block rounded-[24px] bg-primary p-6 text-white" href="/bagis"><strong className="text-headline-md">İyiliğe ortak olun</strong><p className="mt-2 text-sm text-white/80">Aktif bağış alanlarını inceleyin.</p><span className="mt-4 inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-bold">Bağış alanları</span></Link></aside></main>
    {related.length ? <section className="bg-surface-container-low py-xl"><div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop"><p className="text-sm font-bold uppercase tracking-widest text-secondary">Devam et</p><h2 className="mt-2 text-headline-xl text-primary">İlgili haberler</h2><div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{related.map((item) => <Link className="grid grid-cols-[80px_1fr] gap-4 rounded-[24px] border border-outline-variant bg-surface p-4 transition hover:border-primary" href={`/haberler/${item.slug}`} key={item.id}>{item.coverImageUrl ? <div className="relative size-20 overflow-hidden rounded-xl"><Image alt={item.coverImageAlt} className="object-cover" fill sizes="80px" src={item.coverImageUrl}/></div> : <div className="grid size-20 place-items-center rounded-xl bg-primary-container"><span className="material-symbols-outlined">newspaper</span></div>}<div><span className="text-xs font-bold text-primary">{item.category?.name}</span><h3 className="mt-1 line-clamp-2 font-semibold text-on-surface">{item.title}</h3><p className="mt-1 line-clamp-1 text-xs text-on-surface-variant">{item.excerpt}</p></div></Link>)}</div></div></section> : null}
  </>;
}
