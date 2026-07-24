"use client";

import { useRef, useState } from "react";
import { Camera, Images, Upload } from "lucide-react";
import * as tus from "tus-js-client";

export function QurbaniVideoUploader({
  poolId,
  poolCode,
}: {
  poolId: string;
  poolCode: string;
}) {
  const uploadRef = useRef<tus.Upload | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "preparing" | "uploading" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function start() {
    if (!file) return;
    setStatus("preparing");
    setMessage("");
    setProgress(0);
    try {
      const response = await fetch("/api/qurbani/uploads/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poolId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const session = await response.json();
      if (!response.ok || !session.ok)
        throw new Error(session.error || "Upload oturumu acilamadi.");
      const upload = new tus.Upload(file, {
        endpoint: session.endpoint,
        chunkSize: 10 * 1024 * 1024,
        retryDelays: [0, 1000, 3000, 5000, 10_000],
        removeFingerprintOnSuccess: true,
        metadata: {
          filename: file.name,
          filetype: file.type,
          ...session.metadata,
        },
        onError(error) {
          setStatus("error");
          setMessage(error.message || "Video yuklenemedi.");
        },
        onProgress(bytesUploaded, bytesTotal) {
          setStatus("uploading");
          setProgress(
            bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0,
          );
        },
        onSuccess() {
          setStatus("done");
          setProgress(100);
          setMessage(
            "Video alindi. Format, sure ve filigran islemi worker kuyrugunda basladi.",
          );
        },
      });
      uploadRef.current = upload;
      const previous = await upload.findPreviousUploads();
      if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Video yuklenemedi.");
    }
  }

  return (
    <section className="admin-card mx-auto max-w-2xl">
      <p className="admin-eyebrow">Saha videosu</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--admin-text)]">
        {poolCode || `Havuz ${poolId}`}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">
        MP4 veya MOV, en fazla 1 GB ve 15 dakika. Bağlantı kesilirse aynı
        dosyayı seçerek yüklemeye devam edebilirsiniz.
      </p>
      <div className="mt-6 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-6 text-center">
        <span className="admin-label">Kesim videosunu ekleyin</span>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            className="admin-action-button justify-center"
            disabled={status === "uploading" || status === "preparing"}
            onClick={() => cameraInputRef.current?.click()}
            type="button"
          >
            <Camera className="size-4" /> Kamerayla çek
          </button>
          <button
            className="admin-secondary-button justify-center"
            disabled={status === "uploading" || status === "preparing"}
            onClick={() => galleryInputRef.current?.click()}
            type="button"
          >
            <Images className="size-4" /> Galeriden seç
          </button>
        </div>
        <input
          className="sr-only"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          capture="environment"
          disabled={status === "uploading" || status === "preparing"}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          ref={cameraInputRef}
          type="file"
        />
        <input
          accept="video/mp4,video/quicktime,.mp4,.mov"
          className="sr-only"
          disabled={status === "uploading" || status === "preparing"}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          ref={galleryInputRef}
          type="file"
        />
      </div>
      {file ? (
        <p className="mt-3 text-xs text-[var(--admin-muted)]">
          {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
        </p>
      ) : null}
      {status === "uploading" || status === "done" ? (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-border)]">
            <div
              className="h-full bg-[var(--admin-primary)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--admin-muted)]">%{progress}</p>
        </div>
      ) : null}
      {message ? (
        <p
          className={`mt-4 rounded-xl p-3 text-sm ${status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
        >
          {message}
        </p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button
          className="admin-button admin-button-primary"
          disabled={
            !file ||
            status === "uploading" ||
            status === "preparing" ||
            status === "done"
          }
          onClick={start}
          type="button"
        >
          {status === "preparing"
            ? "Hazırlanıyor…"
            : status === "uploading"
              ? "Yükleniyor…"
              : <><Upload className="size-4" /> Videoyu yükle</>}
        </button>
        {status === "uploading" ? (
          <button
            className="admin-button admin-button-secondary"
            onClick={() => {
              uploadRef.current?.abort();
              setStatus("idle");
              setMessage(
                "Yükleme durduruldu; aynı dosyayla devam edebilirsiniz.",
              );
            }}
            type="button"
          >
            Durdur
          </button>
        ) : null}
      </div>
    </section>
  );
}
