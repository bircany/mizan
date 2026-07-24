import type { MetadataRoute } from "next";

import { getOpenDonationAreas } from "@/lib/public/donation-areas";
import { getPublishedNews } from "@/lib/public/news";
import { getPublishedPages } from "@/lib/public/pages";
import { isManagedSitePageSlug } from "@/lib/site-pages";

const baseUrl = "https://www.mizandernegi.org";

const staticRoutes = [
  { url: "/", changefreq: "weekly" as const, priority: 1.0 },
  { url: "/bagis", changefreq: "weekly" as const, priority: 0.9 },
  { url: "/haberler", changefreq: "daily" as const, priority: 0.8 },
  { url: "/hakkimizda", changefreq: "monthly" as const, priority: 0.7 },
  { url: "/kurban", changefreq: "yearly" as const, priority: 0.9 },
  { url: "/iletisim", changefreq: "monthly" as const, priority: 0.6 },
  { url: "/kvkk-aydinlatma-metni", changefreq: "yearly" as const, priority: 0.3 },
  { url: "/cerez-politikasi", changefreq: "yearly" as const, priority: 0.3 },
  { url: "/gizlilik-politikasi", changefreq: "yearly" as const, priority: 0.3 },
  { url: "/kullanim-kosullari", changefreq: "yearly" as const, priority: 0.3 },
  { url: "/bagis-ve-destek-sartlari", changefreq: "yearly" as const, priority: 0.3 },
  { url: "/odeme", changefreq: "monthly" as const, priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return createSitemap();
}

async function createSitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    changeFrequency: route.changefreq,
    priority: route.priority,
    lastModified: new Date(),
  }));

  let campaignEntries: MetadataRoute.Sitemap = [];
  try {
    const areas = await getOpenDonationAreas();
    campaignEntries = areas.map((area) => ({
      url: `${baseUrl}/bagis/${area.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      lastModified: new Date(),
    }));
  } catch {
    campaignEntries = [];
  }

  let newsEntries: MetadataRoute.Sitemap = [];
  try {
    newsEntries = (await getPublishedNews("tr")).map((post) => ({
      url: `${baseUrl}/haberler/${post.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
    }));
  } catch {
    newsEntries = [];
  }

  let pageEntries: MetadataRoute.Sitemap = [];
  try {
    pageEntries = (await getPublishedPages("tr")).filter((page) => !isManagedSitePageSlug(page.slug)).map((page) => ({
      url: `${baseUrl}/sayfa/${page.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
      lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date(),
    }));
  } catch {
    pageEntries = [];
  }

  return [...staticEntries, ...campaignEntries, ...newsEntries, ...pageEntries];
}
