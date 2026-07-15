import { ClipboardCheck, ExternalLink } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { SubmissionReviewActions } from "@/components/admin/submission-review-actions";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

function relatedTitle(value: unknown) {
  if (!value || typeof value !== "object") return "Bağlı görev";
  const record = value as { title?: unknown };
  return typeof record.title === "string" ? record.title : "Bağlı görev";
}

export default async function FieldSubmissionsPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.fieldSubmissions);
  const payload = await getPayloadClient();
  const isFieldOperator = user.role === "field_operator";
  const canReview = user.role === "super_admin" || user.role === "approver";
  const tasks = isFieldOperator
    ? await payload.find({ collection: "field-tasks", limit: 100, where: { assignedTo: { equals: user.id } } })
    : null;
  const taskIds = tasks?.docs.map((task) => task.id) || [];
  const result = isFieldOperator && taskIds.length === 0
    ? { docs: [] }
    : await payload.find({
      collection: "proof-submissions",
      depth: 1,
      limit: 100,
      sort: "-updatedAt",
      where: isFieldOperator ? { fieldTask: { in: taskIds } } : undefined,
    });

  return (
    <ManagementShell currentPath="/panel/saha/teslimler" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description={isFieldOperator ? "Yalnızca size atanmış görevler için hazırlanan teslimler görünür." : "Saha teslimlerinin dış onay bilgilerini ve inceleme durumlarını takip edin."} eyebrow="Saha operasyonu" title={isFieldOperator ? "Teslimlerim" : "Saha teslimleri"} />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(117_184_255_/_12%)] text-[var(--admin-info)]"><ClipboardCheck aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Teslim inceleme kuyruğu</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Kanıt dosyaları private storage içinde tutulur; burada yalnızca işlem özeti gösterilir.</p></div></div>
          {result.docs.length ? <div className="divide-y divide-[var(--admin-border)]">{result.docs.map((document) => {
            const submission = document as unknown as Record<string, unknown>;
            const updatedAt = typeof submission.updatedAt === "string" ? new Date(submission.updatedAt).toLocaleDateString("tr-TR") : "-";
            const externalCode = typeof submission.externalApprovalCode === "string" ? submission.externalApprovalCode : "Dış onay kodu yok";
            const reference = typeof submission.externalReferenceId === "string" ? submission.externalReferenceId : "Referans yok";

            const status = typeof submission.status === "string" ? submission.status : "pending";
            return <article className="p-4 transition-colors hover:bg-[var(--admin-surface-raised)] sm:p-5" key={String(submission.id)}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold text-[var(--admin-text)]">{typeof submission.title === "string" ? submission.title : "Başlıksız teslim"}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Görev: {relatedTitle(submission.fieldTask)} · Güncelleme: {updatedAt}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-[var(--admin-muted)]"><span className="inline-flex items-center gap-1"><ExternalLink aria-hidden="true" className="size-3" />{externalCode}</span><span>{reference}</span></div></div><StatusBadge status={status} /></div>{canReview ? <SubmissionReviewActions status={status} submissionId={String(submission.id)} /> : null}</article>;
          })}</div> : <div className="p-5"><EmptyPanelState description={isFieldOperator ? "Kanıt yükleyip teslim oluşturduğunuzda bu listede görünür." : "İncelenecek saha teslimi bulunmuyor."} title="Teslim kuyruğu boş" /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
