import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { UnifiedVideoDelivery } from "@/components/admin/unified-video-delivery";
import { requireAdminUser } from "@/lib/admin/data";
import { getUnifiedDeliveryPanelData } from "@/lib/admin/unified-panel-data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { parseVideoFilters,videoTabs,type VideoTab } from "@/lib/admin/video-filters";

export const dynamic = "force-dynamic";

const validTabs = new Set<string>(videoTabs);

export default async function UnifiedVideoDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string,string|string[]|undefined>>;
}) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.videoDelivery);
  const parameters = await searchParams;
  const tab = typeof parameters.tab === "string" && validTabs.has(parameters.tab)
    ? parameters.tab as VideoTab
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
        <UnifiedVideoDelivery filters={parseVideoFilters(parameters)} rows={rows} tab={tab} canManage={user.role === "admin"} />
      </div>
    </ManagementShell>
  );
}
