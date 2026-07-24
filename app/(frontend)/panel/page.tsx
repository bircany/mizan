import { ArrowUpRight, FileCheck2, ShieldAlert, WalletCards } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { DashboardAnalyticsPanel } from "@/components/admin/dashboard-analytics";
import { DashboardQuickAccess, QuickAccessSettings } from "@/components/admin/panel-quick-access";
import { EmptyPanelState, PanelCard, PanelMetric, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getManagementSnapshot, requireAdminUser } from "@/lib/admin/data";
import { getDashboardAnalytics, parseDashboardRange } from "@/lib/admin/dashboard-analytics";
import { getSharedPanelQuickLinkKeys, getVisiblePanelQuickLinks } from "@/lib/admin/panel-settings";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OperationsDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.dashboard);
  const range = parseDashboardRange((await searchParams).range);
  const [snapshot, analytics, quickLinks, selectedQuickLinks] = await Promise.all([
    getManagementSnapshot(user),
    getDashboardAnalytics(user.role, range),
    getVisiblePanelQuickLinks(user.role),
    getSharedPanelQuickLinkKeys(),
  ]);

  return (
    <ManagementShell currentPath="/panel" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader
          action={<QuickAccessSettings role={user.role} selectedKeys={selectedQuickLinks} />}
          description="Tahsilat, saha ve onay süreçlerindeki öncelikli kayıtları tek ekranda takip edin."
          eyebrow="Genel görünüm"
          title="Operasyon özeti"
        />

        <DashboardQuickAccess items={quickLinks} />

        <div>
          <p className="admin-eyebrow mb-3">İş bekleyenler</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PanelMetric detail="Onaylanmış net bağışlar" label="Onaylı tahsilat" value={formatCurrency(snapshot.metrics.paidTotal)} />
          <PanelMetric detail="Finans kontrolü bekleyen işlem" label="İnceleme kuyruğu" tone="warning" value={String(snapshot.metrics.pendingReview)} />
          <PanelMetric detail="Atama veya teslim bekleyen görev" label="Saha kuyruğu" tone="warning" value={String(snapshot.metrics.fieldQueue)} />
          <PanelMetric detail="Bağışçıya gönderim öncesi kontrol" label="Taslak rapor" value={String(snapshot.metrics.reportsToApprove)} />
          </div>
        </div>

        <DashboardAnalyticsPanel analytics={analytics} range={range} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
          <PanelCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="admin-eyebrow">Son hareketler</p>
                <h3 className="mt-1 text-base font-semibold text-[var(--admin-text)]">Yeni bağışlar</h3>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--admin-primary)]">Bağışlar <ArrowUpRight aria-hidden="true" className="size-3" /></span>
            </div>
            <div className="mt-4 divide-y divide-[var(--admin-border)]">
              {snapshot.donations.length ? snapshot.donations.map((donation) => (
                <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center" key={donation.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{donation.donorName}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--admin-muted)]">{donation.receiptNumber || "Makbuz hazırlanıyor"}</p>
                  </div>
                  <StatusBadge status={donation.status} />
                  <p className="font-mono text-sm font-semibold text-[var(--admin-text)] sm:text-right">
                    {formatCurrency(donation.netConfirmedAmount, donation.currency)}
                  </p>
                </div>
              )) : <EmptyPanelState description="Ödeme doğrulandığında yeni bağışlar burada görünür." title="Henüz bağış kaydı yok" />}
            </div>
          </PanelCard>

          <div className="grid gap-5">
            <PanelCard>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]"><WalletCards aria-hidden="true" className="size-5" /></span>
                <div><p className="admin-eyebrow">Ödeme güvenliği</p><h3 className="mt-1 text-sm font-semibold text-[var(--admin-text)]">Provider olayları</h3></div>
              </div>
              <div className="mt-4 space-y-3">
                {snapshot.paymentEvents.length ? snapshot.paymentEvents.slice(0, 3).map((event) => (
                  <div className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-3" key={event.id}>
                    <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-[var(--admin-text)]">{event.eventType}</p><StatusBadge status={event.signatureVerified ? "success" : "pending"} /></div>
                    <p className="mt-2 truncate font-mono text-[11px] text-[var(--admin-muted)]">{event.referenceId}</p>
                  </div>
                )) : <EmptyPanelState description="İyzico olayları doğrulandığında burada listelenir." title="Olay bulunmuyor" />}
              </div>
            </PanelCard>

            <PanelCard>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-md bg-[rgb(245_185_66_/_12%)] text-[var(--admin-warning)]"><ShieldAlert aria-hidden="true" className="size-5" /></span>
                <div><p className="admin-eyebrow">Dikkat gerektirenler</p><h3 className="mt-1 text-sm font-semibold text-[var(--admin-text)]">İşlem özeti</h3></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-[var(--admin-surface-raised)] p-3"><p className="text-xs text-[var(--admin-muted)]">İade kuyruğu</p><p className="mt-2 font-mono text-xl font-semibold text-[var(--admin-text)]">{snapshot.metrics.refundQueue}</p></div>
                <div className="rounded-md bg-[var(--admin-surface-raised)] p-3"><p className="text-xs text-[var(--admin-muted)]">Saha görevi</p><p className="mt-2 font-mono text-xl font-semibold text-[var(--admin-text)]">{snapshot.metrics.fieldQueue}</p></div>
              </div>
            </PanelCard>
          </div>
        </div>

        <PanelCard>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-[rgb(117_184_255_/_12%)] text-[var(--admin-info)]"><FileCheck2 aria-hidden="true" className="size-5" /></span>
            <div><p className="admin-eyebrow">Saha operasyonu</p><h3 className="mt-1 text-base font-semibold text-[var(--admin-text)]">Güncel görevler</h3></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {snapshot.fieldTasks.length ? snapshot.fieldTasks.slice(0, 3).map((task) => (
              <article className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-4" key={task.id}>
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-[var(--admin-text)]">{task.title}</p><StatusBadge status={task.status} /></div>
                <p className="mt-3 text-xs text-[var(--admin-muted)]">{task.location || "Konum belirtilmedi"}</p>
              </article>
            )) : <EmptyPanelState description="Atanmış saha görevleri burada yer alacak." title="Açık saha görevi yok" />}
          </div>
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
