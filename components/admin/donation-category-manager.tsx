"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Languages, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";

import { deleteDonationCategoryWithTransfer, saveDonationCategory, type EditorialActionState } from "@/lib/admin/editorial-actions";
import type { DonationCategoryAdminRecord } from "@/lib/admin/editorial-data";
import { slugifyEditorial } from "@/lib/editorial";

const initialState: EditorialActionState = { success: false, message: null };
const locales = [{ id: "tr", label: "Türkçe" }, { id: "en", label: "English" }, { id: "ar", label: "العربية" }] as const;

function SubmitButton({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={danger ? "admin-danger-button" : "admin-action-button"} disabled={pending} type="submit">{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{children}</button>;
}

function CategoryEditor({ record, onClose }: { record?: DonationCategoryAdminRecord; onClose(): void }) {
  const router = useRouter();
  const [state, action] = useActionState(saveDonationCategory, initialState);
  const [locale, setLocale] = useState<"tr" | "en" | "ar">("tr");
  const [slugDirty, setSlugDirty] = useState(Boolean(record));
  const [form, setForm] = useState(() => ({
    id: record?.id,
    slug: record?.slug || "",
    icon: record?.icon || "category",
    color: record?.color || "#0e5a3a",
    sortOrder: record?.sortOrder || 0,
    isActive: record?.isActive ?? true,
    names: record?.names || { tr: "", en: "", ar: "" },
    descriptions: record?.descriptions || { tr: "", en: "", ar: "" },
  }));
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);

  function setTranslation(field: "names" | "descriptions", value: string) {
    setForm((current) => {
      const next = { ...current, [field]: { ...current[field], [locale]: value } };
      if (field === "names" && locale === "tr" && !slugDirty) next.slug = slugifyEditorial(value);
      return next;
    });
  }

  return <div aria-modal="true" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog">
    <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--admin-surface-raised)] p-5 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="admin-eyebrow">Bağış kategorisi</p><h3 className="mt-2 text-xl font-semibold text-[var(--admin-text)]">{record ? "Kategoriyi düzenle" : "Yeni kategori"}</h3></div><button aria-label="Kapat" className="admin-icon-button" onClick={onClose} type="button"><X className="size-5" /></button></div>
      <div className="mt-6 flex gap-2 border-b border-[var(--admin-border)] pb-3">{locales.map((item) => <button className={locale === item.id ? "admin-tab admin-tab-active" : "admin-tab"} key={item.id} onClick={() => setLocale(item.id)} type="button">{item.label}</button>)}</div>
      <form action={action} className="mt-5 space-y-5">
        <input name="payload" type="hidden" value={JSON.stringify(form)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="admin-label">Kategori adı ({locale.toUpperCase()})</span><input className="admin-input" onChange={(event) => setTranslation("names", event.target.value)} required value={form.names[locale]} /></label>
          <label><span className="admin-label">URL kısalığı</span><input className="admin-input" onChange={(event) => { setSlugDirty(true); setForm({ ...form, slug: event.target.value }); }} required value={form.slug} /></label>
          <label className="sm:col-span-2"><span className="admin-label">Açıklama ({locale.toUpperCase()})</span><textarea className="admin-input min-h-24" onChange={(event) => setTranslation("descriptions", event.target.value)} value={form.descriptions[locale]} /></label>
          <label><span className="admin-label">Material Symbols simgesi</span><input className="admin-input" onChange={(event) => setForm({ ...form, icon: event.target.value })} value={form.icon} /></label>
          <label><span className="admin-label">Renk</span><div className="flex gap-2"><input className="h-11 w-14 rounded-lg border border-[var(--admin-border)]" onChange={(event) => setForm({ ...form, color: event.target.value })} type="color" value={form.color} /><input className="admin-input" onChange={(event) => setForm({ ...form, color: event.target.value })} value={form.color} /></div></label>
          <label><span className="admin-label">Sıralama</span><input className="admin-input" min="0" onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} type="number" value={form.sortOrder} /></label>
          <label className="flex items-center gap-3 self-end rounded-lg border border-[var(--admin-border)] px-3 py-3 text-sm font-medium"><input checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} type="checkbox" />Aktif kategori</label>
        </div>
        {state.message ? <p className={state.success ? "text-sm text-[var(--admin-primary)]" : "text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}
        <div className="flex justify-end gap-2"><button className="admin-secondary-button" onClick={onClose} type="button">Vazgeç</button><SubmitButton>Kaydet</SubmitButton></div>
      </form>
    </div>
  </div>;
}

function DeleteCategory({ category, choices }: { category: DonationCategoryAdminRecord; choices: DonationCategoryAdminRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(deleteDonationCategoryWithTransfer, initialState);
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <>
    <button className="admin-danger-button" onClick={() => setOpen(true)} type="button"><Trash2 className="size-4" />Sil</button>
    {open ? <div aria-modal="true" className="fixed inset-0 z-[110] grid place-items-center bg-black/55 p-4" role="dialog"><form action={action} className="w-full max-w-md rounded-2xl bg-[var(--admin-surface-raised)] p-6 shadow-2xl"><h3 className="text-lg font-semibold">{category.names.tr} silinsin mi?</h3><p className="mt-2 text-sm text-[var(--admin-muted)]">{category.usageCount ? `${category.usageCount} bağlı bağış alanı için hedef kategori seçmelisiniz.` : "Bu kategoriye bağlı bağış alanı bulunmuyor."}</p><input name="sourceId" type="hidden" value={category.id} />{category.usageCount ? <label className="mt-4 block"><span className="admin-label">Hedef kategori</span><select className="admin-input" name="targetId" required defaultValue=""><option disabled value="">Kategori seçin</option>{choices.filter((item) => item.id !== category.id && item.isActive).map((item) => <option key={item.id} value={item.id}>{item.names.tr}</option>)}</select></label> : null}{state.message ? <p className={state.success ? "mt-3 text-sm text-[var(--admin-primary)]" : "mt-3 text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}<div className="mt-6 flex justify-end gap-2"><button className="admin-secondary-button" onClick={() => setOpen(false)} type="button">{state.success ? "Kapat" : "Vazgeç"}</button>{!state.success ? <SubmitButton danger>{category.usageCount ? "Taşı ve sil" : "Sil"}</SubmitButton> : null}</div></form></div> : null}
  </>;
}

export function DonationCategoryManager({ categories }: { categories: DonationCategoryAdminRecord[] }) {
  const [editing, setEditing] = useState<DonationCategoryAdminRecord | null | undefined>(undefined);
  const ordered = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.names.tr.localeCompare(b.names.tr, "tr")), [categories]);
  return <>
    <div className="flex justify-end"><button className="admin-action-button" onClick={() => setEditing(null)} type="button"><Plus className="size-4" />Yeni kategori</button></div>
    {ordered.length ? <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{ordered.map((category) => <article className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-5 shadow-sm" key={category.id}>
      <div className="flex items-start justify-between gap-3"><span className="grid size-12 place-items-center rounded-xl text-white" style={{ backgroundColor: category.color }}><span className="material-symbols-outlined">{category.icon || "category"}</span></span><span className={category.isActive ? "admin-status admin-status-success" : "admin-status admin-status-neutral"}>{category.isActive ? "Aktif" : "Pasif"}</span></div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--admin-text)]">{category.names.tr}</h3><p className="mt-1 font-mono text-xs text-[var(--admin-muted)]">/{category.slug}</p><p className="mt-3 line-clamp-2 min-h-10 text-sm text-[var(--admin-muted)]">{category.descriptions.tr || "Açıklama eklenmemiş."}</p>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--admin-surface)] px-3 py-2 text-xs text-[var(--admin-muted)]"><span>{category.usageCount} bağış alanı</span><span>Sıra {category.sortOrder}</span></div>
      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--admin-muted)]"><Languages className="size-4" />{locales.map((item) => <span className={category.names[item.id] ? "text-[var(--admin-primary)]" : "text-[var(--admin-danger)]"} key={item.id}>{item.id.toUpperCase()}</span>)}</div>
      <div className="mt-5 flex gap-2 border-t border-[var(--admin-border)] pt-4"><button className="admin-secondary-button" onClick={() => setEditing(category)} type="button"><Pencil className="size-4" />Düzenle</button><DeleteCategory category={category} choices={categories} /></div>
    </article>)}</section> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-[var(--admin-muted)]">Henüz bağış kategorisi yok.</p>}
    {editing !== undefined ? <CategoryEditor onClose={() => setEditing(undefined)} record={editing || undefined} /> : null}
  </>;
}
