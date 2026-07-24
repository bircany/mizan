import "server-only";

import { getPayloadClient } from "@/lib/payload";
import { digestQurbaniAccessToken, verifyQurbaniAccessToken } from "@/lib/qurbani/tokens";

const relationId = (value: unknown) => typeof value === "object" && value && "id" in value ? String((value as { id: number | string }).id) : String(value || "");

export async function resolveQurbaniAccess(token: string, markAccess = false) {
  if (!verifyQurbaniAccessToken(token)) return null;
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "qurbani-access-links",
    where: { tokenDigest: { equals: digestQurbaniAccessToken(token) } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });
  const link = result.docs[0];
  if (!link || link.revokedAt || new Date(link.expiresAt).getTime() <= Date.now()) return null;
  const video = typeof link.video === "object" && link.video ? link.video : await payload.findByID({ collection: "qurbani-videos", id: relationId(link.video), depth: 0, overrideAccess: true });
  if (!["ready_to_send", "approved"].includes(video.status) || !video.processedStorageKey) return null;
  const pool = typeof link.pool === "object" && link.pool ? link.pool : await payload.findByID({ collection: "qurbani-pools", id: relationId(link.pool), depth: 0, overrideAccess: true });
  const allowedIds = new Set((Array.isArray(link.shareIds) ? link.shareIds : []).map(String));
  const linkedShares = Array.isArray(link.shares) ? link.shares : [];
  const shares = linkedShares
    .filter((share: any) => allowedIds.size === 0 || allowedIds.has(relationId(share)))
    .map((share: any) => ({ id: relationId(share), ownerName: String(share.ownerName || ""), sequence: Number(share.sequence || 0) }));

  if (markAccess) {
    await payload.update({ collection: "qurbani-access-links", id: link.id, data: { lastAccessedAt: new Date().toISOString(), accessCount: Number(link.accessCount || 0) + 1 }, overrideAccess: true }).catch(() => undefined);
  }
  return {
    linkId: String(link.id),
    poolId: relationId(pool),
    code: String(pool.code || ""),
    shares,
    videoId: relationId(video),
    processedStorageKey: String(video.processedStorageKey),
    expiresAt: String(link.expiresAt),
  };
}
