import { ClipboardCheck, Send } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getManagementSnapshot, requireAdminUser } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function ReportsAdminPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.reports);
  const snapshot = await getManagementSnapshot(user);

  return (
    <ManagementShell currentPath="/panel/raporlar" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description="Onaylanmış saha kanıtlarından hazırlanan bağışçı raporlarını inceleyin ve gönderime hazır kayıtları takip edin." eyebrow="Onay merkezi" title="Rapor ve onay kuyruğu" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <PanelCard className="p-0">
            <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]"><ClipboardCheck aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Bağışçı raporları</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Kanıt, onay ve gönderim durumlarını yönetin.</p></div></div>
            <div className="divide-y divide-[var(--admin-border)]">{snapshot.reports.length ? snapshot.reports.map((report) => <article className="p-4 transition-colors hover:bg-[var(--admin-surface-raised)]" key={report.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--admin-text)]">{report.title}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{report.sentAt ? `Gönderim: ${new Date(report.sentAt).toLocaleDateString("tr-TR")}` : "Henüz bağışçıya gönderilmedi"}</p></div><StatusBadge status={report.status} /></div></article>) : <div className="p-5"><EmptyPanelState description="Saha teslimleri onaylandığında rapor taslakları burada oluşur." title="Rapor kuyruğu boş" /></div>}</div>
          </PanelCard>
          <PanelCard>
            <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-[rgb(117_184_255_/_12%)] text-[var(--admin-info)]"><Send aria-hidden="true" className="size-5" /></span><div><p className="admin-eyebrow">Saha ile bağlantı</p><h3 className="mt-1 text-base font-semibold text-[var(--admin-text)]">Görev kuyruğu</h3></div></div>
            <div className="mt-4 space-y-3">{snapshot.fieldTasks.length ? snapshot.fieldTasks.map((task) => <article className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-3" key={task.id}><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-[var(--admin-text)]">{task.title}</p><StatusBadge status={task.status} /></div><p className="mt-2 text-xs text-[var(--admin-muted)]">{task.location}</p></article>) : <EmptyPanelState description="Onaylanacak saha görevi bulunmuyor." title="Saha kuyruğu boş" />}</div>
          </PanelCard>
        </div>
      </div>
    </ManagementShell>
  );
}
