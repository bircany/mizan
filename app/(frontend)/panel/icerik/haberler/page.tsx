import { ContentManagementPage } from "@/components/admin/content-management-page";
import { CONTENT_DEFINITIONS, getContentRecords } from "@/lib/admin/content";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function NewsContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentNews);
  const records = await getContentRecords("news");

  return <ContentManagementPage currentPath="/panel/icerik/haberler" definition={CONTENT_DEFINITIONS.news} records={records} user={user} />;
}
