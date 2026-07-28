import { ManagementShell } from "@/components/admin/management-shell";
import { HelpCenter } from "@/components/admin/help-center";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";
export default async function HelpPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.help);
  return <ManagementShell currentPath="/panel/yardim" name={user.name || user.email} role={user.role}><div className="space-y-6"><PanelPageHeader eyebrow="Panel rehberi" title="Yardım ve Destek" description="Operasyon adımlarını, yetki bilgilerini ve çözüm rehberlerini arayın." /><HelpCenter /></div></ManagementShell>;
}
