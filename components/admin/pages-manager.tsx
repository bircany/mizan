"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, FileText, Languages, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { deletePage, savePage, type PageActionState } from "@/lib/admin/page-actions";
import type { PageAdminRecord, PageTranslation } from "@/lib/admin/page-data";
import { slugifyEditorial } from "@/lib/editorial";

const initialState: PageActionState = { message: null, success: false };
const locales = ["tr", "en", "ar"] as const;
type Locale = (typeof locales)[number];

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <button className="admin-action-button sm:w-auto" disabled={pending} type="submit">{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{pending ? "Kaydediliyor" : editing ? "Değişiklikleri kaydet" : "Sayfa oluştur"}</button>;
}

function PageEditor({ record, onClose }: { record?: PageAdminRecord; onClose(): void }) {
  const router = useRouter();
  const [state, action] = useActionState(savePage, initialState);
  const [locale, setLocale] = useState<Locale>("tr");
  const [slugDirty, setSlugDirty] = useState(Boolean(record));
  const [form, setForm] = useState(() => ({
    id: record?.id || "",
    slug: record?.slug || "",
    published: record?.published || false,
    translations: record?.translations || {
      tr: { title: "", content: "" }, en: { title: "", content: "" }, ar: { title: "", content: "" },
    },
  }));
  const translation = form.translations[locale];

  function updateTranslation(patch: Partial<PageTranslation>) {
    setForm((current) => ({ ...current, translations: { ...current.translations, [locale]: { ...current.translations[locale], ...patch } } }));
  }

  function updateTitle(title: string) {
    updateTranslation({ title });
    if (locale === "tr" && !slugDirty) setForm((current) => ({ ...current, slug: slugifyEditorial(title), translations: { ...current.translations, tr: { ...current.translations.tr, title } } }));
  }

  return <div aria-modal="true" className="fixed inset-0 z-[100] flex items-end justify-center bg-[#173525]/30 backdrop-blur-sm sm:items-center sm:p-5" role="dialog">
    <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-5 shadow-2xl sm:max-w-4xl sm:rounded-3xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="admin-eyebrow">Sayfa editörü</p><h3 className="mt-2 text-xl font-semibold">{record ? "Sayfayı düzenle" : "Yeni sayfa"}</h3></div><button aria-label="Editörü kapat" className="admin-icon-button" onClick={onClose} type="button"><X className="size-5" /></button></div>
      <div className="mt-5 flex flex-wrap gap-2 border-b border-[var(--admin-border)]">{locales.map((item) => {
        const filled = Boolean(form.translations[item].title && form.translations[item].content);
        return <button className={locale === item ? "admin-tab admin-tab-active" : "admin-tab"} key={item} onClick={() => setLocale(item)} type="button">{item.toUpperCase()} {filled ? "✓" : ""}</button>;
      })}</div>
      <form action={action} className="mt-5 space-y-5">
        <input name="payload" type="hidden" value={JSON.stringify(form)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="admin-label">Başlık ({locale.toUpperCase()})</span><input autoFocus className="admin-input" dir={locale === "ar" ? "rtl" : "ltr"} onChange={(event) => updateTitle(event.target.value)} value={translation.title} /></label>
          <label><span className="admin-label">URL kısalığı</span><input className="admin-input disabled:cursor-not-allowed disabled:opacity-60" disabled={record?.isSystemPage} onChange={(event) => { setSlugDirty(true); setForm({ ...form, slug: event.target.value }); }} value={form.slug} /></label>
          <label className="sm:col-span-2"><span className="admin-label">İçerik ({locale.toUpperCase()})</span><textarea className="admin-input min-h-72 resize-y leading-7" dir={locale === "ar" ? "rtl" : "ltr"} onChange={(event) => updateTranslation({ content: event.target.value })} placeholder="Paragrafları boş satırla ayırabilirsiniz." value={translation.content} /></label>
          <label className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 text-sm font-semibold sm:col-span-2"><input checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} type="checkbox" />Sayfayı yayınla</label>
        </div>
        {state.message ? <p aria-live="polite" className={state.success ? "admin-toast text-sm text-[var(--admin-primary-strong)]" : "admin-toast text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}
        <div className="flex flex-wrap justify-end gap-2"><button className="admin-secondary-button" onClick={onClose} type="button">Vazgeç</button><SubmitButton editing={Boolean(record)} /></div>
      </form>
    </div>
  </div>;
}

function DeletePageButton({ record }: { record: PageAdminRecord }) {
  const router = useRouter();
  const [state, action] = useActionState(deletePage, initialState);
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action} className="flex items-center gap-2" onSubmit={(event) => { if (!window.confirm(`“${record.translations.tr.title}” sayfası silinsin mi?`)) event.preventDefault(); }}>
    <input name="id" type="hidden" value={record.id || ""} />
    <button aria-label="Sayfayı sil" className="admin-danger-button" type="submit"><Trash2 className="size-4" />Sil</button>
    {state.message && !state.success ? <span className="text-xs text-[var(--admin-danger)]">{state.message}</span> : null}
  </form>;
}

export function PagesManager({ records }: { records: PageAdminRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [editor, setEditor] = useState<PageAdminRecord | null | "new">(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return records.filter((record) => {
      if (status === "published" && !record.published) return false;
      if (status === "draft" && record.published) return false;
      return !needle || record.slug.includes(needle) || Object.values(record.translations).some((item) => `${item.title} ${item.content}`.toLocaleLowerCase("tr-TR").includes(needle));
    });
  }, [query, records, status]);
  const completed = records.filter((record) => locales.every((locale) => record.translations[locale].title && record.translations[locale].content)).length;

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="admin-metric"><p className="admin-eyebrow">Toplam sayfa</p><p className="mt-3 text-3xl font-semibold">{records.length}</p></div>
      <div className="admin-metric"><p className="admin-eyebrow">Yayında</p><p className="mt-3 text-3xl font-semibold">{records.filter((item) => item.published).length}</p></div>
      <div className="admin-metric"><p className="admin-eyebrow">Üç dil tamam</p><p className="mt-3 text-3xl font-semibold">{completed}</p></div>
    </div>
    <div className="admin-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--admin-muted)]" /><input className="admin-input pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Başlık, içerik veya slug ara" value={query} /></label><select className="admin-input" onChange={(event) => setStatus(event.target.value as typeof status)} value={status}><option value="all">Tüm durumlar</option><option value="published">Yayında</option><option value="draft">Taslak</option></select></div>
      <button className="admin-action-button sm:w-auto" onClick={() => setEditor("new")} type="button"><Plus className="size-4" />Yeni sayfa</button>
    </div>
    {filtered.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((record) => {
      const localeCount = locales.filter((locale) => record.translations[locale].title && record.translations[locale].content).length;
      return <article className="admin-card flex min-h-64 flex-col" key={record.id || `system-${record.slug}`}>
        <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap gap-2"><span className={record.published ? "admin-status admin-status-success" : "admin-status admin-status-neutral"}>{record.published ? "Yayında" : "Taslak"}</span>{record.isSystemPage ? <span className="admin-status admin-status-neutral">Sistem sayfası</span> : null}</div><FileText className="size-5 text-[var(--admin-primary)]" /></div>
        <h3 className="mt-4 text-lg font-semibold">{record.translations.tr.title || "Başlıksız sayfa"}</h3><p className="mt-1 font-mono text-xs text-[var(--admin-muted)]">{record.publicPath}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--admin-muted)]"><Languages className="size-4" />{localeCount}/3 dil tamamlandı</div>
        <p className="mt-2 text-xs text-[var(--admin-muted)]">{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString("tr-TR") : "Tarih bilinmiyor"}</p>
        <div className="mt-auto flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4"><button className="admin-secondary-button" onClick={() => setEditor(record)} type="button"><Pencil className="size-4" />Düzenle</button>{record.published ? <Link className="admin-secondary-button" href={record.publicPath} target="_blank"><ExternalLink className="size-4" />Görüntüle</Link> : null}{!record.isSystemPage && record.id ? <DeletePageButton record={record} /> : null}</div>
      </article>;
    })}</section> : <div className="admin-card py-14 text-center"><FileText className="mx-auto size-8 text-[var(--admin-muted)]" /><p className="mt-3 font-semibold">Eşleşen sayfa bulunamadı</p><p className="mt-1 text-sm text-[var(--admin-muted)]">Filtreleri temizleyin veya yeni bir sayfa oluşturun.</p></div>}
    {editor ? <PageEditor key={editor === "new" ? "new" : editor.id || `system-${editor.slug}`} onClose={() => setEditor(null)} record={editor === "new" ? undefined : editor} /> : null}
  </div>;
}
