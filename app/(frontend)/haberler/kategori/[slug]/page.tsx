import { notFound } from "next/navigation";

import { NewsListClient } from "@/components/news/news-list-client";
import { getPublicLocale } from "@/lib/i18n";
import { getActiveNewsCategories, getPublishedNews } from "@/lib/public/news";

export const dynamic = "force-dynamic";

export default async function NewsCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getPublicLocale()]);
  const [posts, categories] = await Promise.all([getPublishedNews(locale), getActiveNewsCategories(locale)]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return <NewsListClient activeCategory={slug} categories={categories} posts={posts.filter((post) => post.category?.slug === slug)} />;
}
