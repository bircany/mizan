"use client";

import { useCallback, useState } from "react";

type StoredVideo = {
  id: string;
  groupId: string;
  groupCode: string;
  status: string;
  createdAt: string;
  hasRaw: boolean;
  hasProcessed: boolean;
  canClean: boolean;
};

export function VdsVideoInventory() {
  const [videos, setVideos] = useState<StoredVideo[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/delivery/videos/inventory${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Videolar alınamadı.");
      setVideos((current) => cursor ? [...current, ...result.videos] : result.videos);
      setNextCursor(result.nextCursor);
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Videolar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function clean(video: StoredVideo) {
    if (!window.confirm(`${video.groupCode} grubundaki #${video.id} videosunun VDS dosyaları kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusyId(video.id);
    setError("");
    try {
      const response = await fetch(`/api/delivery/videos/${video.id}/clean`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "clean" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Video temizlenemedi.");
      setVideos((current) => current.filter((item) => item.id !== video.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Video temizlenemedi.");
    } finally {
      setBusyId(null);
    }
  }

  async function openPreview(video: StoredVideo) {
    setError("");
    try {
      const response = await fetch(`/api/delivery/videos/${video.id}/review-session`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.streamUrl) throw new Error(result.error || "Önizleme açılamadı.");
      setPreview({ id: video.id, url: result.streamUrl });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Önizleme açılamadı.");
    }
  }

  return <details className="admin-card" onToggle={(event) => {
    if (event.currentTarget.open && !loaded && !loading) void load();
  }}>
    <summary className="cursor-pointer text-lg font-semibold">VDS video arşivi ve temizlik</summary>
    <p className="mt-2 text-sm text-[var(--admin-muted)]">Yüklenen videoları burada görebilirsiniz. Aktif veya gönderim bekleyen videolar korunur; yalnızca kullanım dışı dosyalar temizlenebilir.</p>
    <button className="admin-button-secondary mt-4" type="button" onClick={() => void load()} disabled={loading}>Listeyi yenile</button>
    {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
    <div className="mt-4 space-y-2">
      {videos.map((video) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] p-3 text-sm" key={video.id}>
        <div>
          <strong>{video.groupCode}</strong> <span className="text-[var(--admin-muted)]">· Video #{video.id} · {video.status}</span>
          <p className="text-xs text-[var(--admin-muted)]">{new Date(video.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })} · {video.hasProcessed ? "İşlenmiş dosya" : "İşlenmiş dosya yok"}{video.hasRaw ? " · Ham dosya" : ""}</p>
        </div>
        <div className="flex gap-2">
          {video.hasProcessed && ["ready", "review_pending"].includes(video.status) ? <button className="admin-button-secondary" type="button" onClick={() => void openPreview(video)}>İzle</button> : null}
          {video.canClean ? <button className="admin-danger-button" type="button" disabled={busyId !== null} onClick={() => void clean(video)}>{busyId === video.id ? "Temizleniyor…" : "Dosyaları temizle"}</button> : <span className="text-xs text-[var(--admin-muted)]">Korumalı</span>}
        </div>
      </div>)}
      {loaded && !loading && videos.length === 0 ? <p className="text-sm text-[var(--admin-muted)]">VDS üzerinde kayıtlı video bulunamadı.</p> : null}
    </div>
    {preview ? <div className="mt-5 rounded-xl border border-[var(--admin-border)] p-4"><div className="mb-3 flex items-center justify-between"><strong>Video #{preview.id}</strong><button className="admin-button-secondary" type="button" onClick={() => setPreview(null)}>Kapat</button></div><video className="w-full max-w-2xl" controls src={preview.url} /></div> : null}
    {nextCursor ? <button className="admin-button-secondary mt-4" type="button" disabled={loading} onClick={() => void load(nextCursor)}>{loading ? "Yükleniyor…" : "Daha fazla göster"}</button> : null}
  </details>;
}
