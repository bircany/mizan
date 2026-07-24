import { ManagementShell } from "@/components/admin/management-shell";
import { MediaManager } from "@/components/admin/media-manager";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { getMediaAdminRecords } from "@/lib/admin/media-data";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentMedia);
  const records = await getMediaAdminRecords();
  return <ManagementShell currentPath="/panel/icerik/medya" name={user.name || user.email} role={user.role}><div className="space-y-6"><PanelPageHeader description="Site görsellerini güvenli biçimde yükleyin, açıklamalarını düzenleyin ve kullanım durumlarını izleyin." eyebrow="İçerik yönetimi" title="Medya kütüphanesi" /><MediaManager records={records} /></div></ManagementShell>;
}
