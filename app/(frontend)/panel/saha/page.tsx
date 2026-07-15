import { CalendarClock, Camera, MapPin } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { FieldSubmissionFlow } from "@/components/admin/field-submission-flow";
import { FieldTaskForm } from "@/components/admin/field-task-form";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getManagementSnapshot, requireAdminUser } from "@/lib/admin/data";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

export default async function FieldAdminPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.fieldTasks);
  const snapshot = await getManagementSnapshot(user);
  const isFieldOperator = user.role === "field_operator";
  const canManageTasks = user.role === "super_admin" || user.role === "approver";
  const payload = await getPayloadClient();
  const [campaigns, operators] = canManageTasks ? await Promise.all([
    payload.find({ collection: "campaigns", limit: 100, sort: "title" }),
    payload.find({ collection: "users", limit: 100, sort: "name", where: { role: { equals: "field_operator" } } }),
  ]) : [null, null];
  const campaignOptions = campaigns?.docs.map((campaign) => ({ label: typeof campaign.title === "string" ? campaign.title : campaign.title?.tr || "Başlıksız bağış alanı", value: String(campaign.id) })) || [];
  const operatorOptions = operators?.docs.map((operator) => ({ label: operator.name || operator.email, value: String(operator.id) })) || [];

  return (
    <ManagementShell currentPath="/panel/saha" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description={isFieldOperator ? "Yalnızca size atanan görevler listelenir. Teslim için fotoğraf, video ve belge kanıtlarını görev üzerinden ekleyin." : "Saha teslimlerini, görev durumlarını ve kanıt akışını izleyin."} eyebrow="Saha operasyonu" title={isFieldOperator ? "Görevlerim" : "Saha görevleri"} />
        {canManageTasks ? <FieldTaskForm campaigns={campaignOptions} operators={operatorOptions} /> : null}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.fieldTasks.length ? snapshot.fieldTasks.map((task) => <article className="admin-card flex flex-col" key={task.id}><div className="flex items-start justify-between gap-3"><div><p className="admin-eyebrow">Saha görevi</p><h3 className="mt-2 text-base font-semibold text-[var(--admin-text)]">{task.title}</h3></div><StatusBadge status={task.status} /></div><div className="mt-5 space-y-3 text-sm text-[var(--admin-muted)]"><p className="flex items-center gap-2"><MapPin aria-hidden="true" className="size-4 text-[var(--admin-primary)]" /> {task.location}</p><p className="flex items-center gap-2"><CalendarClock aria-hidden="true" className="size-4 text-[var(--admin-primary)]" /> {task.dueAt ? new Date(task.dueAt).toLocaleDateString("tr-TR") : "Teslim tarihi belirtilmedi"}</p></div>{(isFieldOperator || user.role === "super_admin") ? <FieldSubmissionFlow taskId={String(task.id)} taskStatus={task.status} taskTitle={task.title} /> : <div className="mt-5 border-t border-[var(--admin-border)] pt-4"><p className="text-xs leading-5 text-[var(--admin-muted)]">Kanıt yüklemesi için fotoğraf, video veya belge ekleyin; dış servis referansını teslim sırasında kaydedin.</p></div>}{canManageTasks ? <div className="mt-4"><FieldTaskForm campaigns={campaignOptions} operators={operatorOptions} record={{ assignedTo: typeof task.assignedTo === "object" && task.assignedTo ? String(task.assignedTo.id) : String(task.assignedTo || ""), campaign: typeof task.campaign === "object" && task.campaign ? String(task.campaign.id) : String(task.campaign || ""), dueAt: task.dueAt ? task.dueAt.slice(0, 16) : "", id: String(task.id), location: task.location, notes: task.notes || "", title: task.title }} /></div> : null}</article>) : <EmptyPanelState description="Yeni atamalar geldiğinde görevler bu alanda görüntülenecek." title="Atanmış görev yok" />}
          </div>
          <PanelCard className="h-fit"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]"><Camera aria-hidden="true" className="size-5" /></span><div><p className="admin-eyebrow">Teslim rehberi</p><h3 className="mt-1 text-sm font-semibold text-[var(--admin-text)]">Kanıt standartları</h3></div></div><ol className="mt-5 space-y-4 text-sm leading-6 text-[var(--admin-muted)]"><li><span className="mr-2 font-mono text-[var(--admin-primary)]">01</span>Görevle uyumlu fotoğraf, video veya belgeyi ekleyin.</li><li><span className="mr-2 font-mono text-[var(--admin-primary)]">02</span>Dış onay veya referans kodunu teslim kaydına işleyin.</li><li><span className="mr-2 font-mono text-[var(--admin-primary)]">03</span>Onay notu gelirse teslimi düzeltip yeniden gönderin.</li></ol></PanelCard>
        </div>
      </div>
    </ManagementShell>
  );
}
