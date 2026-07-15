import { ScrollText } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader } from "@/components/admin/panel-ui";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.auditLogs);
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "audit-logs", limit: 100, sort: "-createdAt" });

  return (
    <ManagementShell currentPath="/panel/denetim" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader action={<span className="admin-status admin-status-info">Yalnızca süper yönetici</span>} description="Kritik finans, saha ve onay hareketlerinin değiştirilemeyen denetim kaydını inceleyin." eyebrow="Sistem yönetimi" title="Denetim kayıtları" />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(245_185_66_/_12%)] text-[var(--admin-warning)]"><ScrollText aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Son hareketler</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Kayıtlar yalnızca güvenilir sunucu işlemleri tarafından eklenir.</p></div></div>
          {result.docs.length ? <div className="divide-y divide-[var(--admin-border)]">{result.docs.map((document) => {
            const record = document as unknown as Record<string, unknown>;
            const createdAt = typeof record.createdAt === "string" ? new Date(record.createdAt).toLocaleString("tr-TR") : "-";
            return <article className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:p-5" key={String(record.id)}><div className="min-w-0"><p className="truncate font-mono text-xs font-semibold text-[var(--admin-text)]">{typeof record.action === "string" ? record.action : "Bilinmeyen işlem"}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{typeof record.actorEmail === "string" ? record.actorEmail : "Sistem"} · {typeof record.targetCollection === "string" ? record.targetCollection : "Genel"}</p></div><p className="font-mono text-[11px] text-[var(--admin-muted)]">{createdAt}</p></article>;
          })}</div> : <div className="p-5"><EmptyPanelState description="Kritik bir işlem gerçekleştiğinde denetim kaydı burada oluşur." title="Denetim kaydı bulunmuyor" /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
