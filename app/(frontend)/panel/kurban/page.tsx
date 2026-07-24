import { Beef, ShieldCheck } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import {
  QurbaniManager,
  type QurbaniWhatsAppStatus,
} from "@/components/admin/qurbani-manager";
import { getQurbaniAdminSnapshot, requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getEvolutionConnectionStatus } from "@/lib/qurbani/evolution";

export const dynamic = "force-dynamic";

async function getInitialWhatsAppStatus(): Promise<QurbaniWhatsAppStatus> {
  const configured = Boolean(
    process.env.EVOLUTION_API_URL &&
    process.env.EVOLUTION_API_KEY &&
    process.env.EVOLUTION_INSTANCE_NAME,
  );
  return configured
    ? getEvolutionConnectionStatus()
    : {
        state: "unconfigured",
        message: "Evolution API sunucu değişkenleri henüz yapılandırılmadı.",
      };
}

export default async function QurbaniAdminPage({ searchParams }: { searchParams: Promise<{ action?: string; section?: string }> }) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.qurbani);
  const params = await searchParams;
  const requestedSection = params.section;
  const initialSection = (requestedSection === "orders" || requestedSection === "field" || requestedSection === "delivery" || requestedSection === "settings" || requestedSection === "sales" ? requestedSection : "sales") as "sales" | "orders" | "field" | "delivery" | "settings";
  const [snapshot, whatsapp] = await Promise.all([
    getQurbaniAdminSnapshot(user),
    user.role === "super_admin"
      ? getInitialWhatsAppStatus()
      : Promise.resolve({ state: "unconfigured" } as QurbaniWhatsAppStatus),
  ]);
  const canManage = user.role === "super_admin";

  return (
    <ManagementShell
      currentPath="/panel/kurban"
      name={user.name || user.email}
      role={user.role}
    >
      <div className="space-y-6">
        <PanelPageHeader
          action={
            <span className="admin-status admin-status-info">
              {canManage ? (
                <ShieldCheck className="size-3" />
              ) : (
                <Beef className="size-3" />
              )}
              {canManage ? "Süper yönetici" : "Atanmış görevler"}
            </span>
          }
          description={
            canManage
              ? "Sezon, sipariş, hisse havuzu, saha videosu ve kişisel WhatsApp bildirimlerini tek operasyon akışında yönetin."
              : "Yalnızca size atanmış kurban görevlerini görüntüleyin ve kesim videosunu güvenli yükleme akışından gönderin."
          }
          eyebrow="Kurban operasyonu"
          title={canManage ? "Kurban yönetim merkezi" : "Kurban görevlerim"}
        />
        <QurbaniManager
          canManage={canManage}
          initialSection={initialSection}
          openQuickStock={params.action === "quick-stock"}
          snapshot={snapshot}
          whatsapp={whatsapp}
        />
      </div>
    </ManagementShell>
  );
}
