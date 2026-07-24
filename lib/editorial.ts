import type { AppLocale } from "@/lib/i18n";

export const EDITORIAL_LOCALES = ["tr", "en", "ar"] as const satisfies readonly AppLocale[];

export type NewsBlock =
  | { id: string; type: "heading"; level: 2 | 3 | 4; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "list"; ordered: boolean; items: string[] }
  | { id: string; type: "quote"; text: string; cite: string }
  | { id: string; type: "image"; src: string; alt: string; caption: string }
  | { id: string; type: "campaign"; campaignId: number; label: string; note: string }
  | { id: string; type: "cta"; href: string; label: string; text: string }
  | { id: string; type: "divider" };

export type LocalizedNewsInput = {
  title: string;
  excerpt: string;
  coverImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[] | string;
  blocks: NewsBlock[];
};

export function slugifyEditorial(value: string) {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (letter) => map[letter] || letter)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function normalizeTags(value: unknown) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Set<string>();
  return source
    .map((item) => String(item).trim())
    .filter((item) => {
      const key = item.toLocaleLowerCase("tr-TR");
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function blockId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : crypto.randomUUID();
}

export function normalizeNewsBlocks(value: unknown): NewsBlock[] {
  if (!Array.isArray(value)) return [];
  const blocks: NewsBlock[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const block = item as Record<string, unknown>;
    const id = blockId(block.id);
    if (block.type === "heading") {
      const level = block.level === 3 || block.level === 4 ? block.level : 2;
      const text = String(block.text || "").trim();
      if (text) blocks.push({ id, type: "heading", level, text });
    } else if (block.type === "paragraph") {
      const text = String(block.text || "").trim();
      if (text) blocks.push({ id, type: "paragraph", text });
    } else if (block.type === "list") {
      const items = (Array.isArray(block.items) ? block.items : String(block.items || "").split("\n")).map(String).map((entry) => entry.trim()).filter(Boolean);
      if (items.length) blocks.push({ id, type: "list", ordered: block.ordered === true, items });
    } else if (block.type === "quote") {
      const text = String(block.text || "").trim();
      if (text) blocks.push({ id, type: "quote", text, cite: String(block.cite || "").trim() });
    } else if (block.type === "image") {
      const src = String(block.src || "").trim();
      const alt = String(block.alt || "").trim();
      if (src && alt) blocks.push({ id, type: "image", src, alt, caption: String(block.caption || "").trim() });
    } else if (block.type === "campaign") {
      const campaignId = Number(block.campaignId);
      if (Number.isInteger(campaignId) && campaignId > 0) blocks.push({ id, type: "campaign", campaignId, label: String(block.label || "").trim(), note: String(block.note || "").trim() });
    } else if (block.type === "cta") {
      const href = String(block.href || "").trim();
      const label = String(block.label || "").trim();
      if (href && label) blocks.push({ id, type: "cta", href, label, text: String(block.text || "").trim() });
    } else if (block.type === "divider") {
      blocks.push({ id, type: "divider" });
    }
  }
  return blocks;
}

export function newsBlockText(blocks: NewsBlock[]) {
  return blocks.flatMap((block) => {
    if (block.type === "heading" || block.type === "paragraph") return [block.text];
    if (block.type === "list") return block.items;
    if (block.type === "quote") return [block.text, block.cite];
    if (block.type === "image") return [block.alt, block.caption];
    if (block.type === "campaign") return [block.label, block.note];
    if (block.type === "cta") return [block.label, block.text, block.href];
    return [];
  }).filter(Boolean).join(" ");
}

export function calculateReadTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
