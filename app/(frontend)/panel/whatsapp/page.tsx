import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { WhatsAppConnectionPanel } from "@/components/admin/whatsapp-connection-panel";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import {
  getEvolutionConnectionStatus,
  getEvolutionWebhookStatus,
} from "@/lib/qurbani/evolution";

export const dynamic = "force-dynamic";

export default async function WhatsAppSettingsPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.whatsapp);
  const [status, webhook] = await Promise.all([
    getEvolutionConnectionStatus(),
    getEvolutionWebhookStatus(),
  ]);

  return (
    <ManagementShell
      currentPath="/panel/whatsapp"
      name={user.name || user.email}
      role={user.role}
    >
      <div className="space-y-6">
        <PanelPageHeader
          description="Video teslimatlarında kullanılacak kurumsal WhatsApp hesabını bağlayın ve Evolution API durumunu izleyin."
          eyebrow="Mesaj teslimatı"
          title="WhatsApp Bağlantısı"
        />
        <WhatsAppConnectionPanel
          initialStatus={status}
          initialWebhook={webhook}
        />
      </div>
    </ManagementShell>
  );
}
