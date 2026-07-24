"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Archive, BarChart3, ChevronDown, ChevronUp, Eye, FileText, Languages, LoaderCircle, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";

import { deleteNewsCategory, deleteNewsPost, saveNewsCategory, saveNewsPost, type EditorialActionState } from "@/lib/admin/editorial-actions";
import type { CampaignOption, NewsAdminRecord, NewsCategoryAdminRecord } from "@/lib/admin/editorial-data";
import { slugifyEditorial, type NewsBlock } from "@/lib/editorial";

const initialState: EditorialActionState = { success: false, message: null };
const locales = ["tr", "en", "ar"] as const;
type Locale = (typeof locales)[number];
type Translation = NewsAdminRecord["translations"][Locale];
const localeLabels: Record<Locale, string> = { tr: "Türkçe", en: "İngilizce", ar: "Arapça" };

function Submit({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={danger ? "admin-danger-button" : "admin-action-button"} disabled={pending} type="submit">{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{children}</button>;
}

function emptyTranslation(): Translation {
  return { title: "", excerpt: "", coverImageAlt: "", metaTitle: "", metaDescription: "", tags: [], blocks: [] };
}

function newBlock(type: NewsBlock["type"]): NewsBlock {
  const id = crypto.randomUUID();
  if (type === "heading") return { id, type, level: 2, text: "" };
  if (type === "paragraph") return { id, type, text: "" };
  if (type === "list") return { id, type, ordered: false, items: [] };
  if (type === "quote") return { id, type, text: "", cite: "" };
  if (type === "image") return { id, type, src: "", alt: "", caption: "" };
  if (type === "campaign") return { id, type, campaignId: 0, label: "", note: "" };
  if (type === "cta") return { id, type, href: "", label: "", text: "" };
  return { id, type: "divider" };
}

function BlockFields({ block, locale, campaigns, onChange }: { block: NewsBlock; locale: Locale; campaigns: CampaignOption[]; onChange(block: NewsBlock): void }) {
  if (block.type === "divider") return <p className="text-xs text-[var(--admin-muted)]">İçerikte yatay bir ayırıcı gösterir.</p>;
  if (block.type === "heading") return <div className="grid gap-3 sm:grid-cols-[120px_1fr]"><select className="admin-input" onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 | 4 })} value={block.level}><option value="2">H2</option><option value="3">H3</option><option value="4">H4</option></select><input className="admin-input" onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Başlık" value={block.text} /></div>;
  if (block.type === "paragraph") return <textarea className="admin-input min-h-28" onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Paragraf" value={block.text} />;
  if (block.type === "list") return <div className="space-y-3"><label className="flex items-center gap-2 text-xs"><input checked={block.ordered} onChange={(e) => onChange({ ...block, ordered: e.target.checked })} type="checkbox" />Sıralı liste</label><textarea className="admin-input min-h-24" onChange={(e) => onChange({ ...block, items: e.target.value.split("\n") })} placeholder="Her satıra bir madde" value={block.items.join("\n")} /></div>;
  if (block.type === "quote") return <div className="grid gap-3"><textarea className="admin-input min-h-20" onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Alıntı" value={block.text} /><input className="admin-input" onChange={(e) => onChange({ ...block, cite: e.target.value })} placeholder="Kaynak / imza" value={block.cite} /></div>;
  if (block.type === "image") return <div className="grid gap-3 sm:grid-cols-2"><input accept="image/jpeg,image/png,image/webp" className="admin-input sm:col-span-2" name={`block-image-${locale}-${block.id}`} type="file" /><input className="admin-input sm:col-span-2" onChange={(e) => onChange({ ...block, src: e.target.value })} placeholder="Mevcut görsel URL'si veya yeni dosya yükleyin" value={block.src} /><input className="admin-input" onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Alt metin" value={block.alt} /><input className="admin-input" onChange={(e) => onChange({ ...block, caption: e.target.value })} placeholder="Açıklama" value={block.caption} /></div>;
  if (block.type === "campaign") return <div className="grid gap-3"><select className="admin-input" onChange={(e) => onChange({ ...block, campaignId: Number(e.target.value) })} value={block.campaignId || ""}><option value="">Aktif bağış alanı seçin</option>{campaigns.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input className="admin-input" onChange={(e) => onChange({ ...block, label: e.target.value })} placeholder="Kart başlığı" value={block.label} /><textarea className="admin-input" onChange={(e) => onChange({ ...block, note: e.target.value })} placeholder="Kısa not" value={block.note} /></div>;
  return <div className="grid gap-3"><input className="admin-input" onChange={(e) => onChange({ ...block, label: e.target.value })} placeholder="Buton metni" value={block.label} /><input className="admin-input" onChange={(e) => onChange({ ...block, href: e.target.value })} placeholder="/bagis veya https://..." value={block.href} /><textarea className="admin-input" onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Açıklama" value={block.text} /></div>;
}

