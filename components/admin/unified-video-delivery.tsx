import { Search, Video } from "lucide-react";

import { EmptyPanelState, PanelCard, StatusBadge } from "@/components/admin/panel-ui";
import { PanelSectionTabs } from "@/components/admin/panel-section-tabs";
import { DeliveryRowActions } from "@/components/admin/delivery-row-actions";
import type { UnifiedDeliveryRow } from "@/lib/admin/unified-panel-data";

type DeliveryTab = "waiting_video" | "draft" | "sending" | "completed" | "failed";

const completedStatuses = new Set(["sent", "delivered", "read", "completed"]);
const sendingStatuses = new Set(["queued", "paused", "sending"]);
const failedStatuses = new Set(["failed", "cancelled", "rejected"]);
const videoWaitingStatuses = new Set(["waiting", "uploading", "uploaded", "processing"]);

function belongsToTab(row: UnifiedDeliveryRow, tab: DeliveryTab) {
  if (tab === "waiting_video") return videoWaitingStatuses.has(row.videoStatus);
  if (tab === "draft") return ["draft", "open", "full", "video_ready"].includes(row.status) && !videoWaitingStatuses.has(row.videoStatus);
  if (tab === "sending") return sendingStatuses.has(row.status);
  if (tab === "completed") return completedStatuses.has(row.status);
  return failedStatuses.has(row.status) || failedStatuses.has(row.videoStatus);
}

export function UnifiedVideoDelivery({
  query,
  rows,
  tab,
}: {
  query: string;
  rows: UnifiedDeliveryRow[];
  tab: DeliveryTab;
}) {
  const counts = {
    waiting_video: rows.filter((row) => belongsToTab(row, "waiting_video")).length,
    draft: rows.filter((row) => belongsToTab(row, "draft")).length,
    sending: rows.filter((row) => belongsToTab(row, "sending")).length,
    completed: rows.filter((row) => belongsToTab(row, "completed")).length,
    failed: rows.filter((row) => belongsToTab(row, "failed")).length,
  };
  const tabs = [
    { id: "waiting_video", label: "Video Bekleyenler", count: counts.waiting_video },
    { id: "draft", label: "Taslak Mesajlar", count: counts.draft },
    { id: "sending", label: "Gönderiliyor", count: counts.sending },
    { id: "completed", label: "Tamamlananlar", count: counts.completed },
    { id: "failed", label: "Hatalılar", count: counts.failed },
  ] as const;
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const visible = rows.filter((row) => belongsToTab(row, tab)).filter((row) => {
    if (!normalizedQuery) return true;
    return [
      row.groupCode,
      row.campaign,
      row.recipient,
      ...row.recipients.map((recipient) => recipient.name),
    ].some((value) => value.toLocaleLowerCase("tr-TR").includes(normalizedQuery));
  });

  return (
    <div className="space-y-5">
      <PanelSectionTabs activeTab={tab} basePath="/panel/video-teslimat" tabs={tabs} />
      <form className="relative w-full max-w-md" method="get">
        <input name="tab" type="hidden" value={tab} />
        <Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-[var(--admin-muted)]" />
        <input aria-label="Video teslimat kayıtlarında ara" className="admin-input pl-10" defaultValue={query} name="q" placeholder="Grup kodu, kampanya veya alıcı ara" />
      </form>

      {visible.length ? (
        <PanelCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-raised)] text-[11px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                <tr><th className="px-5 py-3">Operasyon grubu</th><th className="px-5 py-3">Kampanya</th><th className="px-5 py-3">Alıcı</th><th className="px-5 py-3">Video</th><th className="px-5 py-3">Mesaj</th><th className="px-5 py-3">Son hareket</th><th className="px-5 py-3">İşlem</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {visible.map((row) => (
                  <tr className="hover:bg-[var(--admin-surface-raised)]" key={row.id}>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-2 font-mono text-xs font-semibold"><Video aria-hidden="true" className="size-4 text-[var(--admin-primary)]" />{row.groupCode}</span></td>
                    <td className="px-5 py-4 font-semibold">{row.campaign}</td>
                    <td className="px-5 py-4 text-xs text-[var(--admin-muted)]">
                      {row.recipients.length ? (
                        <details className="group min-w-64">
                          <summary className="cursor-pointer select-none font-semibold text-[var(--admin-primary)] hover:underline">
                            {row.recipient} · Listeyi göster
                          </summary>
                          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-3 shadow-sm">
                            {row.recipients.map((recipient) => (
                              <div
                                className="flex items-center justify-between gap-4 rounded-lg bg-[var(--admin-surface)] px-3 py-2"
                                key={recipient.id}
                              >
                                <div>
                                  <p className="font-semibold text-[var(--admin-text)]">
                                    {recipient.unitIndex}. hisse · {recipient.name}
                                  </p>
                                  <p className="mt-0.5 font-mono text-[11px]">
                                    {recipient.maskedPhone}
                                  </p>
                                </div>
                                <StatusBadge status={recipient.status} />
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : (
                        row.recipient
                      )}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={row.videoStatus} /></td>
                    <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                    <td className="px-5 py-4 text-xs text-[var(--admin-muted)]">{row.updatedAt ? new Date(row.updatedAt).toLocaleString("tr-TR") : "Kayıt yok"}</td>
                    <td className="px-5 py-4"><DeliveryRowActions groupId={row.groupId} messageBody={row.messageBody} messageId={row.messageId} status={row.status} videoStatus={row.videoStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>
      ) : (
        <EmptyPanelState
          title={query ? "Aramayla eşleşen kayıt yok" : `${tabs.find((item) => item.id === tab)?.label} boş`}
          description={query ? "Arama metnini değiştirin veya temizleyin." : "Bu aşamaya gelen operasyon grupları otomatik olarak burada listelenecek."}
        />
      )}
    </div>
  );
}
