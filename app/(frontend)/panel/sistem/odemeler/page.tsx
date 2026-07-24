import { Activity, ShieldCheck } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

export default async function TechnicalPaymentEventsPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.systemPayments);
  const payload = await getPayloadClient();
  const result = await payload
    .find({
      collection: "payment-events",
      limit: 100,
      sort: "-createdAt",
      pagination: false,
    })
    .catch((error: unknown) => {
      console.warn("payment-events teknk listesi okunamadi, bos liste kullaniliyor.", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { docs: [] as unknown[] };
    });

  return (
    <ManagementShell currentPath="/panel/sistem/odemeler" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader action={<span className="admin-status admin-status-info">Yalnızca süper yönetici</span>} description="Sağlayıcı olaylarının imza doğrulama ve işleme durumunu güvenli özet olarak inceleyin." eyebrow="Sistem yönetimi" title="Teknik ödeme kayıtları" />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(117_184_255_/_12%)] text-[var(--admin-info)]"><Activity aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Provider olayları</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Ham başlıklar ve sağlayıcı yanıtları burada gösterilmez.</p></div></div>
          {result.docs.length ? <div className="divide-y divide-[var(--admin-border)]">{result.docs.map((document) => {
            const record = document as unknown as Record<string, unknown>;
            const createdAt = typeof record.createdAt === "string" ? new Date(record.createdAt).toLocaleString("tr-TR") : "-";
            const verified = record.signatureVerified === true;
            return <article className="flex flex-col gap-3 p-4 transition-colors hover:bg-[var(--admin-surface-raised)] sm:flex-row sm:items-center sm:justify-between sm:p-5" key={String(record.id)}><div className="min-w-0"><p className="text-sm font-semibold text-[var(--admin-text)]">{typeof record.eventType === "string" ? record.eventType : "Provider olayı"}</p><p className="mt-1 truncate font-mono text-[11px] text-[var(--admin-muted)]">{typeof record.referenceId === "string" ? record.referenceId : "Referans yok"}</p><p className="mt-2 text-xs text-[var(--admin-muted)]">{createdAt}</p></div><div className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className={verified ? "size-4 text-[var(--admin-primary)]" : "size-4 text-[var(--admin-danger)]"} /><StatusBadge status={verified ? "success" : "failed"} /></div></article>;
          })}</div> : <div className="p-5"><EmptyPanelState description="Callback veya webhook işlendiğinde olay özeti burada görünür." title="Teknik ödeme kaydı yok" /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
