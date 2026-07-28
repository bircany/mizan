"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";

const MAX_VIDEO_BYTES = 2_147_483_648;
const MAX_VIDEO_SECONDS = 10 * 60;
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function inferredMime(file: File) {
  const requested = file.type.trim().toLowerCase();
  if (VIDEO_MIME_TYPES.has(requested)) return requested;
  if (/\.mov$/i.test(file.name)) return "video/quicktime";
  if (/\.mp4$/i.test(file.name)) return "video/mp4";
  if (/\.webm$/i.test(file.name)) return "video/webm";
  return null;
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
  messageId,
  messageBody,
  status,
  videoStatus,
}: {
  groupId: string;
  messageId: string | null;
  messageBody: string;
  status: string;
  videoStatus: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

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
      const groupCode = window.prompt(
        "Yanlış gruba yüklemeyi önlemek için seçili operasyon grup kodunu aynen yazın:",
      )?.trim();
      if (!groupCode) throw new Error("Grup kodu doğrulanmadan video yüklenemez.");

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
          setProgress(`Yükleniyor · %${Math.round((uploaded / total) * 100)}`);
        },
        onSuccess() {
          setBusy(false);
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
      {["waiting", "uploading", "failed"].includes(videoStatus) ? (
        <Button disabled={busy} onClick={() => fileInput.current?.click()}>
          Video yükle
        </Button>
      ) : null}
      {videoStatus === "ready" && !messageId ? (
        <Button disabled={busy} onClick={() => action("prepare")}>
          Taslak oluştur
        </Button>
      ) : null}
      {status === "draft" ? (
        <>
          <Button disabled={busy} onClick={editMessage}>Düzenle</Button>
          <Button disabled={busy} onClick={() => action("test")}>Test</Button>
          <Button disabled={busy} onClick={() => action("queue")}>Gönder</Button>
        </>
      ) : null}
      {["queued", "sending"].includes(status) ? (
        <Button disabled={busy} onClick={() => action("pause")}>Duraklat</Button>
      ) : null}
      {status === "paused" ? (
        <Button disabled={busy} onClick={() => action("resume")}>Devam</Button>
      ) : null}
      {["draft", "queued", "paused"].includes(status) ? (
        <Button disabled={busy} onClick={() => action("cancel")}>İptal</Button>
      ) : null}
      {status === "failed" && messageId ? (
        <Button disabled={busy} onClick={retry}>Tekrar dene</Button>
      ) : null}
      {progress ? <span className="text-xs text-emerald-700">{progress}</span> : null}
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
