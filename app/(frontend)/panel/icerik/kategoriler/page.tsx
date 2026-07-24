import { DonationCategoryManager } from "@/components/admin/donation-category-manager";
import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { getDonationCategoryAdminRecords } from "@/lib/admin/editorial-data";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function CategoriesContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentCategories);
  const categories = await getDonationCategoryAdminRecords();

  return <ManagementShell currentPath="/panel/icerik/kategoriler" name={user.name || user.email} role={user.role}>
    <div className="space-y-6">
      <PanelPageHeader eyebrow="İçerik yönetimi" title="Bağış kategorileri" description="Bağış alanlarında kullanılan üç dilli kategorileri, renkleri ve sıralamayı yönetin." />
      <DonationCategoryManager categories={categories} />
    </div>
  </ManagementShell>;
}
