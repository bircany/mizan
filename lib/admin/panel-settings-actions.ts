"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/audit";
import { requireAdminUser } from "@/lib/admin/data";
import { getPanelQuickAccessItem } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";
import { normalizePanelQuickLinks, PANEL_QUICK_LINK_LIMIT } from "@/lib/admin/panel-settings";

export type PanelSettingsActionState = { success: boolean; message: string | null };

export async function savePanelQuickLinks(_: PanelSettingsActionState, formData: FormData): Promise<PanelSettingsActionState> {
  const actor = await requireAdminUser(["super_admin"]);
  try {
    const requested = formData.getAll("quickLinks").map(String);
    const quickLinks = normalizePanelQuickLinks(requested);
    if (requested.length > PANEL_QUICK_LINK_LIMIT || quickLinks.length !== requested.length || quickLinks.some((key) => !getPanelQuickAccessItem(key))) {
      throw new Error("Hızlı erişim seçimleri geçerli değil.");
    }
    const payload = await getPayloadClient();
    const existing = await payload.find({ collection: "panel-settings" as never, limit: 1, pagination: false, depth: 0, overrideAccess: true }) as unknown as { docs: Array<{ id: string | number }> };
    if (existing.docs[0]) {
      await payload.update({ collection: "panel-settings" as never, id: existing.docs[0].id, data: { quickLinks } as never, overrideAccess: true });
    } else {
      await payload.create({ collection: "panel-settings" as never, data: { quickLinks } as never, overrideAccess: true });
    }
    await logAuditEvent(payload, { action: "panel.quick_links.updated", actorEmail: actor.email, targetCollection: "panel-settings", targetId: "1", details: { quickLinks } });
    revalidatePath("/panel");
    return { success: true, message: "Ortak hızlı erişim güncellendi." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Hızlı erişim kaydedilemedi." };
  }
}
