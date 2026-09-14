"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import { deliveryVideoMime } from "@/lib/delivery/upload-metadata";
import {
  canUploadDeliveryVideo,
  deliveryUploadButtonLabel,
  deliveryUploadConfirmation,
} from "@/lib/delivery/types";

const MAX_VIDEO_BYTES = 2_147_483_648;
const MAX_VIDEO_SECONDS = 10 * 60;

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function inferredMime(file: File) {
  return deliveryVideoMime(file.name,file.type);
}

function inspectVideoDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
      resolve(duration);
    };
    const timer = window.setTimeout(() => finish(null), 10_000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      finish(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    video.src = objectUrl;
  });
}

export function DeliveryRowActions({
  groupId,
  groupCode,
  messageId,
  messageBody,
  status,
  videoStatus,
  canManage = true,
}: {
  groupId: string;
  groupCode: string;
  messageId: string | null;
  messageBody: string;
  status: string;
  videoStatus: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [selectedFileSize, setSelectedFileSize] = useState<number | null>(null);
  const [uploadedBytes, setUploadedBytes] = useState(0);

  async function action(name: string) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/delivery/groups/${groupId}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: name }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(String(result.error || "İşlem uygulanamadı."));
      return;
    }
    router.refresh();
  }

  async function retry() {
    if (!messageId) return;
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/delivery/messages/${messageId}/retry`,
      { method: "POST" },
    );
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(String(result.error || "Mesaj yenilenemedi."));
      return;
    }
    router.refresh();
  }

  async function editMessage() {
    if (!messageId) return;
    const body = window.prompt("Mesaj taslağını düzenleyin:", messageBody);
    if (!body?.trim() || body === messageBody) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/delivery/messages/${messageId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(String(result.error || "Mesaj güncellenemedi."));
      return;
    }
    router.refresh();
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setSelectedFileSize(file.size);
    setUploadedBytes(0);
    setProgress("Video tarayıcıda kontrol ediliyor");
    try {
      const mimeType = inferredMime(file);
      if (!mimeType) {
        throw new Error("Yalnızca MP4, MOV veya WebM video seçebilirsiniz.");
      }
      if (!file.size || file.size > MAX_VIDEO_BYTES) {
        throw new Error("Video boş olamaz ve 2 GB sınırını aşamaz.");
      }
      const duration = await inspectVideoDuration(file);
      if (duration && duration > MAX_VIDEO_SECONDS) {
        throw new Error("Video 10 dakikalık süre sınırını aşıyor.");
      }
      if (
        duration === null &&
        !window.confirm(
          "Tarayıcı video süresini doğrulayamadı. VDS yükleme sonrasında kesin format ve 10 dakika kontrolü yapacaktır. Devam edilsin mi?",
        )
      ) {
        throw new Error("Yükleme kullanıcı tarafından iptal edildi.");
      }
      if (!window.confirm(deliveryUploadConfirmation(groupCode, file.name))) {
        throw new Error("Yükleme kullanıcı tarafından iptal edildi.");
      }

      setProgress("Güvenli yükleme oturumu hazırlanıyor");
      const response = await fetch("/api/delivery/uploads/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          groupId,
          groupCode,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
        }),
      });
      const session = await response.json().catch(() => ({}));
      if (!response.ok || !session.ok) {
        throw new Error(String(session.error || "Yükleme başlatılamadı."));
      }
      if (!session.endpoint || !session.metadata?.token) {
        throw new Error("Video servisi eksik upload oturumu döndürdü.");
      }

      const transfer = new tus.Upload(file, {
        endpoint: session.endpoint,
        metadata: {
          token: session.metadata.token,
          filename: file.name,
          filetype: mimeType,
        },
        fingerprint: async () =>
          [
            "mizan-delivery-v1",
            groupId,
            file.name,
            file.size,
            file.lastModified,
          ].join(":"),
        chunkSize: 10 * 1024 * 1024,
        parallelUploads: 1,
        retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
        storeFingerprintForResuming: true,
        removeFingerprintOnSuccess: true,
        onError(uploadError) {
          setBusy(false);
          setProgress("");
          setError(
            `${uploadError.message} Aynı dosyayı yeniden seçerek yarım kalan yüklemeye devam edebilirsiniz.`,
          );
        },
        onProgress(uploaded, total) {
          setUploadedBytes(uploaded);
          setProgress(`Yükleniyor · %${Math.round((uploaded / total) * 100)}`);
        },
        onSuccess() {
          setBusy(false);
          setUploadedBytes(file.size);
          setProgress("Yüklendi, VDS üzerinde teknik kontrol bekleniyor");
          router.refresh();
        },
      });
      const previous = await transfer.findPreviousUploads();
      if (previous[0]) {
        transfer.resumeFromPreviousUpload(previous[0]);
        setProgress("Yarım kalan yüklemeye devam ediliyor");
      }
      transfer.start();
    } catch (uploadError) {
      setBusy(false);
      setProgress("");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Yükleme başlatılamadı.",
      );
    }
  }

  return (
    <div className="flex min-w-52 flex-wrap gap-1.5">
      <input
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
        ref={fileInput}
        type="file"
      />
      {canUploadDeliveryVideo(videoStatus) ? (
        <Button disabled={busy} onClick={() => fileInput.current?.click()}>
          {deliveryUploadButtonLabel(videoStatus)}
        </Button>
      ) : null}
      {canManage && videoStatus === "ready" && !messageId ? (
        <Button disabled={busy} onClick={() => action("prepare")}>
          Taslak oluştur
        </Button>
      ) : null}
      {canManage && videoStatus === "ready" && status === "draft" ? (
        <>
          <Button disabled={busy} onClick={editMessage}>Düzenle</Button>
          <Button disabled={busy} onClick={() => action("test")}>Test</Button>
          <Button disabled={busy} onClick={() => action("queue")}>Gönder</Button>
        </>
      ) : null}
      {canManage && ["queued", "sending"].includes(status) ? (
        <Button disabled={busy} onClick={() => action("pause")}>Duraklat</Button>
      ) : null}
      {canManage && status === "paused" ? (
        <Button disabled={busy} onClick={() => action("resume")}>Devam</Button>
      ) : null}
      {canManage && ["draft", "queued", "paused"].includes(status) ? (
        <Button disabled={busy} onClick={() => action("cancel")}>İptal</Button>
      ) : null}
      {canManage && videoStatus === "ready" && status === "failed" && messageId ? (
        <Button disabled={busy} onClick={retry}>Tekrar dene</Button>
      ) : null}
      {canUploadDeliveryVideo(videoStatus) ? (
        <div className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-2.5">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="font-semibold text-[var(--admin-text)]">
              Video yükleme hakkı
            </span>
            <span className="font-mono text-[var(--admin-muted)]">
              {selectedFileSize === null
                ? `Dosya başına ${formatBytes(MAX_VIDEO_BYTES)}`
                : `${formatBytes(selectedFileSize)} / ${formatBytes(MAX_VIDEO_BYTES)}`}
            </span>
          </div>
          <div
            aria-label="Video dosyası boyut hakkı kullanımı"
            aria-valuemax={MAX_VIDEO_BYTES}
            aria-valuemin={0}
            aria-valuenow={Math.min(selectedFileSize || 0, MAX_VIDEO_BYTES)}
            className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--admin-border)]"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
              style={{
                width: `${Math.min(100, ((selectedFileSize || 0) / MAX_VIDEO_BYTES) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] text-[var(--admin-muted)]">
            <span>
              {selectedFileSize === null
                ? "MP4, MOV veya WebM · en fazla 10 dakika"
                : `Kalan hak: ${formatBytes(Math.max(0, MAX_VIDEO_BYTES - selectedFileSize))}`}
            </span>
            {uploadedBytes > 0 && selectedFileSize ? (
              <span>
                Aktarılan: {formatBytes(uploadedBytes)} / {formatBytes(selectedFileSize)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      {progress ? <span className="w-full text-xs text-emerald-700">{progress}</span> : null}
      {error ? <span className="w-full text-xs text-red-700">{error}</span> : null}
    </div>
  );
}

function Button({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg border border-[var(--admin-border)] px-2 py-1 text-xs font-semibold disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
