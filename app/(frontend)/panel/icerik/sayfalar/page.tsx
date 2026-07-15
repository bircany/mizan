import { ContentManagementPage } from "@/components/admin/content-management-page";
import { CONTENT_DEFINITIONS, getContentRecords } from "@/lib/admin/content";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function StaticPagesContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentPages);
  const records = await getContentRecords("pages");

  return <ContentManagementPage currentPath="/panel/icerik/sayfalar" definition={CONTENT_DEFINITIONS.pages} records={records} user={user} />;
}
