import { ManagementShell } from "@/components/admin/management-shell";
import { NewsManager } from "@/components/admin/news-manager";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { getNewsAdminData } from "@/lib/admin/editorial-data";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function NewsContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentNews);
  const data = await getNewsAdminData();

  return <ManagementShell currentPath="/panel/icerik/haberler" name={user.name || user.email} role={user.role}>
    <div className="space-y-6">
      <PanelPageHeader eyebrow="İçerik yönetimi" title="Haber yönetimi" description="Kapak görseli, üç dilli blok içerik, etiket, kategori, SEO ve yayın durumunu tek panelden yönetin." />
      <NewsManager campaigns={data.campaigns} categories={data.categories} news={data.news} />
    </div>
  </ManagementShell>;
}
