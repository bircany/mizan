import { CircleDollarSign } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getManagementSnapshot, requireAdminUser } from "@/lib/admin/data";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const typeLabels: Record<string, string> = { cancel: "İptal", refund_full: "Tam iade", refund_partial: "Kısmi iade" };

export default async function RefundsAdminPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.refunds);
  const snapshot = await getManagementSnapshot(user);

  return (
    <ManagementShell currentPath="/panel/iadeler" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description="İptal ve iade isteklerini provider sonucu ile takip edin. Finansal kayıtlar yalnızca başarılı sağlayıcı yanıtıyla güncellenir." eyebrow="Finans işlemleri" title="İade ve iptal" />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(255_122_115_/_12%)] text-[var(--admin-danger)]"><CircleDollarSign aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">İşlem geçmişi</p><p className="mt-1 text-xs text-[var(--admin-muted)]">İşlem gerekçesi ve sağlayıcı durumu zorunlu denetim kaydıdır.</p></div></div>
          {snapshot.refunds.length ? <div className="divide-y divide-[var(--admin-border)]">{snapshot.refunds.map((refund) => <article className="grid gap-3 p-4 transition-colors hover:bg-[var(--admin-surface-raised)] md:grid-cols-[12rem_minmax(0,1fr)_auto] md:items-center" key={refund.id}><div className="flex items-center gap-3"><StatusBadge status={refund.status} /><p className="text-sm font-semibold text-[var(--admin-text)]">{typeLabels[refund.type] || refund.type}</p></div><div><p className="text-sm text-[var(--admin-text)]">{refund.reason}</p><p className="mt-1 font-mono text-[11px] text-[var(--admin-muted)]">{refund.providerReference || "Provider referansı bekleniyor"}</p></div><p className="font-mono text-sm font-semibold text-[var(--admin-text)] md:text-right">{refund.amount ? formatCurrency(refund.amount) : "Tutar belirtilmedi"}</p></article>)}</div> : <div className="p-5"><EmptyPanelState description="Yeni bir iade veya iptal talebi oluştuğunda burada görüntülenir." title="İşlem geçmişi boş" /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
