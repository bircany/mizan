import { ManagementShell } from "@/components/admin/management-shell";
import { PagesManager } from "@/components/admin/pages-manager";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { getPageAdminRecords } from "@/lib/admin/page-data";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function StaticPagesContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentPages);
  const records = await getPageAdminRecords();

  return <ManagementShell currentPath="/panel/icerik/sayfalar" name={user.name || user.email} role={user.role}>
    <div className="space-y-6"><PanelPageHeader description="Üç dilli bilgilendirme sayfalarını oluşturun, taslak olarak hazırlayın ve yayınlayın." eyebrow="İçerik yönetimi" title="Sayfalar" /><PagesManager records={records} /></div>
  </ManagementShell>;
}
