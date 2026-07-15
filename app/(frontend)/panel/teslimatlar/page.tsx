import { MailCheck, ReceiptText } from "lucide-react";

import { FulfillmentRetryButton } from "@/components/admin/fulfillment-retry-button";
import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

function donationLabel(value: unknown) {
  if (!value || typeof value !== "object") return "Bağış kaydı";
  const donation = value as { receiptNumber?: unknown };
  return typeof donation.receiptNumber === "string" ? donation.receiptNumber : "Bağış kaydı";
}

export default async function FulfillmentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.fulfillments);
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "donation-fulfillments", depth: 1, limit: 100, sort: "-updatedAt" });

  return (
    <ManagementShell currentPath="/panel/teslimatlar" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description="Makbuz oluşturma, e-posta gönderimi ve bağışçı raporu teslim durumlarını takip edin. Tekrar deneme yalnızca ilgili güvenli servisi çalıştırır." eyebrow="Finans işlemleri" title="Makbuz ve teslim takibi" />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(172_120_15_/_16%)] text-[var(--admin-warning)]"><ReceiptText aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Teslim kayıtları</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Başarısız e-posta veya makbuz işlemleri buradan güvenli biçimde tekrar denenebilir.</p></div></div>
          {result.docs.length ? <div className="divide-y divide-[var(--admin-border)]">{result.docs.map((document) => {
            const fulfillment = document as unknown as Record<string, unknown>;
            const donation = fulfillment.donation;
            const donationId = donation && typeof donation === "object" && "id" in donation ? String((donation as { id: string | number }).id) : "";
            const status = typeof fulfillment.status === "string" ? fulfillment.status : "pending";
            const requiresAction = status !== "completed" || fulfillment.receiptStatus === "failed" || fulfillment.emailStatus === "failed" || fulfillment.reportStatus === "failed";
            return <article className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between" key={String(fulfillment.id)}><div className="min-w-0"><p className="font-mono text-sm font-semibold text-[var(--admin-text)]">{donationLabel(donation)}</p><div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={status} /><span className="admin-status admin-status-neutral">Makbuz: {typeof fulfillment.receiptStatus === "string" ? fulfillment.receiptStatus : "pending"}</span><span className="admin-status admin-status-neutral"><MailCheck aria-hidden="true" className="size-3" />E-posta: {typeof fulfillment.emailStatus === "string" ? fulfillment.emailStatus : "pending"}</span></div><p className="mt-3 text-xs text-[var(--admin-muted)]">Deneme: {typeof fulfillment.attemptCount === "number" ? fulfillment.attemptCount : 0}</p></div>{requiresAction && donationId ? <FulfillmentRetryButton donationId={donationId} /> : null}</article>;
          })}</div> : <div className="p-5"><EmptyPanelState description="Ödeme sonrası oluşturulan makbuz ve gönderim kayıtları burada listelenir." title="Teslim kaydı bulunmuyor" /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
