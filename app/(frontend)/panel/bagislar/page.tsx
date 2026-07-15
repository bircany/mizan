import { HandCoins } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getManagementSnapshot, requireAdminUser } from "@/lib/admin/data";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DonationsAdminPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.donations);
  const snapshot = await getManagementSnapshot(user);

  return (
    <ManagementShell currentPath="/panel/bagislar" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description="Ödeme sağlayıcısı tarafından doğrulanan bağış kayıtlarını ve makbuz durumlarını takip edin." eyebrow="Bağış yönetimi" title="Bağış takibi" />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5">
            <span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]"><HandCoins aria-hidden="true" className="size-5" /></span>
            <div><p className="text-sm font-semibold text-[var(--admin-text)]">Son bağış kayıtları</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Net tutar, ödeme ledger’ından üretilir.</p></div>
          </div>
          {snapshot.donations.length ? <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-raised)] text-[11px] uppercase tracking-[0.12em] text-[var(--admin-muted)]"><tr><th className="px-5 py-3 font-semibold">Bağışçı</th><th className="px-5 py-3 font-semibold">Makbuz</th><th className="px-5 py-3 font-semibold">Durum</th><th className="px-5 py-3 text-right font-semibold">Net tutar</th></tr></thead>
                <tbody className="divide-y divide-[var(--admin-border)]">
                  {snapshot.donations.map((donation) => <tr className="transition-colors hover:bg-[var(--admin-surface-raised)]" key={donation.id}><td className="px-5 py-4"><p className="font-medium text-[var(--admin-text)]">{donation.donorName}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{donation.email}</p></td><td className="px-5 py-4 font-mono text-xs text-[var(--admin-muted)]">{donation.receiptNumber || "Hazırlanıyor"}</td><td className="px-5 py-4"><StatusBadge status={donation.status} /></td><td className="px-5 py-4 text-right font-mono font-semibold text-[var(--admin-text)]">{formatCurrency(donation.netConfirmedAmount, donation.currency)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[var(--admin-border)] md:hidden">
              {snapshot.donations.map((donation) => <article className="p-4" key={donation.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--admin-text)]">{donation.donorName}</p><p className="mt-1 truncate text-xs text-[var(--admin-muted)]">{donation.email}</p></div><StatusBadge status={donation.status} /></div><div className="mt-4 flex items-end justify-between gap-3"><p className="font-mono text-[11px] text-[var(--admin-muted)]">{donation.receiptNumber || "Makbuz hazırlanıyor"}</p><p className="font-mono text-sm font-semibold text-[var(--admin-text)]">{formatCurrency(donation.netConfirmedAmount, donation.currency)}</p></div></article>)}
            </div>
          </> : <div className="p-5"><EmptyPanelState description="İyzico doğrulaması sonrası bağış kayıtları burada görünür." title="Gösterilecek bağış yok" /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
