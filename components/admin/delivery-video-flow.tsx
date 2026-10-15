"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import * as tus from "tus-js-client";

import type { UnifiedDeliveryRow } from "@/lib/admin/unified-panel-data";
import { deliveryVideoMime } from "@/lib/delivery/upload-metadata";

const MAX_BYTES = 2_147_483_648;

type GroupDetail = {
  recipients: Array<{ id: string; name: string; unitIndex: number; status: string }>;
};

function canSelect(row: UnifiedDeliveryRow) {
  if (!row.confirmedCount || !["idle", "paused", "cancelled", "failed"].includes(row.dispatchState)) return false;
  if (!["waiting", "failed", "rejected", "processing_failed", "quarantined"].includes(row.videoStatus)) return false;
  if (row.operationType === "slaughter_video") return row.capacity > 0 && row.confirmedCount >= row.capacity;
  return row.operationType === "standard_video" && ["video_pending", "video_ready", "delivery_started", "completed"].includes(row.groupStatus);
}

export function DeliveryVideoFlow({ rows }: { rows: UnifiedDeliveryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [groupId, setGroupId] = useState("");
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [schedule, setSchedule] = useState("");
  const [mode, setMode] = useState<"now" | "later">("now");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const groups = useMemo(() => [...new Map(rows.filter(canSelect).map((row) => [row.groupId, row])).values()], [rows]);
  const selected = groups.find((row) => row.groupId === groupId);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!groupId || !open) return;
    const controller = new AbortController();
    fetch(`/api/delivery/groups/${groupId}/detail`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Bağışçı listesi alınamadı.");
        setDetail(result);
      })
      .catch((cause) => {
        if (cause?.name !== "AbortError") setError(cause instanceof Error ? cause.message : "Bağışçı listesi alınamadı.");
      });
    return () => controller.abort();
  }, [groupId, open]);

  function close() {
    if (busy) return;
    setOpen(false);
    setFile(null);
    setPreviewUrl("");
    setGroupId("");
    setDetail(null);
    setSchedule("");
    setMode("now");
    setError("");
    setProgress(0);
    setDone(false);
  }

  async function submit() {
    if (!file || !selected || !detail || busy) return;
    setError("");
    const mimeType = deliveryVideoMime(file.name, file.type);
    if (!mimeType || file.size < 1 || file.size > MAX_BYTES) {
      setError("MP4, MOV veya WebM dosyası seçin. En fazla 2 GB olabilir.");
      return;
    }
    const confirmed = detail.recipients.filter((recipient) => recipient.status === "confirmed");
    if (confirmed.length !== selected.confirmedCount) {
      setError("Bağışçı listesi değişti. Sayfayı yenileyip yeniden kontrol edin.");
      return;
    }
    if (mode === "later" && (!schedule || !Number.isFinite(Date.parse(schedule)) || Date.parse(schedule) <= Date.now())) {
      setError("Gelecekte bir gönderim zamanı seçin.");
      return;
    }
    const dispatchAt = mode === "later" ? new Date(schedule).toISOString() : null;
    setBusy(true);
    setProgress(0);
    try {
      const response = await fetch("/api/delivery/uploads/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId: selected.groupId,
          groupCode: selected.groupCode,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
          dispatchAt,
          expectedConfirmedCount: confirmed.length,
        }),
      });
      const session = await response.json();
      if (!response.ok || !session.ok || !session.endpoint || !session.metadata?.token) {
        throw new Error(session.error || "Video yükleme başlatılamadı.");
      }
      const upload = new tus.Upload(file, {
        endpoint: session.endpoint,
        metadata: { token: session.metadata.token, filename: file.name, filetype: mimeType },
        chunkSize: 10 * 1024 * 1024,
        parallelUploads: 1,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        storeFingerprintForResuming: false,
        onProgress(uploaded, total) { setProgress(Math.round(uploaded / total * 100)); },
        onError(cause) { setBusy(false); setError(`${cause.message} Yeniden deneyebilirsiniz.`); },
        onSuccess() { setBusy(false); setDone(true); setProgress(100); router.refresh(); },
      });
      upload.start();
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "Video yüklenemedi.");
    }
  }

  return <>
    <button className="admin-action-button" onClick={() => setOpen(true)} type="button"><Upload className="size-4" /> Video Ekle</button>
    {open ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-6" role="presentation">
      <div aria-label="Video ekle ve gönder" aria-modal="true" className="max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-[var(--admin-surface)] p-5 shadow-2xl sm:rounded-3xl sm:p-7" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div><p className="admin-eyebrow">Video teslimat</p><h2 className="mt-1 text-xl font-semibold">Video ekle ve gönder</h2></div>
          <button aria-label="Kapat" className="admin-icon-button" disabled={busy} onClick={close} type="button"><X className="size-5" /></button>
        </div>
        {done ? <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900" role="status">
          Video yüklendi. Teknik dosya doğrulaması bitince {mode === "later" ? "seçtiğiniz zamanda" : "otomatik olarak"} gönderim kuyruğuna girecek.
          <button className="admin-button-secondary mt-4" onClick={close} type="button">Kapat</button>
        </div> : <div className="mt-6 space-y-5">
          <label className="block"><span className="admin-label">1. Video seç</span><input accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" className="admin-input mt-2" disabled={busy} onChange={(event) => { const next = event.target.files?.[0] || null; setFile(next); setPreviewUrl(next ? URL.createObjectURL(next) : ""); setError(""); }} type="file" /></label>
          {file ? <p className="text-sm text-[var(--admin-muted)]">{file.name} · {(file.size / 1024 / 1024).toFixed(0)} MB</p> : null}
          {file ? <section><h3 className="admin-label">2. Gönderilecek grubu seç</h3>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">Yalnızca video gönderimine hazır gruplar gösterilir.</p>
            <div className="mt-3 grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2">
              {groups.map((row) => <button aria-pressed={groupId === row.groupId} className={`rounded-xl border p-4 text-left text-sm transition-colors ${groupId === row.groupId ? "border-emerald-700 bg-emerald-50" : "border-[var(--admin-border)] hover:border-emerald-600"}`} disabled={busy} key={row.groupId} onClick={() => { setGroupId(row.groupId); setDetail(null); setError(""); }} type="button">
                <span className="block font-mono font-semibold">{row.groupCode}</span>
                <span className="mt-1 block font-medium">{row.campaign}</span>
                <span className="mt-2 block text-xs text-[var(--admin-muted)]">{row.confirmedCount} onaylı hissedar · {row.videoStatus === "waiting" ? "Video bekliyor" : "Yeniden yükleme"}</span>
                <span className="mt-2 block text-xs">{row.recipients.filter((recipient) => recipient.status === "confirmed").slice(0, 3).map((recipient) => recipient.name).join(", ")}{row.confirmedCount > 3 ? " ve diğerleri" : ""}</span>
              </button>)}
              {!groups.length ? <p className="text-sm text-[var(--admin-muted)]">Şu an video gönderimine uygun grup bulunamadı.</p> : null}
            </div>
          </section> : null}
          {selected && detail ? <section className="grid gap-4 sm:grid-cols-2">
            <div><h3 className="font-semibold">3. Önizleme</h3>{previewUrl ? <video className="mt-2 aspect-video w-full rounded-xl bg-black" controls playsInline preload="metadata" src={previewUrl} /> : null}</div>
            <div><h3 className="font-semibold">{selected.groupCode} · Bağışçılar</h3><ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">{detail.recipients.filter((recipient) => recipient.status === "confirmed").map((recipient) => <li className="rounded-lg bg-[var(--admin-surface-raised)] px-3 py-2" key={recipient.id}>{recipient.unitIndex}. hisse · {recipient.name}</li>)}</ul></div>
          </section> : null}
          {selected && detail ? <section><h3 className="font-semibold">4. Gönderim zamanı</h3><div className="mt-2 flex gap-3"><label className="flex items-center gap-2"><input checked={mode === "now"} disabled={busy} onChange={() => setMode("now")} type="radio" /> Şimdi</label><label className="flex items-center gap-2"><input checked={mode === "later"} disabled={busy} onChange={() => setMode("later")} type="radio" /> Zamanla</label></div>{mode === "later" ? <input aria-label="Gönderim tarihi ve saati" className="admin-input mt-3" disabled={busy} onChange={(event) => setSchedule(event.target.value)} type="datetime-local" value={schedule} /> : null}</section> : null}
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
          {busy ? <div aria-label="Video yükleme ilerlemesi" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-[var(--admin-border)]" role="progressbar"><div className="h-full bg-emerald-700" style={{ width: `${progress}%` }} /></div> : null}
          <button className="admin-action-button w-full justify-center" disabled={!file || !selected || !detail || busy} onClick={() => void submit()} type="button">{busy ? `Yükleniyor · %${progress}` : selected ? `${selected.groupCode} grubuna yükle ve ${mode === "later" ? "zamanla" : "kuyruğa al"}` : "Önce grup seçin"}</button>
          {selected ? <p className="text-xs text-[var(--admin-muted)]">Video teknik olarak doğrulandıktan sonra mesajlar tek tek gönderilir. İşleme seçilen saatten uzun sürerse gönderim hazır olduğunda başlar.</p> : null}
        </div>}
      </div>
    </div> : null}
  </>;
}
