import { NextRequest, NextResponse } from "next/server";
import { getPublicLocale, isAppLocale } from "@/lib/i18n";
import { getPopularRecentNews } from "@/lib/public/news";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = isAppLocale(requestedLocale) ? requestedLocale : await getPublicLocale();
  const posts = await getPopularRecentNews(locale);
  return NextResponse.json({ posts: posts.map(post => ({
    id: post.id, slug: post.slug, title: post.title, excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl, coverImageAlt: post.coverImageAlt,
    publishedAt: post.publishedAt,
  })), locale });
}
