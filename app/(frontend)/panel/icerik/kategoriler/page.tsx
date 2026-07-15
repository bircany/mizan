import { ContentManagementPage } from "@/components/admin/content-management-page";
import { CONTENT_DEFINITIONS, getContentRecords } from "@/lib/admin/content";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function CategoriesContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentCategories);
  const records = await getContentRecords("categories");

  return <ContentManagementPage currentPath="/panel/icerik/kategoriler" definition={CONTENT_DEFINITIONS.categories} records={records} user={user} />;
}
