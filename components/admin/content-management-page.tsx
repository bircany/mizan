import { FilePenLine, Globe2, Landmark, WalletCards } from "lucide-react";

import { CampaignPurgeAllForm } from "@/components/admin/campaign-purge-all-form";
import { CampaignCleanupForm } from "@/components/admin/campaign-cleanup-form";
import { CampaignVisibilityForm } from "@/components/admin/campaign-visibility-form";
import { ContentDeleteForm } from "@/components/admin/content-delete-form";
import { ContentRecordForm } from "@/components/admin/content-record-form";
import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader } from "@/components/admin/panel-ui";
import type { ContentDefinition, ContentRecord } from "@/lib/admin/content";
import type { AdminUser } from "@/lib/admin/data";

export function ContentManagementPage({
  currentPath,
  definition,
  records,
  user,
}: {
  currentPath: string;
  definition: ContentDefinition;
  records: ContentRecord[];
  user: AdminUser;
}) {
  const isCampaigns = definition.collection === "campaigns";

  return (
    <ManagementShell currentPath={currentPath} name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader action={<ContentRecordForm definition={definition} />} description={definition.description} eyebrow="İçerik yönetimi" title={definition.title} />
        {!isCampaigns ? <ContentRecordForm definition={definition} /> : null}
        {isCampaigns && records.length ? (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {records.map((record) => <CampaignPreviewCard definition={definition} key={record.id} record={record} />)}
          </section>
        ) : null}
        {!isCampaigns ? <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5">
            <span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]">
              <FilePenLine aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--admin-text)]">Mevcut kayıtlar</p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">Başlık, yayın bilgisi ve temel alanları bu panelden düzenleyin.</p>
            </div>
          </div>
          {records.length ? (
            <div className="divide-y divide-[var(--admin-border)]">
              {records.map((record) => {
                const isDonationOpen = Boolean(record.values.isDonationOpen);

                return (
                  <article className="p-4 sm:p-5" key={record.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{record.title}</p>
                        <p className="mt-1 text-xs text-[var(--admin-muted)]">{record.meta}</p>
                      </div>
                      <div className="space-y-2">
                        {isCampaigns ? <CampaignVisibilityForm id={record.id} isDonationOpen={isDonationOpen} /> : null}
                        {isCampaigns ? <CampaignCleanupForm id={record.id} /> : null}
                        <ContentDeleteForm collection={definition.collection} id={record.id} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <ContentRecordForm definition={definition} record={record} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-5">
              <EmptyPanelState description={definition.emptyDescription} title={definition.emptyTitle} />
            </div>
          )}
        </PanelCard> : null}
      </div>
    </ManagementShell>
  );
}

function CampaignPreviewCard({ definition, record }: { definition: ContentDefinition; record: ContentRecord }) {
  const values = record.values;
  const coverUrl = typeof values.coverImageUrl === "string" ? values.coverImageUrl : "";
  const pools = Array.isArray(values.fundingPools) ? values.fundingPools as Array<{ currency?: string; targetAmount?: number; isDonationOpen?: boolean; translations?: Record<string, { title?: string; description?: string }> }> : [];
  const previewPool = pools[0];
  const translations = [
    { code: "TR", title: previewPool?.translations?.tr?.title || "Türkçe içerik bekliyor", description: previewPool?.translations?.tr?.description || "" },
    { code: "EN", title: previewPool?.translations?.en?.title || "İngilizce içerik bekliyor", description: previewPool?.translations?.en?.description || "" },
    { code: "AR", title: previewPool?.translations?.ar?.title || "المحتوى العربي قيد الانتظار", description: previewPool?.translations?.ar?.description || "" },
  ];

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-4 shadow-[0_10px_28px_rgba(23,52,35,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(23,52,35,0.14)]">
      {coverUrl ? <img alt="Bağış alanı kapak görseli" className="h-44 w-full rounded-xl object-cover" src={coverUrl} /> : <div className="grid h-44 w-full place-items-center rounded-xl bg-[linear-gradient(135deg,rgba(14,90,58,.18),rgba(181,126,28,.24))] text-sm font-medium text-[var(--admin-muted)]">Kapak görseli yok</div>}
      <div className="mt-4">
        <p className="text-xs font-medium text-[var(--admin-muted)]">{record.meta}</p>
        <h3 className="mt-1 truncate text-lg font-semibold text-[var(--admin-text)]">{record.title}</h3>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {translations.map((translation) => (
            <div className="min-w-0 rounded-lg bg-[var(--admin-surface)] p-2.5" key={translation.code} dir={translation.code === "AR" ? "rtl" : "ltr"}>
              <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--admin-primary-strong)]">{translation.code}</p>
              <p className="mt-1 truncate text-xs font-semibold text-[var(--admin-text)]">{translation.title}</p>
              {translation.description ? <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--admin-muted)]">{translation.description}</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs">
          <div className="inline-flex items-center gap-2 text-[var(--admin-muted)]"><WalletCards className="size-4 text-[var(--admin-primary-strong)]" /><span><b className="text-[var(--admin-text)]">{pools.length}</b> finansal havuz</span></div>
          <div className="inline-flex items-center gap-2 text-[var(--admin-muted)]"><Globe2 className="size-4 text-[var(--admin-primary-strong)]" /><span><b className="text-[var(--admin-text)]">{translations.filter((item) => !item.title.includes("bekliyor") && !item.title.includes("pending") && !item.title.includes("قيد")).length}</b> dil tamamlandı</span></div>
          <div className="inline-flex items-center gap-2 text-[var(--admin-muted)]"><Landmark className="size-4 text-[var(--admin-primary-strong)]" /><span>{previewPool?.currency || "-"}</span></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4">
          <ContentRecordForm definition={definition} record={record} />
          <CampaignVisibilityForm id={record.id} isDonationOpen={Boolean(values.isDonationOpen)} />
          <CampaignCleanupForm id={record.id} />
          <ContentDeleteForm collection="campaigns" id={record.id} />
        </div>
      </div>
    </article>
  );
}
