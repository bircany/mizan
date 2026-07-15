import { ContentManagementPage } from "@/components/admin/content-management-page";
import { CONTENT_DEFINITIONS, getContentRecords } from "@/lib/admin/content";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function CampaignContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentCampaigns);
  const records = await getContentRecords("campaigns");

  return <ContentManagementPage currentPath="/panel/icerik/bagis-alanlari" definition={CONTENT_DEFINITIONS.campaigns} records={records} user={user} />;
}
