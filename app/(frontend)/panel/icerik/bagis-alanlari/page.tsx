import { UnifiedCampaignEditor } from "@/components/admin/unified-campaign-editor";
import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelPageHeader } from "@/components/admin/panel-ui";
import { getCampaignEditorData } from "@/lib/admin/campaign-editor-data";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function CampaignContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentCampaigns);
  const { categoryOptions, mediaOptions, records } = await getCampaignEditorData();

  return (
    <ManagementShell
      currentPath="/panel/bagis-yonetimi"
      name={user.name || user.email}
      role={user.role}
    >
      <div className="space-y-6">
        <PanelPageHeader
          description="Serbest veya sabit tutarlı kampanyaları adım adım ilerleyen kısa oluşturma ekranından yönetin."
          eyebrow="Bağış yönetimi"
          title="Kampanyalar"
        />
        <UnifiedCampaignEditor
          categories={categoryOptions}
          media={mediaOptions}
        />
        {records.length ? (
          <div className="space-y-4">
            {records.map((record) => (
              <UnifiedCampaignEditor
                categories={categoryOptions}
                key={record.id}
                media={mediaOptions}
                record={record}
              />
            ))}
          </div>
        ) : (
          <EmptyPanelState
            description="Yeni bağış kampanyası düğmesinden adım adım ilerleyerek ilk kampanyayı oluşturun."
            title="Henüz kampanya yok"
          />
        )}
      </div>
    </ManagementShell>
  );
}
