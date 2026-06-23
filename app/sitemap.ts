import type { MetadataRoute } from "next";

const baseUrl = "https://www.mizandernegi.org";

const staticRoutes = [
  { url: "/", changefreq: "weekly" as const, priority: 1.0 },
  { url: "/bagis", changefreq: "weekly" as const, priority: 0.9 },
  { url: "/haberler", changefreq: "daily" as const, priority: 0.8 },
  { url: "/hakkimizda", changefreq: "monthly" as const, priority: 0.7 },
  { url: "/kurban", changefreq: "yearly" as const, priority: 0.9 },
  { url: "/iletisim", changefreq: "monthly" as const, priority: 0.6 },
  { url: "/odeme", changefreq: "monthly" as const, priority: 0.3 },
];

const campaignSlugs = [
  "afrika-kurban-organizasyonu",
  "mizan-mescidi-insaati",
  "islami-ilimler-medresesi",
  "suriye-acil-yardim",
  "somali-su-kuyusu",
  "yetim-sponsorlugu",
];

const newsSlugs = [
  "ramazan-kumanya-dagitimlari-basladi",
  "cadda-yeni-su-kuyumuz-acildi",
  "medrese-egitim-donemi-kayitlari",
  "tanzanya-50-yeni-su-kuyusu",
  "deprem-bolgesine-acil-yardim-sevkiyati",
  "gelecege-miras-genclik-bulusmasi",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    changeFrequency: route.changefreq,
    priority: route.priority,
    lastModified: new Date(),
  }));

  const campaignEntries = campaignSlugs.map((slug) => ({
    url: `${baseUrl}/bagis/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    lastModified: new Date(),
  }));

  const newsEntries = newsSlugs.map((slug) => ({
    url: `${baseUrl}/haberler/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...campaignEntries, ...newsEntries];
}
