import { FilePenLine, Trash2 } from "lucide-react";

import { ContentRecordForm } from "@/components/admin/content-record-form";
import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader } from "@/components/admin/panel-ui";
import { deleteContentRecord } from "@/lib/admin/content-actions";
import type { ContentDefinition, ContentRecord } from "@/lib/admin/content";
import type { AdminUser } from "@/lib/admin/data";

export function ContentManagementPage({ currentPath, definition, records, user }: { currentPath: string; definition: ContentDefinition; records: ContentRecord[]; user: AdminUser }) {
  return (
    <ManagementShell currentPath={currentPath} name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader action={<span className="admin-status admin-status-info">Yalnızca süper yönetici</span>} description={definition.description} eyebrow="İçerik yönetimi" title={definition.title} />
        <ContentRecordForm definition={definition} />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5">
            <span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]"><FilePenLine aria-hidden="true" className="size-5" /></span>
            <div><p className="text-sm font-semibold text-[var(--admin-text)]">Mevcut kayıtlar</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Başlık, yayın bilgisi ve temel alanları bu panelden düzenleyin.</p></div>
          </div>
          {records.length ? <div className="divide-y divide-[var(--admin-border)]">{records.map((record) => (
            <article className="p-4 sm:p-5" key={record.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--admin-text)]">{record.title}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{record.meta}</p></div>
                <form action={deleteContentRecord}><input name="collection" type="hidden" value={definition.collection} /><input name="id" type="hidden" value={record.id} /><button className="inline-flex min-h-9 items-center gap-2 self-start rounded-md border border-[var(--admin-danger)]/40 px-3 text-xs font-semibold text-[var(--admin-danger)] transition-colors hover:bg-[rgb(255_122_115_/_12%)]" type="submit"><Trash2 aria-hidden="true" className="size-3.5" />Sil</button></form>
              </div>
              <div className="mt-4"><ContentRecordForm definition={definition} record={record} /></div>
            </article>
          ))}</div> : <div className="p-5"><EmptyPanelState description={definition.emptyDescription} title={definition.emptyTitle} /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