function NewsEditor({ record, categories, campaigns, onClose }: { record?: NewsAdminRecord; categories: NewsCategoryAdminRecord[]; campaigns: CampaignOption[]; onClose(): void }) {
  const router = useRouter();
  const [state, action] = useActionState(saveNewsPost, initialState);
  const [step, setStep] = useState<"languages" | "basic" | "content" | "seo">("languages");
  const [locale, setLocale] = useState<Locale>(record?.availableLocales[0] || "tr");
  const [blockType, setBlockType] = useState<NewsBlock["type"]>("paragraph");
  const [slugDirty, setSlugDirty] = useState(Boolean(record));
  const [form, setForm] = useState(() => ({
    id: record?.id,
    slug: record?.slug || "",
    categoryId: record?.categoryId || "",
    status: record?.status || "draft" as const,
    featured: record?.featured || false,
    sortOrder: record?.sortOrder || 0,
    relatedCampaignIds: record?.relatedCampaignIds || [],
    availableLocales: record?.availableLocales ?? ([] as Locale[]),
    translations: record?.translations || { tr: emptyTranslation(), en: emptyTranslation(), ar: emptyTranslation() },
  }));
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  const translation = form.translations[locale];
  const updateTranslation = (patch: Partial<Translation>) => setForm((current) => ({ ...current, translations: { ...current.translations, [locale]: { ...current.translations[locale], ...patch } } }));
  const updateBlock = (index: number, block: NewsBlock) => updateTranslation({ blocks: translation.blocks.map((item, itemIndex) => itemIndex === index ? block : item) });
  const moveBlock = (index: number, delta: number) => { const next = [...translation.blocks]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; updateTranslation({ blocks: next }); };

  function updateTitle(value: string) {
    const patch: Partial<Translation> = { title: value };
    if (!translation.metaTitle || translation.metaTitle === translation.title) patch.metaTitle = value;
    updateTranslation(patch);
    if (locale === form.availableLocales[0] && !slugDirty) setForm((current) => ({ ...current, slug: slugifyEditorial(value), translations: { ...current.translations, [locale]: { ...current.translations[locale], ...patch } } }));
  }

  function toggleLocale(item: Locale) {
    const selected = form.availableLocales.includes(item);
    const availableLocales = selected ? form.availableLocales.filter((value) => value !== item) : [...form.availableLocales, item];
    setForm({ ...form, availableLocales });
    if (!selected && availableLocales.length === 1) setLocale(item);
    if (selected && locale === item) setLocale(availableLocales[0] || "tr");
  }

  return <div aria-modal="true" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-5" role="dialog"><div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--admin-surface-raised)] p-5 shadow-2xl sm:max-w-5xl sm:rounded-3xl sm:p-7">
    <div className="flex justify-between gap-4"><div><p className="admin-eyebrow">Haber editörü</p><h3 className="mt-2 text-xl font-semibold">{record ? "Haberi düzenle" : "Yeni haber"}</h3></div><button aria-label="Kapat" className="admin-icon-button" onClick={onClose} type="button"><X className="size-5" /></button></div>
    <div className="mt-5 grid grid-cols-4 rounded-xl bg-[var(--admin-surface)] p-1">{([['languages','1. Diller'],['basic','2. Temel'],['content','3. İçerik'],['seo','4. SEO']] as const).map(([id,label]) => <button className={step === id ? "rounded-lg bg-[var(--admin-surface-raised)] px-2 py-2 text-xs font-bold text-[var(--admin-primary)] shadow-sm sm:px-3 sm:text-sm" : "px-2 py-2 text-xs font-semibold text-[var(--admin-muted)] sm:px-3 sm:text-sm"} disabled={id !== "languages" && !form.availableLocales.length} key={id} onClick={() => setStep(id)} type="button">{label}</button>)}</div>
    {step !== "languages" ? <div className="mt-4 flex flex-wrap gap-2">{form.availableLocales.map((item) => <button className={locale === item ? "admin-tab admin-tab-active" : "admin-tab"} key={item} onClick={() => setLocale(item)} type="button">{item.toUpperCase()}</button>)}</div> : null}
    <form action={action} className="mt-5"><input name="payload" type="hidden" value={JSON.stringify(form)} />
      {step === "languages" ? <div><div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5"><p className="text-sm font-semibold">Haber hangi dillerde yayınlanacak?</p><p className="mt-1 text-sm leading-6 text-[var(--admin-muted)]">En az bir dil seçin. İlk seçtiğiniz dil ana dil olur ve URL kısalığı bu dildeki başlıktan oluşturulur.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{locales.map((item) => { const selected = form.availableLocales.includes(item); return <button aria-pressed={selected} className={selected ? "rounded-2xl border border-[var(--admin-primary)] bg-[var(--admin-shell-surface)] p-5 text-left shadow-sm" : "rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-5 text-left transition hover:border-[var(--admin-primary)]"} key={item} onClick={() => toggleLocale(item)} type="button"><span className="flex items-center justify-between gap-3"><strong>{localeLabels[item]}</strong><span className={selected ? "grid size-6 place-items-center rounded-full bg-[var(--admin-primary-strong)] text-xs text-white" : "grid size-6 place-items-center rounded-full border border-[var(--admin-border)] text-xs"}>{selected ? "✓" : item.toUpperCase()}</span></span><span className="mt-2 block text-xs text-[var(--admin-muted)]">{selected ? "Yayına dahil" : "Seçmek için tıklayın"}</span></button>; })}</div></div>{!form.availableLocales.length ? <p className="mt-3 text-sm text-[var(--admin-danger)]">Devam etmek için en az bir dil seçin.</p> : null}</div> : null}
      {step === "basic" ? <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="admin-label">Başlık ({locale.toUpperCase()})</span><input className="admin-input" onChange={(e) => updateTitle(e.target.value)} value={translation.title} /></label>
        <label><span className="admin-label">URL kısalığı</span><input className="admin-input" onChange={(e) => { setSlugDirty(true); setForm({ ...form, slug: e.target.value }); }} value={form.slug} /></label>
        <label className="sm:col-span-2"><span className="admin-label">Kısa açıklama ({locale.toUpperCase()})</span><textarea className="admin-input min-h-24" onChange={(e) => { const value = e.target.value; updateTranslation({ excerpt: value, metaDescription: !translation.metaDescription || translation.metaDescription === translation.excerpt ? value : translation.metaDescription }); }} value={translation.excerpt} /></label>
        <label><span className="admin-label">Haber kategorisi</span><select className="admin-input" onChange={(e) => setForm({ ...form, categoryId: e.target.value })} value={form.categoryId}><option value="">Kategori seçin</option>{categories.filter((item) => item.isActive || item.id === form.categoryId).map((item) => <option key={item.id} value={item.id}>{item.names.tr}</option>)}</select></label>
        <label><span className="admin-label">Durum</span><select className="admin-input" onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} value={form.status}><option value="draft">Taslak</option><option value="published">Yayında</option><option value="archived">Arşiv</option></select></label>
        <label><span className="admin-label">Kapak görseli</span><input accept="image/jpeg,image/png,image/webp" className="admin-input" name="coverImage" type="file" /></label>
        <label><span className="admin-label">Kapak alt metni ({locale.toUpperCase()})</span><input className="admin-input" onChange={(e) => updateTranslation({ coverImageAlt: e.target.value })} value={translation.coverImageAlt} /></label>
        {record?.coverImageUrl ? <div className="relative aspect-video overflow-hidden rounded-xl sm:col-span-2"><Image alt={translation.coverImageAlt || record.translations[record.availableLocales[0] || "tr"].title} className="object-cover" fill sizes="700px" src={record.coverImageUrl} /></div> : null}
        <label><span className="admin-label">Sıralama</span><input className="admin-input" onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} type="number" value={form.sortOrder} /></label><label className="flex items-center gap-3 self-end rounded-lg border border-[var(--admin-border)] px-3 py-3 text-sm font-medium"><input checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} type="checkbox" />Öne çıkan haber</label>
      </div> : null}
      {step === "content" ? <div className="space-y-4">
        {translation.blocks.map((block, index) => <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4" key={block.id}><div className="mb-3 flex items-center justify-between gap-3"><strong className="text-xs uppercase tracking-wide">{block.type}</strong><div className="flex gap-1"><button aria-label="Yukarı taşı" className="admin-icon-button" onClick={() => moveBlock(index, -1)} type="button"><ChevronUp className="size-4" /></button><button aria-label="Aşağı taşı" className="admin-icon-button" onClick={() => moveBlock(index, 1)} type="button"><ChevronDown className="size-4" /></button><button aria-label="Bloğu sil" className="admin-icon-button text-[var(--admin-danger)]" onClick={() => updateTranslation({ blocks: translation.blocks.filter((_, itemIndex) => itemIndex !== index) })} type="button"><Trash2 className="size-4" /></button></div></div><BlockFields block={block} campaigns={campaigns} locale={locale} onChange={(next) => updateBlock(index, next)} /></section>)}
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[var(--admin-border)] p-4 sm:flex-row"><select className="admin-input" onChange={(e) => setBlockType(e.target.value as NewsBlock["type"])} value={blockType}><option value="paragraph">Paragraf</option><option value="heading">Başlık</option><option value="list">Liste</option><option value="quote">Alıntı</option><option value="image">Görsel</option><option value="campaign">Bağış kartı</option><option value="cta">Çağrı kutusu</option><option value="divider">Ayırıcı</option></select><button className="admin-secondary-button shrink-0" onClick={() => updateTranslation({ blocks: [...translation.blocks, newBlock(blockType)] })} type="button"><Plus className="size-4" />Blok ekle</button></div>
      </div> : null}
      {step === "seo" ? <div className="grid gap-4 sm:grid-cols-2"><label><span className="admin-label">Meta başlık ({locale.toUpperCase()})</span><input className="admin-input" maxLength={70} onChange={(e) => updateTranslation({ metaTitle: e.target.value })} value={translation.metaTitle} /></label><label><span className="admin-label">Etiketler</span><input className="admin-input" onChange={(e) => updateTranslation({ tags: e.target.value.split(",") })} placeholder="yardım, proje, duyuru" value={translation.tags.join(", ")} /></label><label className="sm:col-span-2"><span className="admin-label">Meta açıklama ({locale.toUpperCase()})</span><textarea className="admin-input min-h-24" maxLength={180} onChange={(e) => updateTranslation({ metaDescription: e.target.value })} value={translation.metaDescription} /></label><fieldset className="sm:col-span-2"><legend className="admin-label">İlgili bağış alanları</legend><div className="grid gap-2 sm:grid-cols-2">{campaigns.filter((item) => item.isActive).map((campaign) => <label className="flex items-center gap-3 rounded-lg border border-[var(--admin-border)] p-3 text-sm" key={campaign.id}><input checked={form.relatedCampaignIds.includes(campaign.id)} onChange={(e) => setForm({ ...form, relatedCampaignIds: e.target.checked ? [...form.relatedCampaignIds, campaign.id] : form.relatedCampaignIds.filter((id) => id !== campaign.id) })} type="checkbox" />{campaign.title}</label>)}</div></fieldset></div> : null}
      {state.message ? <p className={state.success ? "mt-5 text-sm text-[var(--admin-primary)]" : "mt-5 text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}
      <div className="mt-6 flex flex-wrap justify-between gap-2"><button className="admin-secondary-button" onClick={onClose} type="button">Vazgeç</button><div className="flex gap-2">{step !== "languages" ? <button className="admin-secondary-button" onClick={() => setStep(step === "seo" ? "content" : step === "content" ? "basic" : "languages")} type="button">Geri</button> : null}{step !== "seo" ? <button className="admin-action-button" disabled={step === "languages" && !form.availableLocales.length} onClick={() => setStep(step === "languages" ? "basic" : step === "basic" ? "content" : "seo")} type="button">Devam</button> : <Submit>Haberi kaydet</Submit>}</div></div>
    </form>
  </div></div>;
}

function DeletePost({ id }: { id: string }) {
  const router = useRouter(); const [state, action] = useActionState(deleteNewsPost, initialState); useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <form action={action}><input name="id" type="hidden" value={id} /><Submit danger><Trash2 className="size-4" />Sil</Submit>{state.message && !state.success ? <p className="mt-1 text-xs text-[var(--admin-danger)]">{state.message}</p> : null}</form>;
}

function NewsCategoryEditor({ record, onClose }: { record?: NewsCategoryAdminRecord; onClose(): void }) {
  const router = useRouter(); const [state, action] = useActionState(saveNewsCategory, initialState); const [locale, setLocale] = useState<Locale>("tr"); const [dirty, setDirty] = useState(Boolean(record));
  const [form, setForm] = useState(() => ({ id: record?.id, slug: record?.slug || "", sortOrder: record?.sortOrder || 0, isActive: record?.isActive ?? true, names: record?.names || { tr: "", en: "", ar: "" }, descriptions: record?.descriptions || { tr: "", en: "", ar: "" } }));
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <div className="fixed inset-0 z-[105] grid place-items-center bg-black/60 p-4"><div className="w-full max-w-2xl rounded-2xl bg-[var(--admin-surface-raised)] p-6"><div className="flex justify-between"><h3 className="text-lg font-semibold">Haber kategorisi</h3><button className="admin-icon-button" onClick={onClose} type="button"><X className="size-5" /></button></div><div className="mt-4 flex gap-2">{locales.map((item) => <button className={item === locale ? "admin-tab admin-tab-active" : "admin-tab"} key={item} onClick={() => setLocale(item)} type="button">{item.toUpperCase()}</button>)}</div><form action={action} className="mt-4 grid gap-4 sm:grid-cols-2"><input name="payload" type="hidden" value={JSON.stringify(form)} /><label><span className="admin-label">Ad</span><input className="admin-input" onChange={(e) => { const names = { ...form.names, [locale]: e.target.value }; setForm({ ...form, names, slug: locale === "tr" && !dirty ? slugifyEditorial(e.target.value) : form.slug }); }} value={form.names[locale]} /></label><label><span className="admin-label">Slug</span><input className="admin-input" onChange={(e) => { setDirty(true); setForm({ ...form, slug: e.target.value }); }} value={form.slug} /></label><label className="sm:col-span-2"><span className="admin-label">Açıklama</span><textarea className="admin-input" onChange={(e) => setForm({ ...form, descriptions: { ...form.descriptions, [locale]: e.target.value } })} value={form.descriptions[locale]} /></label><label><span className="admin-label">Sıra</span><input className="admin-input" min="0" onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} type="number" value={form.sortOrder} /></label><label className="flex items-center gap-2 self-end rounded-lg border p-3 text-sm"><input checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} type="checkbox" />Aktif</label>{state.message ? <p className={state.success ? "sm:col-span-2 text-sm text-[var(--admin-primary)]" : "sm:col-span-2 text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}<div className="flex justify-end gap-2 sm:col-span-2"><button className="admin-secondary-button" onClick={onClose} type="button">Vazgeç</button><Submit>Kaydet</Submit></div></form></div></div>;
}

function DeleteNewsCategory({ category }: { category: NewsCategoryAdminRecord }) { const router = useRouter(); const [state, action] = useActionState(deleteNewsCategory, initialState); useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]); return <form action={action}><input name="id" type="hidden" value={category.id} /><Submit danger><Trash2 className="size-4" />Sil</Submit>{state.message && !state.success ? <p className="mt-1 text-xs text-[var(--admin-danger)]">{state.message}</p> : null}</form>; }

export function NewsManager({ news, categories, campaigns }: { news: NewsAdminRecord[]; categories: NewsCategoryAdminRecord[]; campaigns: CampaignOption[] }) {
  const [tab, setTab] = useState<"posts" | "categories">("posts"); const [query, setQuery] = useState(""); const [editing, setEditing] = useState<NewsAdminRecord | null | undefined>(undefined); const [categoryEditing, setCategoryEditing] = useState<NewsCategoryAdminRecord | null | undefined>(undefined);
  const filtered = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase("tr");
    return news.filter((post) => post.availableLocales.some((item) => post.translations[item].title.toLocaleLowerCase("tr").includes(normalizedQuery)));
  }, [news, query]);
  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[{label:"Toplam",value:news.length,icon:FileText},{label:"Yayında",value:news.filter((p)=>p.status==="published").length,icon:Eye},{label:"Taslak",value:news.filter((p)=>p.status==="draft").length,icon:Archive},{label:"Kategori",value:categories.length,icon:Languages},{label:"Görüntülenme",value:news.reduce((sum,p)=>sum+p.viewCount,0),icon:BarChart3}].map((metric)=><div className="admin-metric" key={metric.label}><metric.icon className="size-5 text-[var(--admin-primary)]"/><p className="mt-3 text-2xl font-semibold">{metric.value}</p><p className="text-xs text-[var(--admin-muted)]">{metric.label}</p></div>)}</section>
    <div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="flex gap-2"><button className={tab === "posts" ? "admin-tab admin-tab-active" : "admin-tab"} onClick={() => setTab("posts")} type="button">Haberler</button><button className={tab === "categories" ? "admin-tab admin-tab-active" : "admin-tab"} onClick={() => setTab("categories")} type="button">Haber kategorileri</button></div><button className="admin-action-button" onClick={() => tab === "posts" ? setEditing(null) : setCategoryEditing(null)} type="button"><Plus className="size-4" />{tab === "posts" ? "Yeni haber" : "Yeni kategori"}</button></div>
    {tab === "posts" ? <><label className="relative block max-w-md"><Search className="absolute left-3 top-3 size-4 text-[var(--admin-muted)]"/><input className="admin-input pl-10" onChange={(e)=>setQuery(e.target.value)} placeholder="Haberlerde ara" value={query}/></label><section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((post) => { const primaryLocale = post.availableLocales[0] || "tr"; const primary = post.translations[primaryLocale]; return <article className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] shadow-sm" key={post.id}>{post.coverImageUrl?<div className="relative h-44"><Image alt={primary.coverImageAlt || primary.title} className="object-cover" fill sizes="400px" src={post.coverImageUrl}/></div>:<div className="grid h-44 place-items-center bg-[var(--admin-surface)] text-sm text-[var(--admin-muted)]">Kapak görseli yok</div>}<div className="p-5"><div className="flex flex-wrap gap-2"><span className={`admin-status ${post.status === "published" ? "admin-status-success" : post.status === "archived" ? "admin-status-danger" : "admin-status-neutral"}`}>{post.status === "published" ? "Yayında" : post.status === "archived" ? "Arşiv" : "Taslak"}</span>{post.featured?<span className="admin-status admin-status-warning"><Star className="size-3"/>Öne çıkan</span>:null}{post.availableLocales.map((item) => <span className="admin-status admin-status-neutral" key={item}>{item.toUpperCase()}</span>)}</div><h3 className="mt-3 line-clamp-2 text-lg font-semibold">{primary.title || "Başlıksız taslak"}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm text-[var(--admin-muted)]">{primary.excerpt || "Özet eklenmemiş."}</p><div className="mt-4 flex justify-between text-xs text-[var(--admin-muted)]"><span>{post.viewCount} görüntülenme</span><span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("tr-TR") : "Yayınlanmadı"}</span></div><div className="mt-4 flex gap-2 border-t border-[var(--admin-border)] pt-4"><button className="admin-secondary-button" onClick={()=>setEditing(post)} type="button"><Pencil className="size-4"/>Düzenle</button><DeletePost id={post.id}/></div></div></article>; })}</section></> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{categories.map((category)=><article className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-5" key={category.id}><div className="flex justify-between"><span className={category.isActive?"admin-status admin-status-success":"admin-status admin-status-neutral"}>{category.isActive?"Aktif":"Pasif"}</span><span className="text-xs text-[var(--admin-muted)]">{category.postCount} haber</span></div><h3 className="mt-4 text-lg font-semibold">{category.names.tr}</h3><p className="mt-1 font-mono text-xs text-[var(--admin-muted)]">/{category.slug}</p><p className="mt-3 line-clamp-2 min-h-10 text-sm text-[var(--admin-muted)]">{category.descriptions.tr || "Açıklama yok."}</p><div className="mt-4 flex gap-2"><button className="admin-secondary-button" onClick={()=>setCategoryEditing(category)} type="button"><Pencil className="size-4"/>Düzenle</button><DeleteNewsCategory category={category}/></div></article>)}</section>}
    {editing !== undefined ? <NewsEditor campaigns={campaigns} categories={categories} onClose={()=>setEditing(undefined)} record={editing || undefined}/> : null}{categoryEditing !== undefined ? <NewsCategoryEditor onClose={()=>setCategoryEditing(undefined)} record={categoryEditing || undefined}/> : null}
  </div>;
}
