"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { StatusBadge } from "@/components/admin/panel-ui";

type Detail = {
  group: {
    id: string;
    code: string;
    campaign: string;
    status: string;
    dispatchState: string;
    dispatchPauseReason: string;
    testMessagePassedAt: string | null;
  };
  role: string;
  videos: Array<{
    id: string;
    status: string;
    version: number;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds: number;
    width: number;
    height: number;
    videoCodec: string;
    audioCodec: string;
    contentReviewStatus: string;
    processingStartedAt: string | null;
    reviewedAt: string | null;
    readyAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    lastError: string;
    lastErrorCode: string;
    isActive: boolean;
  }>;
  messages: Array<{
    id: string;
    status: string;
    isTest: boolean;
    messageType: string;
    recipientPhone: string;
    body: string;
    providerMessageId: string;
    providerStatus: string;
    attemptCount: number;
    lastError: string;
    lastErrorCode: string;
    scheduledAt: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    failedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  recipients: Array<{
    id: string;
    unitIndex: number;
    name: string;
    phone: string;
    status: string;
  }>;
  timeline: Array<{ type: string; at: string; label: string }>;
};

const initialChecklist = {
  recipientMatch: false,
  audioVideoOk: false,
  closingCardOk: false,
};

function formatTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Istanbul",
      }).format(new Date(value))
    : "—";
}

