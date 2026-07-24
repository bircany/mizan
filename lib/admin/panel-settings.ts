import "server-only";

import type { UserRole } from "@/lib/auth/roles";
import {
  DEFAULT_PANEL_QUICK_ACCESS_KEYS,
  getPanelQuickAccessItem,
  type PanelQuickAccessItem,
} from "@/lib/auth/panel-access";
import { hasRole } from "@/lib/auth/roles";
import { getPayloadClient } from "@/lib/payload";

const maximumQuickLinks = 6;

export function normalizePanelQuickLinks(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  const keys = raw.filter((item): item is string => typeof item === "string");
  const unique = [...new Set(keys)].filter((key) => Boolean(getPanelQuickAccessItem(key)));
  return unique.slice(0, maximumQuickLinks);
}

export async function getSharedPanelQuickLinkKeys() {
  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "panel-settings" as never,
      limit: 1,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }) as unknown as { docs: Array<{ quickLinks?: unknown }> };
    const saved = normalizePanelQuickLinks(result.docs[0]?.quickLinks);
    return saved.length ? saved : [...DEFAULT_PANEL_QUICK_ACCESS_KEYS];
  } catch (error) {
    console.warn("Panel hızlı erişim ayarı okunamadı; varsayılanlar kullanılıyor.", error instanceof Error ? error.message : String(error));
    return [...DEFAULT_PANEL_QUICK_ACCESS_KEYS];
  }
}

export async function getVisiblePanelQuickLinks(role: UserRole): Promise<PanelQuickAccessItem[]> {
  const keys = await getSharedPanelQuickLinkKeys();
  return keys
    .map(getPanelQuickAccessItem)
    .filter((item): item is PanelQuickAccessItem => item !== undefined)
    .filter((item) => hasRole(role, item.roles));
}

export const PANEL_QUICK_LINK_LIMIT = maximumQuickLinks;
