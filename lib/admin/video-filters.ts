import type { UnifiedDeliveryRow } from "./unified-panel-data";

export const videoTabs = [
  "all",
  "waiting_video",
  "draft",
  "sending",
  "completed",
  "failed",
] as const;
export type VideoTab = (typeof videoTabs)[number];
export type VideoFilters = {
  q: string;
  campaign: string;
  category: string;
  group: string;
  from: string;
  to: string;
  view: "cards" | "table";
  page: number;
};
const value = (v: unknown) =>
  typeof v === "string" ? v.trim().slice(0, 160) : "";
function date(v: unknown) {
  const s = value(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
    ? s
    : "";
}
export function parseVideoFilters(
  params: Record<string, unknown>,
): VideoFilters {
  return {
    q: value(params.q),
    campaign: value(params.campaign),
    category: value(params.category),
    group: value(params.group),
    from: date(params.from),
    to: date(params.to),
    view: params.view === "table" ? "table" : "cards",
    page: Math.min(
      100000,
      Math.max(
        1,
        Number.isSafeInteger(Number(params.page)) ? Number(params.page) : 1,
      ),
    ),
  };
}
const lower = (v: string) => v.toLocaleLowerCase("tr-TR");
export function videoTab(row: UnifiedDeliveryRow): VideoTab {
  if (
    [row.status, row.videoStatus].some((s) =>
      [
        "failed",
        "cancelled",
        "rejected",
        "processing_failed",
        "quarantined",
        "action_required",
      ].includes(s),
    )
  )
    return "failed";
  if (
    ["queued", "countdown", "paused", "sending", "delivery_started"].includes(
      row.status,
    )
  )
    return "sending";
  if (
    ["sent", "delivered", "read", "completed", "notified"].includes(row.status)
  )
    return "completed";
  if (
    [
      "waiting",
      "uploading",
      "uploaded",
      "processing",
      "review_pending",
    ].includes(row.videoStatus)
  )
    return "waiting_video";
  return "draft";
}
export function filterVideos(rows: UnifiedDeliveryRow[], f: VideoFilters) {
  if (f.from && f.to && f.from > f.to) return [];
  return rows.filter((row) => {
    if (
      (f.campaign && row.campaignId !== f.campaign) ||
      (f.category && row.categoryId !== f.category)
    )
      return false;
    if (f.group && !lower(row.groupCode).includes(lower(f.group))) return false;
    if (
      f.q &&
      ![
        row.campaign,
        row.groupCode,
        row.recipient,
        ...row.recipients.map((r) => r.name),
      ].some((v) => lower(v).includes(lower(f.q)))
    )
      return false;
    if (f.from || f.to) {
      if (!row.updatedAt || !Number.isFinite(Date.parse(row.updatedAt)))
        return false;
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(row.updatedAt));
      if ((f.from && day < f.from) || (f.to && day > f.to)) return false;
    }
    return true;
  });
}
export function videoQuery(f: VideoFilters, tab: VideoTab, page = 1) {
  const query = new URLSearchParams({ tab, view: f.view });
  for (const key of [
    "q",
    "campaign",
    "category",
    "group",
    "from",
    "to",
  ] as const)
    if (f[key]) query.set(key, f[key]);
  if (page > 1) query.set("page", String(page));
  return query.toString();
}
