"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import type { AppLocale } from "@/lib/i18n";
import type { DonationArea } from "@/lib/public/donation-areas";
import { cn, formatCurrency } from "@/lib/utils";

type CategoryFilter = { id: string; label: string; icon: string };
type Props = { areas: DonationArea[]; categories: CategoryFilter[]; locale: AppLocale };

const labels = {
  tr: {
    add: "Bağış yap", cart: "Sepet özeti", cartDescription: "Ödeme adımında tek bağış alanı işlenir.", closed: "Bağış kapalı", detail: "Detayları incele", donor: "bağışçı", empty: "Sepetiniz henüz boş.", featured: "Öne çıkan bağış alanı", goal: "Hedef", heading: "Bağışınızı doğrudan ihtiyaç duyulan alana ulaştırın", paid: "Toplanan", payment: "Ödeme adımına geç", paymentDescription: "Ödeme işlemi güvenli ödeme altyapısı üzerinden tamamlanır.", remove: "Kaldır", subtitle: "Her bağış alanı, hedefi ve güncel ilerlemesiyle şeffaf biçimde burada yer alır.", total: "Toplam", trust: "Güvenli ve şeffaf süreç", trustItems: ["Bağışınız ilgili finansal havuza yönlendirilir.", "Ödeme ve makbuz süreci kayıt altında tutulur.", "Saha kanıtları operasyon ekibi tarafından takip edilir."], updatedCart: "Sepetteki önceki bağış alanı temizlendi.", all: "Tüm bağış alanları",
  },
  en: {
    add: "Donate now", cart: "Cart summary", cartDescription: "One donation area is processed per payment.", closed: "Donations closed", detail: "View details", donor: "donors", empty: "Your cart is empty.", featured: "Featured donation area", goal: "Goal", heading: "Send your donation directly where it is needed", paid: "Collected", payment: "Continue to payment", paymentDescription: "Your payment is completed through our secure payment provider.", remove: "Remove", subtitle: "Each donation area is shown transparently with its target and current progress.", total: "Total", trust: "A secure, transparent process", trustItems: ["Your donation is directed to the relevant financial pool.", "Payment and receipt records are kept securely.", "Field evidence is monitored by our operations team."], updatedCart: "The previous donation area was cleared from your cart.", all: "All donation areas",
  },
  ar: {
    add: "تبرع الآن", cart: "ملخص السلة", cartDescription: "تتم معالجة مجال تبرع واحد في كل عملية دفع.", closed: "التبرع مغلق", detail: "عرض التفاصيل", donor: "متبرع", empty: "سلتك فارغة حالياً.", featured: "مجال التبرع المميز", goal: "الهدف", heading: "وجّه تبرعك مباشرة إلى المجال المحتاج", paid: "المجموع", payment: "الانتقال إلى الدفع", paymentDescription: "يتم إتمام الدفع عبر مزود الدفع الآمن.", remove: "إزالة", subtitle: "يظهر كل مجال تبرع بشفافية مع هدفه وتقدمه الحالي.", total: "الإجمالي", trust: "عملية آمنة وشفافة", trustItems: ["يتم توجيه تبرعك إلى الحوض المالي المناسب.", "يتم حفظ سجلات الدفع والإيصال بأمان.", "يتابع فريق العمليات أدلة العمل الميداني."], updatedCart: "تم حذف مجال التبرع السابق من سلتك.", all: "جميع مجالات التبرع",
  },
} as const;

