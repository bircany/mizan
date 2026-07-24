import { getPayloadClient } from "@/lib/payload";

export type MediaAdminRecord = {
  id: string;
  alt: string;
  filename: string;
  url: string;
  mimeType: string;
  filesize: number;
  width: number;
  height: number;
  createdAt: string;
  usage: string[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function relationId(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const id = record(value).id;
  return typeof id === "string" || typeof id === "number" ? String(id) : "";
}

function collectMediaIds(value: unknown, ids = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaIds(item, ids));
    return ids;
  }
  if (!value || typeof value !== "object") return ids;
  const item = value as Record<string, unknown>;
  if (item.type === "upload" || item.relationTo === "media") {
    const id = relationId(item.value || item.id);
    if (id) ids.add(id);
  }
  Object.values(item).forEach((child) => collectMediaIds(child, ids));
  return ids;
}

async function getUsageIndex(payload: Awaited<ReturnType<typeof getPayloadClient>>) {
  const [campaigns, news, pages] = await Promise.all([
    payload.find({ collection: "campaigns", depth: 0, pagination: false, limit: 1000 }),
    payload.find({ collection: "news", depth: 0, pagination: false, limit: 1000 }),
    payload.find({ collection: "pages", locale: "all", fallbackLocale: false, depth: 0, pagination: false, limit: 1000 }),
  ]);
  const index = new Map<string, string[]>();
  const add = (id: string, label: string) => { if (id) index.set(id, [...(index.get(id) || []), label]); };
  campaigns.docs.forEach((item) => { const campaign = record(item); add(relationId(campaign.image), `Bağış alanı: ${String(campaign.title || campaign.slug || campaign.id)}`); });
  news.docs.forEach((item) => { const post = record(item); add(relationId(post.image), `Haber: ${String(post.title || post.slug || post.id)}`); });
  pages.docs.forEach((item) => {
    const page = record(item);
    collectMediaIds(page.content).forEach((id) => add(id, `Sayfa: ${String(page.slug || page.id)}`));
  });
  return index;
}

export async function getMediaUsage(mediaId: string) {
  const payload = await getPayloadClient();
  return (await getUsageIndex(payload)).get(mediaId) || [];
}

export async function getMediaAdminRecords(): Promise<MediaAdminRecord[]> {
  const payload = await getPayloadClient();
  const [result, usageIndex] = await Promise.all([
    payload.find({ collection: "media", depth: 0, pagination: false, limit: 2000, sort: "-createdAt" }),
    getUsageIndex(payload),
  ]);
  return result.docs.map((value) => {
    const media = record(value);
    const rawUrl = typeof media.url === "string" ? media.url : "";
    return {
      id: String(media.id),
      alt: typeof media.alt === "string" ? media.alt : "",
      filename: typeof media.filename === "string" ? media.filename : "Görsel",
      url: rawUrl && !rawUrl.startsWith("/") ? `/${rawUrl}` : rawUrl,
      mimeType: typeof media.mimeType === "string" ? media.mimeType : "",
      filesize: typeof media.filesize === "number" ? media.filesize : 0,
      width: typeof media.width === "number" ? media.width : 0,
      height: typeof media.height === "number" ? media.height : 0,
      createdAt: typeof media.createdAt === "string" ? media.createdAt : "",
      usage: usageIndex.get(String(media.id)) || [],
    };
  });
}
