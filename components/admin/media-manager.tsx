"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Clipboard, ExternalLink, FileImage, LoaderCircle, Pencil, Search, Trash2, X } from "lucide-react";

import { deleteMedia, updateMediaAlt, type MediaActionState } from "@/lib/admin/media-actions";
import type { MediaAdminRecord } from "@/lib/admin/media-data";
import { MediaUploadForm } from "@/components/admin/media-upload-form";

const initialState: MediaActionState = { message: null, success: false };
const pageSize = 24;

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function PendingButton({ danger = false, children }: { danger?: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className={danger ? "admin-danger-button" : "admin-action-button sm:w-auto"} disabled={pending} type="submit">{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{children}</button>;
}

function AltEditor({ media, onClose }: { media: MediaAdminRecord; onClose(): void }) {
  const router = useRouter();
  const [state, action] = useActionState(updateMediaAlt, initialState);
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <div aria-modal="true" className="fixed inset-0 z-[110] grid place-items-center bg-[#173525]/30 p-4 backdrop-blur-sm" role="dialog"><div className="w-full max-w-lg rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="admin-eyebrow">Medya bilgisi</p><h3 className="mt-2 text-lg font-semibold">Alternatif metni düzenle</h3></div><button aria-label="Pencereyi kapat" className="admin-icon-button" onClick={onClose} type="button"><X className="size-5" /></button></div><form action={action} className="mt-5 space-y-4"><input name="id" type="hidden" value={media.id} /><label><span className="admin-label">Alternatif metin</span><input autoFocus className="admin-input" defaultValue={media.alt} name="alt" required /></label>{state.message ? <p className={state.success ? "text-sm text-[var(--admin-primary-strong)]" : "text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}<div className="flex justify-end gap-2"><button className="admin-secondary-button" onClick={onClose} type="button">Vazgeç</button><PendingButton>Kaydet</PendingButton></div></form></div></div>;
}

function DeleteMediaButton({ media }: { media: MediaAdminRecord }) {
  const router = useRouter();
  const [state, action] = useActionState(deleteMedia, initialState);
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action} onSubmit={(event) => { if (!window.confirm(`“${media.filename}” kalıcı olarak silinsin mi?`)) event.preventDefault(); }}><input name="id" type="hidden" value={media.id} /><PendingButton danger><Trash2 className="size-4" />Sil</PendingButton>{state.message ? <p className={state.success ? "mt-2 text-xs text-[var(--admin-primary-strong)]" : "mt-2 max-w-xs text-xs text-[var(--admin-danger)]"}>{state.message}</p> : null}</form>;
}

export function MediaManager({ records }: { records: MediaAdminRecord[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MediaAdminRecord | null>(null);
  const [copied, setCopied] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return records.filter((item) => !needle || `${item.alt} ${item.filename}`.toLocaleLowerCase("tr-TR").includes(needle)).sort((a, b) => sort === "name" ? a.filename.localeCompare(b.filename, "tr") : sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  }, [query, records, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function copyUrl(media: MediaAdminRecord) {
    const url = new URL(media.url, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(media.id);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3"><div className="admin-metric"><p className="admin-eyebrow">Toplam medya</p><p className="mt-3 text-3xl font-semibold">{records.length}</p></div><div className="admin-metric"><p className="admin-eyebrow">Gösterilen sonuç</p><p className="mt-3 text-3xl font-semibold">{filtered.length}</p></div><div className="admin-metric"><p className="admin-eyebrow">Toplam boyut</p><p className="mt-3 text-3xl font-semibold">{formatBytes(records.reduce((sum, item) => sum + item.filesize, 0))}</p></div></div>
    <MediaUploadForm />
    <section className="admin-card space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--admin-muted)]" /><input className="admin-input pl-9" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Dosya adı veya alternatif metin ara" value={query} /></label><select className="admin-input sm:w-52" onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }} value={sort}><option value="newest">En yeni</option><option value="oldest">En eski</option><option value="name">Dosya adına göre</option></select></div>
      {visible.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{visible.map((media) => <article className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)]" key={media.id}><div className="relative aspect-[4/3] bg-[var(--admin-surface)]">{media.url ? <Image alt={media.alt} className="object-cover" fill sizes="(max-width:640px) 100vw, 25vw" src={media.url} /> : <FileImage className="absolute inset-0 m-auto size-8 text-[var(--admin-muted)]" />}{media.usage.length ? <span className="admin-status admin-status-info absolute left-3 top-3 bg-[var(--admin-surface-raised)]">{media.usage.length} kullanım</span> : null}</div><div className="p-4"><h3 className="truncate text-sm font-semibold">{media.alt}</h3><p className="mt-1 truncate font-mono text-[11px] text-[var(--admin-muted)]">{media.filename}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--admin-muted)]"><div><dt>Boyut</dt><dd className="mt-0.5 font-medium text-[var(--admin-text)]">{media.width && media.height ? `${media.width}×${media.height}` : "—"}</dd></div><div><dt>Dosya</dt><dd className="mt-0.5 font-medium text-[var(--admin-text)]">{formatBytes(media.filesize)}</dd></div><div className="col-span-2"><dt>Tür</dt><dd className="mt-0.5 font-medium text-[var(--admin-text)]">{media.mimeType || "—"}</dd></div></dl>{media.usage.length ? <p className="mt-3 line-clamp-2 text-xs text-[var(--admin-muted)]">{media.usage.join(", ")}</p> : null}<div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4"><button aria-label="URL'yi kopyala" className="admin-secondary-button" onClick={() => copyUrl(media)} type="button">{copied === media.id ? <Check className="size-4" /> : <Clipboard className="size-4" />}</button><button aria-label="Alternatif metni düzenle" className="admin-secondary-button" onClick={() => setEditing(media)} type="button"><Pencil className="size-4" /></button>{media.url ? <a aria-label="Görseli yeni sekmede aç" className="admin-secondary-button" href={media.url} rel="noreferrer" target="_blank"><ExternalLink className="size-4" /></a> : null}<DeleteMediaButton media={media} /></div></div></article>)}</div> : <div className="py-12 text-center"><FileImage className="mx-auto size-8 text-[var(--admin-muted)]" /><p className="mt-3 font-semibold">Eşleşen medya bulunamadı</p></div>}
      {pages > 1 ? <nav aria-label="Medya sayfaları" className="flex items-center justify-center gap-3 border-t border-[var(--admin-border)] pt-5"><button className="admin-secondary-button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Önceki</button><span className="text-sm text-[var(--admin-muted)]">{currentPage} / {pages}</span><button className="admin-secondary-button" disabled={currentPage === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} type="button">Sonraki</button></nav> : null}
    </section>
    {editing ? <AltEditor key={editing.id} media={editing} onClose={() => setEditing(null)} /> : null}
  </div>;
}