function CoverImage({ area, priority = false }: { area: DonationArea; priority?: boolean }) {
  if (!area.image) {
    return <div className="grid h-full min-h-56 place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(181,134,28,.26),transparent_42%),linear-gradient(135deg,rgba(14,90,58,.98),rgba(24,68,44,.86))] text-white"><span className="material-symbols-outlined text-5xl">volunteer_activism</span></div>;
  }

  return (
    <div className="relative h-full min-h-56 overflow-hidden bg-[linear-gradient(135deg,#eaf2ea_0%,#f7f0e4_100%)]">
      <Image alt={area.image.alt || area.title} className="object-contain p-3" fill priority={priority} sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" src={area.image.src} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] font-medium text-on-surface-variant/65">{label}</dt><dd className="mt-1 font-mono text-sm font-semibold text-on-surface">{value}</dd></div>;
}

function AreaCard({ area, locale, onDonate }: { area: DonationArea; locale: AppLocale; onDonate: (amount: number) => void }) {
  const text = labels[locale];
  const defaultAmount = area.suggestedAmounts[1] || area.suggestedAmounts[0] || 100;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-outline-variant/20 bg-white shadow-[0_8px_24px_rgba(28,42,30,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(28,42,30,.13)]">
      <div className="relative aspect-[4/3] overflow-hidden"><CoverImage area={area} />
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] gap-2">
          {area.category ? <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur"><span className="material-symbols-outlined text-[15px]">{area.category.icon || "volunteer_activism"}</span><span className="truncate">{area.category.name}</span></span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="line-clamp-2 text-xl font-semibold leading-snug text-on-surface">{area.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant/70">{area.excerpt}</p></div><span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">%{area.progress}</span></div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${area.progress}%` }} /></div>
        <dl className="mt-5 grid grid-cols-2 gap-4"><Stat label={text.paid} value={formatCurrency(area.collectedAmount, area.currency)} /><Stat label={text.goal} value={formatCurrency(area.targetAmount, area.currency)} /></dl>
        <p className="mt-3 text-xs text-on-surface-variant/65">{area.donorCount.toLocaleString(locale === "tr" ? "tr-TR" : locale === "en" ? "en-US" : "ar")} {text.donor}</p>
        <div className="mt-5 grid grid-cols-3 gap-2">{area.suggestedAmounts.slice(0, 3).map((amount) => <button className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-2 py-2 text-xs font-semibold text-on-surface transition hover:border-secondary hover:bg-secondary/10 hover:text-secondary" key={amount} onClick={() => onDonate(amount)} type="button">{formatCurrency(amount, area.currency)}</button>)}</div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-secondary/90 hover:shadow-lg" disabled={!area.isDonationOpen} onClick={() => onDonate(defaultAmount)} type="button"><span className="material-symbols-outlined text-[18px]">volunteer_activism</span>{area.isDonationOpen ? text.add : text.closed}</button><Link aria-label={`${area.title}: ${text.detail}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant/35 px-3 text-sm font-semibold text-on-surface transition hover:border-primary hover:text-primary" href={`/bagis/${area.slug}`}><span className="material-symbols-outlined text-[20px]">arrow_forward</span></Link></div>
      </div>
    </article>
  );
}

export function DonationAreasBrowser({ areas, categories, locale }: Props) {
  const text = labels[locale];
  const { items, addItem, clearCart, removeItem, totalAmount, updateTitles } = useCart();
  const { formatPrice } = useCurrency();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);
  const direction = locale === "ar" ? "rtl" : "ltr";
  const localizedCategories = categories.map((category) => category.id === "all" ? { ...category, label: text.all } : category);

  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(null), 4000); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => { updateTitles(Object.fromEntries(areas.map((area) => [area.id, area.title]))); }, [areas, updateTitles]);

  const filteredAreas = useMemo(() => selectedCategory === "all" ? areas : areas.filter((area) => area.category?.slug === selectedCategory), [areas, selectedCategory]);
  const featuredArea = filteredAreas[0] ?? areas[0] ?? null;

  function addDonation(area: DonationArea, amount: number) {
    if (!area.isDonationOpen) return;
    if (items.some((item) => item.campaignId !== area.id)) { clearCart(); setNotice(text.updatedCart); }
    addItem({ campaignId: area.id, currency: area.currency, title: area.title, amount, quantity: 1, image: area.image?.src, isRecurring: false });
  }

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(181,134,28,.12),transparent_30%),linear-gradient(180deg,#fffdf9_0%,#f4f7f0_100%)]" dir={direction}>
    <section className="mx-auto max-w-container-max px-margin-mobile pb-10 pt-12 md:px-margin-desktop md:pb-14 md:pt-20"><div className="max-w-3xl"><p className="text-label-sm font-semibold uppercase tracking-[.24em] text-secondary">{text.featured}</p><h1 className="mt-4 text-4xl font-semibold leading-[1.08] text-on-surface md:text-6xl">{text.heading}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-on-surface-variant/75">{text.subtitle}</p></div></section>
    <section className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop"><div className="flex gap-2 overflow-x-auto pb-2">{localizedCategories.map((category) => <button aria-pressed={selectedCategory === category.id} className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition", selectedCategory === category.id ? "border-primary bg-primary text-white shadow-md" : "border-outline-variant/25 bg-white/80 text-on-surface-variant hover:border-secondary hover:text-secondary")} key={category.id} onClick={() => setSelectedCategory(category.id)} type="button"><span className="material-symbols-outlined text-[18px]">{category.icon}</span>{category.label}</button>)}</div></section>
    <section className="mx-auto grid max-w-container-max gap-8 px-margin-mobile py-10 md:px-margin-desktop lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-8">
        {featuredArea ? <article className="overflow-hidden rounded-[32px] border border-outline-variant/20 bg-white shadow-[0_14px_36px_rgba(28,42,30,.1)]"><div className="grid lg:grid-cols-[1fr_.9fr]"><div className="order-2 p-6 lg:order-1 lg:p-9"><p className="text-label-sm font-semibold uppercase tracking-[.22em] text-secondary">{text.featured}</p><h2 className="mt-4 text-3xl font-semibold text-on-surface">{featuredArea.title}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-on-surface-variant/75">{featuredArea.description}</p><dl className="mt-7 grid grid-cols-3 gap-4"><Stat label={text.paid} value={formatCurrency(featuredArea.collectedAmount, featuredArea.currency)} /><Stat label={text.goal} value={formatCurrency(featuredArea.targetAmount, featuredArea.currency)} /><Stat label={text.donor} value={featuredArea.donorCount.toLocaleString(locale === "tr" ? "tr-TR" : locale === "en" ? "en-US" : "ar")} /></dl><div className="mt-7 flex flex-wrap gap-2">{featuredArea.suggestedAmounts.slice(0, 3).map((amount) => <button className="rounded-full border border-outline-variant/35 bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-secondary hover:text-secondary" key={amount} onClick={() => addDonation(featuredArea, amount)} type="button">{formatCurrency(amount, featuredArea.currency)}</button>)}</div><div className="mt-7 flex flex-wrap gap-3"><button className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg" onClick={() => addDonation(featuredArea, featuredArea.suggestedAmounts[1] || featuredArea.suggestedAmounts[0] || 100)} type="button"><span className="material-symbols-outlined text-[19px]">volunteer_activism</span>{text.add}</button><Link className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-outline-variant/35 px-5 text-sm font-semibold text-on-surface transition hover:border-primary hover:text-primary" href={`/bagis/${featuredArea.slug}`}>{text.detail}<span className="material-symbols-outlined text-[18px]">arrow_forward</span></Link></div></div><div className="order-1 min-h-[280px] lg:order-2"><CoverImage area={featuredArea} priority /></div></div></article> : null}
        {filteredAreas.length > 1 ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{filteredAreas.slice(1).map((area) => <AreaCard area={area} key={area.id} locale={locale} onDonate={(amount) => addDonation(area, amount)} />)}</div> : null}
      </div>
      <aside className="h-fit space-y-5 lg:sticky lg:top-24"><section className="rounded-[24px] border border-outline-variant/20 bg-white p-5 shadow-[0_8px_24px_rgba(28,42,30,.06)]"><h2 className="text-lg font-semibold text-on-surface">{text.cart}</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant/70">{text.cartDescription}</p>{notice ? <p aria-live="polite" className="mt-4 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</p> : null}<div className="mt-5 space-y-3">{items.length ? items.map((item) => <div className="rounded-xl bg-surface-container-low p-3" key={item.campaignId}><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-on-surface">{item.title}</p><button className="text-xs font-semibold text-error" onClick={() => removeItem(item.campaignId)} type="button">{text.remove}</button></div><p className="mt-2 font-mono text-sm font-semibold text-on-surface">{formatPrice(item.amount * item.quantity)}</p></div>) : <p className="rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">{text.empty}</p>}</div><div className="mt-5 border-t border-outline-variant/20 pt-4"><p className="text-xs font-semibold uppercase tracking-[.18em] text-on-surface-variant">{text.total}</p><p className="mt-2 text-2xl font-semibold text-primary">{formatPrice(totalAmount || 0)}</p><p className="mt-2 text-xs leading-5 text-on-surface-variant/70">{text.paymentDescription}</p><Link className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90" href="/odeme">{text.payment}</Link></div></section><section className="rounded-[24px] border border-outline-variant/20 bg-white p-5"><h2 className="text-base font-semibold text-on-surface">{text.trust}</h2><ul className="mt-4 space-y-3">{text.trustItems.map((item) => <li className="flex gap-2 text-sm leading-5 text-on-surface-variant/75" key={item}><span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>{item}</li>)}</ul></section></aside>
    </section>
  </div>;
}
