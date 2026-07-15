import { Activity, ShieldCheck, WalletCards } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getManagementSnapshot, requireAdminUser } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function PaymentsAdminPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.payments);
  const snapshot = await getManagementSnapshot(user);

  return (
    <ManagementShell currentPath="/panel/odemeler" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description="Callback, webhook ve sağlayıcı kayıtlarını inceleyin. Ödeme durumu yalnızca doğrulanmış provider verisiyle oluşur." eyebrow="Finans izleme" title="Ödeme güvenliği" />
        <div className="grid gap-5 xl:grid-cols-2">
          <PanelCard className="p-0">
            <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(117_184_255_/_12%)] text-[var(--admin-info)]"><WalletCards aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Ödeme oturumları</p><p className="mt-1 text-xs text-[var(--admin-muted)]">İyzico Checkout Form oturumları</p></div></div>
            <div className="divide-y divide-[var(--admin-border)]">
              {snapshot.sessions.length ? snapshot.sessions.map((session) => <article className="p-4 transition-colors hover:bg-[var(--admin-surface-raised)]" key={session.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-mono text-xs font-semibold text-[var(--admin-text)]">{session.conversationId}</p><p className="mt-2 text-xs text-[var(--admin-muted)]">Payment ID: <span className="font-mono">{session.paymentId || "Henüz yok"}</span></p></div><StatusBadge status={session.providerStatus} /></div><div className="mt-3 flex items-center gap-2 text-xs text-[var(--admin-muted)]"><ShieldCheck aria-hidden="true" className="size-3.5 text-[var(--admin-primary)]" /> Fraud durumu: <span className="font-mono text-[var(--admin-text)]">{session.fraudStatus ?? "Bekleniyor"}</span></div></article>) : <div className="p-5"><EmptyPanelState description="Yeni ödeme başlatıldığında oturum kaydı burada görünür." title="Oturum bulunmuyor" /></div>}
            </div>
          </PanelCard>
          <PanelCard className="p-0">
            <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]"><Activity aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Provider olayları</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Ham event log ve imza doğrulama durumu</p></div></div>
            <div className="divide-y divide-[var(--admin-border)]">
              {snapshot.paymentEvents.length ? snapshot.paymentEvents.map((event) => <article className="p-4 transition-colors hover:bg-[var(--admin-surface-raised)]" key={event.id}><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-[var(--admin-text)]">{event.eventType}</p><StatusBadge status={event.signatureVerified ? "success" : "pending"} /></div><p className="mt-3 truncate font-mono text-[11px] text-[var(--admin-muted)]">{event.referenceId}</p></article>) : <div className="p-5"><EmptyPanelState description="Callback veya webhook geldiğinde olaylar listelenir." title="Provider olayı yok" /></div>}
            </div>
          </PanelCard>
        </div>
      </div>
    </ManagementShell>
  );
}
