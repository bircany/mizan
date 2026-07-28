import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { UnifiedDonationManagement } from "@/components/admin/unified-donation-management";
import { getCampaignEditorData } from "@/lib/admin/campaign-editor-data";
import { getUnifiedDonationPanelData } from "@/lib/admin/unified-panel-data";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

const validTabs = new Set(["campaigns", "donations", "eft"]);

export default async function UnifiedDonationManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.donationManagement);
  const parameters = await searchParams;
  const tab = validTabs.has(parameters.tab ?? "") ? parameters.tab as "campaigns" | "donations" | "eft" : "campaigns";
  const [data, editorData] = await Promise.all([
    getUnifiedDonationPanelData(),
    getCampaignEditorData(),
  ]);

  return (
    <ManagementShell currentPath="/panel/bagis-yonetimi" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader
          description="Kampanyaları, kesinleşen bağışları ve dekont onayı bekleyen EFT işlemlerini tek ekrandan yönetin."
          eyebrow="Bağış operasyonu"
          title="Bağış Yönetimi"
        />
        <UnifiedDonationManagement
          {...data}
          editorData={editorData}
          query={parameters.q ?? ""}
          tab={tab}
        />
      </div>
    </ManagementShell>
  );
}
