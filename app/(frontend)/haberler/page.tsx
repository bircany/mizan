import { NewsListClient } from "@/components/news/news-list-client";
import { getPublicLocale } from "@/lib/i18n";
import { getActiveNewsCategories, getPublishedNews } from "@/lib/public/news";

export const dynamic = "force-dynamic";

export default async function HaberlerPage() {
  const locale = await getPublicLocale();
  const [posts, categories] = await Promise.all([getPublishedNews(locale), getActiveNewsCategories(locale)]);
  return <NewsListClient categories={categories} posts={posts} />;
}
