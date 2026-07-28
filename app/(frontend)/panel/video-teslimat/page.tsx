import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { UnifiedVideoDelivery } from "@/components/admin/unified-video-delivery";
import { requireAdminUser } from "@/lib/admin/data";
import { getUnifiedDeliveryPanelData } from "@/lib/admin/unified-panel-data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

const validTabs = new Set(["waiting_video", "draft", "sending", "completed", "failed"]);

export default async function UnifiedVideoDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.videoDelivery);
  const parameters = await searchParams;
  const tab = validTabs.has(parameters.tab ?? "")
    ? parameters.tab as "waiting_video" | "draft" | "sending" | "completed" | "failed"
    : "waiting_video";
  const rows = await getUnifiedDeliveryPanelData();

  return (
    <ManagementShell currentPath="/panel/video-teslimat" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader
          description="Video bekleyen grupları, WhatsApp taslaklarını ve teslim sonuçlarını aynı iş kuyruğunda takip edin."
          eyebrow="Saha ve iletişim"
          title="Video Teslimat"
        />
        <UnifiedVideoDelivery query={parameters.q ?? ""} rows={rows} tab={tab} />
      </div>
    </ManagementShell>
  );
}