function formatBytes(value: number) {
  if (!value) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function DeliveryOperationModal({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewVideoId, setPreviewVideoId] = useState("");
  const [checklist, setChecklist] = useState(initialChecklist);
  const [reason, setReason] = useState("");

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const response = await fetch(`/api/delivery/groups/${groupId}/detail`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Operasyon detayı yüklenemedi.");
        setDetail(result);
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Operasyon detayı yüklenemedi.",
        );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [groupId],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 5_000);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearInterval(timer);
      document.body.style.overflow = previous;
    };
  }, [load, open]);

  const video = detail?.videos[0];
  const normalMessages = useMemo(
    () => detail?.messages.filter((message) => !message.isTest) || [],
    [detail],
  );
  const testMessages = useMemo(
    () => detail?.messages.filter((message) => message.isTest) || [],
    [detail],
  );

  async function request(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "İşlem uygulanamadı.");
      await load(true);
      router.refresh();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "İşlem uygulanamadı.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openPreview() {
    if (!video) return;
    const result = await request(
      `/api/delivery/videos/${video.id}/review-session`,
    );
    if (result?.streamUrl) {
      setPreviewUrl(String(result.streamUrl));
      setPreviewVideoId(video.id);
    }
  }

  async function review(decision: "approve" | "reject") {
    if (!video) return;
    const result = await request(`/api/delivery/videos/${video.id}/review`, {
      decision,
      checklist,
      reason,
    });
    if (result) {
      setChecklist(initialChecklist);
      setReason("");
    }
  }

  async function groupAction(action: string) {
    await request(`/api/delivery/groups/${groupId}/actions`, { action });
  }

  function close() {
    setOpen(false);
    setPreviewUrl("");
    setPreviewVideoId("");
    setError("");
  }

  function openModal() {
    setOpen(true);
    void load();
  }

  return (
    <>
      <button
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] px-2 py-1 text-xs font-semibold hover:bg-[var(--admin-surface-raised)]"
        onClick={openModal}
        type="button"
      >
        <Eye aria-hidden="true" className="size-3.5" /> Detay ve kontrol
      </button>
      {open ? (
        <div
          aria-labelledby={`delivery-modal-${groupId}`}
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
        >
          <div className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-t-3xl bg-[var(--admin-surface)] shadow-2xl sm:rounded-3xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-surface)]/95 px-5 py-4 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">
                  Video teslimat operasyonu
                </p>
                <h2
                  className="mt-1 text-xl font-bold"
                  id={`delivery-modal-${groupId}`}
                >
                  {detail?.group.code || "Yükleniyor…"} ·{" "}
                  {detail?.group.campaign || ""}
                </h2>
              </div>
              <button
                aria-label="Kapat"
                className="rounded-xl border border-[var(--admin-border)] p-2"
                onClick={close}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </header>
            <div className="space-y-6 p-5 sm:p-7">
              {loading ? (
                <p className="text-sm text-[var(--admin-muted)]">
                  Operasyon bilgileri yükleniyor…
                </p>
              ) : null}
              {error ? (
                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  {error}
                </div>
              ) : null}
              {detail ? (
                <>
                  <section className="grid gap-3 sm:grid-cols-3">
                    <Summary label="Grup" value={detail.group.status} />
                    <Summary
                      label="Gönderim"
                      value={detail.group.dispatchState}
                    />
                    <Summary
                      label="Güvenli test"
                      value={
                        detail.group.testMessagePassedAt
                          ? `Başarılı · ${formatTime(detail.group.testMessagePassedAt)}`
                          : "Bekliyor"
                      }
                    />
                  </section>

                  <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
                    <div className="rounded-2xl border border-[var(--admin-border)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold">Bağlı video</h3>
                        {video ? <StatusBadge status={video.status} /> : null}
                      </div>
                      {video ? (
                        <>
                          {previewUrl && previewVideoId === video.id ? (
                            <video
                              className="mt-4 aspect-video w-full rounded-xl bg-black"
                              controls
                              playsInline
                              preload="metadata"
                              src={previewUrl}
                            />
                          ) : (
                            <button
                              className="mt-4 flex aspect-video w-full items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white disabled:opacity-50"
                              disabled={
                                busy ||
                                !["review_pending", "ready"].includes(
                                  video.status,
                                )
                              }
                              onClick={openPreview}
                              type="button"
                            >
                              <Eye className="mr-2 size-5" />
                              {["review_pending", "ready"].includes(
                                video.status,
                              )
                                ? "Güvenli önizlemeyi aç"
                                : "Video doğrulanıyor"}
                            </button>
                          )}
                          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <Meta
                              label="Dosya"
                              value={video.originalFilename || "—"}
                            />
                            <Meta
                              label="Boyut"
                              value={formatBytes(video.sizeBytes)}
                            />
                            <Meta
                              label="Süre"
                              value={
                                video.durationSeconds
                                  ? `${Math.round(video.durationSeconds)} sn`
                                  : "—"
                              }
                            />
                            <Meta
                              label="Çözünürlük"
                              value={
                                video.width
                                  ? `${video.width}×${video.height}`
                                  : "—"
                              }
                            />
                            <Meta
                              label="Video codec"
                              value={video.videoCodec || "—"}
                            />
                            <Meta
                              label="Ses codec"
                              value={video.audioCodec || "—"}
                            />
                            <Meta label="Sürüm" value={`v${video.version}`} />
                            <Meta
                              label="Son hareket"
                              value={formatTime(video.updatedAt)}
                            />
                          </dl>
                          {video.lastError ? (
                            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                              {video.lastErrorCode
                                ? `${video.lastErrorCode}: `
                                : ""}
                              {video.lastError}
                            </p>
                          ) : null}
                          {detail.role === "admin" &&
                          [
                            "processing",
                            "processing_failed",
                            "quarantined",
                          ].includes(video.status) ? (
                            <button
                              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold"
                              disabled={busy}
                              onClick={() =>
                                request(
                                  `/api/delivery/videos/${video.id}/retry-processing`,
                                )
                              }
                              type="button"
                            >
                              <RefreshCw className="size-4" />
                              Güvenli yeniden işle
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <p className="mt-4 text-sm text-[var(--admin-muted)]">
                          Henüz video yüklenmedi.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[var(--admin-border)] p-4">
                      <h3 className="font-bold">Teknik kontrol</h3>
                      {video?.status === "review_pending" ? (
                        <div className="mt-4 space-y-3">
                          {[
                            ["recipientMatch", "Doğru grup ve alıcılar"],
                            ["audioVideoOk", "Ses ve görüntü uygun"],
                            ["closingCardOk", "Kapanış kartı ve mesaj uygun"],
                          ].map(([key, label]) => (
                            <label
                              className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] p-3 text-sm"
                              key={key}
                            >
                              <input
                                checked={
                                  checklist[key as keyof typeof checklist]
                                }
                                className="size-4 accent-emerald-700"
                                disabled={detail.role !== "admin"}
                                onChange={(event) =>
                                  setChecklist((current) => ({
                                    ...current,
                                    [key]: event.target.checked,
                                  }))
                                }
                                type="checkbox"
                              />
                              {label}
                            </label>
                          ))}
                          <textarea
                            className="admin-input min-h-20"
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Red nedeni (reddederken zorunlu)"
                            value={reason}
                          />
                          {detail.role === "admin" ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                                disabled={
                                  busy ||
                                  !Object.values(checklist).every(Boolean)
                                }
                                onClick={() => review("approve")}
                                type="button"
                              >
                                <CheckCircle2 className="mr-1 inline size-4" />
                                Onayla
                              </button>
                              <button
                                className="rounded-xl border border-red-300 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50"
                                disabled={busy || !reason.trim()}
                                onClick={() => review("reject")}
                                type="button"
                              >
                                Reddet
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--admin-muted)]">
                              Onay işlemi yönetici tarafından yapılır.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-[var(--admin-muted)]">
                          {video?.status === "ready"
                            ? "Teknik kontrol tamamlandı."
                            : "Video işlendikten sonra kontrol listesi açılacak."}
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[var(--admin-border)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold">Alıcılar ve gönderim</h3>
                      <div className="flex flex-wrap gap-2">
                        {video?.status === "ready" &&
                        normalMessages.length === 0 ? (
                          <ActionButton
                            busy={busy}
                            label="Taslak oluştur"
                            onClick={() => groupAction("prepare")}
                          />
                        ) : null}
                        {normalMessages.some(
                          (message) => message.status === "draft",
                        ) ? (
                          <ActionButton
                            busy={busy}
                            label="Güvenli test gönder"
                            onClick={() => groupAction("test")}
                          />
                        ) : null}
                        {detail.role === "admin" &&
                        detail.group.testMessagePassedAt &&
                        normalMessages.some((message) =>
                          ["draft", "paused", "failed"].includes(
                            message.status,
                          ),
                        ) ? (
                          <button
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                            disabled={busy}
                            onClick={() =>
                              groupAction(
                                detail.group.dispatchState === "paused"
                                  ? "resume"
                                  : "queue",
                              )
                            }
                            type="button"
                          >
                            <Send className="size-4" />
                            Asıl gönderimi başlat
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="text-xs uppercase text-[var(--admin-muted)]">
                          <tr>
                            <th className="pb-2">Tür</th>
                            <th className="pb-2">Alıcı</th>
                            <th className="pb-2">Mesaj</th>
                            <th className="pb-2">Durum</th>
                            <th className="pb-2">Sağlayıcı</th>
                            <th className="pb-2">Zaman</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--admin-border)]">
                          {detail.messages.map((message) => (
                            <tr key={message.id}>
                              <td className="py-3">
                                {message.isTest ? "TEST" : "GERÇEK"}
                              </td>
                              <td className="py-3 font-mono text-xs">
                                {message.isTest
                                  ? "Güvenli test hattı"
                                  : message.recipientPhone}
                              </td>
                              <td className="max-w-sm py-3 pr-4">
                                <details>
                                  <summary className="cursor-pointer font-semibold">
                                    Mesajı göster
                                  </summary>
                                  <p className="mt-2 whitespace-pre-wrap text-xs text-[var(--admin-muted)]">
                                    {message.body}
                                  </p>
                                </details>
                              </td>
                              <td className="py-3">
                                <StatusBadge status={message.status} />
                              </td>
                              <td className="py-3 text-xs">
                                {message.providerStatus || "—"}
                                {message.providerMessageId ? (
                                  <span
                                    className="block max-w-40 truncate font-mono text-[10px]"
                                    title={message.providerMessageId}
                                  >
                                    {message.providerMessageId}
                                  </span>
                                ) : null}
                                {message.lastError ? (
                                  <span className="block text-red-700">
                                    {message.lastError}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3 text-xs">
                                {formatTime(
                                  message.readAt ||
                                    message.deliveredAt ||
                                    message.sentAt ||
                                    message.scheduledAt ||
                                    message.createdAt,
                                )}
                              </td>
                            </tr>
                          ))}
                          {detail.messages.length === 0 ? (
                            <tr>
                              <td
                                className="py-5 text-[var(--admin-muted)]"
                                colSpan={6}
                              >
                                Henüz mesaj taslağı oluşmadı.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                    {testMessages.length ? (
                      <p className="mt-3 text-xs text-[var(--admin-muted)]">
                        Son test:{" "}
                        {formatTime(
                          testMessages[0].sentAt || testMessages[0].createdAt,
                        )}{" "}
                        · {testMessages[0].status}
                      </p>
                    ) : null}
                  </section>

                  <section className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--admin-border)] p-4">
                      <h3 className="font-bold">Alıcı listesi</h3>
                      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                        {detail.recipients.map((recipient) => (
                          <div
                            className="flex items-center justify-between gap-3 rounded-xl bg-[var(--admin-surface-raised)] p-3"
                            key={recipient.id}
                          >
                            <div>
                              <p className="font-semibold">
                                {recipient.unitIndex}. hisse · {recipient.name}
                              </p>
                              <p className="font-mono text-xs text-[var(--admin-muted)]">
                                {recipient.phone}
                              </p>
                            </div>
                            <StatusBadge status={recipient.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--admin-border)] p-4">
                      <h3 className="font-bold">Zaman çizelgesi</h3>
                      <ol className="mt-3 space-y-3">
                        {detail.timeline.map((item, index) => (
                          <li
                            className="flex gap-3 text-sm"
                            key={`${item.type}-${item.at}-${index}`}
                          >
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-600" />
                            <div>
                              <p className="font-semibold">{item.label}</p>
                              <time className="text-xs text-[var(--admin-muted)]">
                                {formatTime(item.at)}
                              </time>
                            </div>
                          </li>
                        ))}
                        {detail.timeline.length === 0 ? (
                          <li className="text-sm text-[var(--admin-muted)]">
                            Henüz hareket yok.
                          </li>
                        ) : null}
                      </ol>
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">
        {label}
      </p>
      <p className="mt-1 font-bold">{value || "—"}</p>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--admin-muted)]">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}
function ActionButton({
  busy,
  label,
  onClick,
}: {
  busy: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold disabled:opacity-50"
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
