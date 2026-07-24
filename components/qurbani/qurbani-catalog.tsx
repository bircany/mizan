"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { AppLocale } from "@/lib/i18n";
import type { PublicQurbaniCountry, PublicQurbaniProduct } from "@/lib/public/qurbani";

const MAX_CART_SHARES = 7;

const copy = {
  tr: { countries: "Ülke seçin", countryHint: "Ülke kartından bölgeyi seçip güncel kurban seçeneklerini görüntüleyin.", variants: "Kurban seçenekleri", cattle: "Büyükbaş hissesi", small: "Küçükbaş kurban", share: "hisse", animal: "kurban", capacity: "Kapasite", remaining: "Kesin kalan", soldOut: "Tükendi", add: "Sepete ekle", remove: "Azalt", cart: "Kurban sepeti", empty: "Henüz kurban seçmediniz.", total: "Toplam", count: "Toplam hisse", checkout: "Ödemeye devam et", max: "Tek ödemede en fazla 7 hisse seçebilirsiniz.", currency: "Sepette yalnız aynı para birimindeki seçenekler birlikte alınabilir.", noVariants: "Bu ülkede satışa açık kurban seçeneği bulunmuyor." },
  en: { countries: "Choose a country", countryHint: "Select a country card to view current qurbani options.", variants: "Qurbani options", cattle: "Cattle share", small: "Small livestock", share: "share", animal: "animal", capacity: "Capacity", remaining: "Confirmed remaining", soldOut: "Sold out", add: "Add to cart", remove: "Decrease", cart: "Qurbani cart", empty: "You have not selected a qurbani yet.", total: "Total", count: "Total shares", checkout: "Continue to payment", max: "You can select at most 7 shares in one payment.", currency: "Only options with the same currency can be purchased together.", noVariants: "There are no qurbani options on sale in this country." },
  ar: { countries: "اختر الدولة", countryHint: "اختر بطاقة الدولة لعرض خيارات الأضاحي الحالية.", variants: "خيارات الأضاحي", cattle: "حصة بقرة", small: "أضحية غنم", share: "حصة", animal: "أضحية", capacity: "السعة", remaining: "المتبقي المؤكد", soldOut: "نفدت", add: "أضف للسلة", remove: "تقليل", cart: "سلة الأضاحي", empty: "لم تختر أضحية بعد.", total: "الإجمالي", count: "إجمالي الحصص", checkout: "متابعة الدفع", max: "يمكن اختيار 7 حصص كحد أقصى في دفعة واحدة.", currency: "يمكن جمع الخيارات ذات العملة نفسها فقط.", noVariants: "لا توجد خيارات أضاحي متاحة في هذه الدولة." },
} as const;

function formatMoney(value: number, currency: string, locale: AppLocale) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale === "ar" ? "ar" : "en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function CountryCard({ active, country, onSelect, optionLabel, shareLabel }: { active: boolean; country: PublicQurbaniCountry; onSelect(): void; optionLabel: string; shareLabel: string }) {
  return (
    <button aria-pressed={active} className={active ? "group overflow-hidden rounded-[26px] border-2 border-primary bg-white text-left shadow-ambient" : "group overflow-hidden rounded-[26px] border border-outline-variant/60 bg-white text-left shadow-soft transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-ambient"} onClick={onSelect} type="button">
      <div className="relative h-36 bg-primary-container">
        {country.imageUrl ? <Image alt="" className="object-cover transition duration-500 group-hover:scale-105" fill sizes="(max-width: 768px) 100vw, 33vw" src={country.imageUrl} /> : <div className="grid h-full place-items-center"><span className="material-symbols-outlined text-5xl text-primary/45">public</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        {country.code ? <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-primary">{country.code}</span> : null}
        <h3 className="absolute bottom-3 left-4 right-4 text-xl font-bold text-white">{country.name}</h3>
      </div>
      <div className="flex items-center justify-between gap-3 p-4 text-sm"><span className="text-on-surface-variant">{country.variants.length} {optionLabel}</span><strong className={country.remainingShares > 0 ? "text-primary" : "text-error"}>{country.remainingShares} {shareLabel}</strong></div>
    </button>
  );
}

export function QurbaniCatalog({ countries, locale }: { countries: PublicQurbaniCountry[]; locale: AppLocale }) {
  const text = copy[locale];
  const [selectedCountryId, setSelectedCountryId] = useState(countries[0]?.id || "");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");
  const selectedCountry = countries.find((country) => country.id === selectedCountryId) || countries[0];
  const products = selectedCountry?.variants || [];
  const selectedItems = countries.flatMap((country) => country.variants).filter((product) => (quantities[product.id] || 0) > 0);
  const cartCount = selectedItems.reduce((sum, product) => sum + (quantities[product.id] || 0), 0);
  const cartTotal = selectedItems.reduce((sum, product) => sum + product.price * (quantities[product.id] || 0), 0);
  const cartCurrency = selectedItems[0]?.currency || "TRY";

  function changeQuantity(product: PublicQurbaniProduct, delta: number) {
    setNotice("");
    const current = quantities[product.id] || 0;
    if (delta > 0 && cartCount >= MAX_CART_SHARES) { setNotice(text.max); return; }
    if (delta > 0 && selectedItems.some((item) => item.currency !== product.currency)) { setNotice(text.currency); return; }
    const next = Math.max(0, Math.min(product.remainingShares, current + delta));
    setQuantities((value) => ({ ...value, [product.id]: next }));
  }

  const checkoutItems = selectedItems.map((product) => `${product.id}:${quantities[product.id] || 0}`).join(",");
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mb-7"><h3 className="text-2xl font-semibold text-on-surface">{text.countries}</h3><p className="mt-2 text-sm text-on-surface-variant">{text.countryHint}</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{countries.map((country) => <CountryCard active={country.id === selectedCountry?.id} country={country} key={country.id} onSelect={() => setSelectedCountryId(country.id)} optionLabel={text.variants.toLocaleLowerCase(locale)} shareLabel={text.share} />)}</div>

      <div className="mt-12 grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{selectedCountry?.name}</p><h3 className="mt-2 text-2xl font-semibold text-on-surface">{text.variants}</h3>{selectedCountry?.description ? <p className="mt-2 text-sm leading-6 text-on-surface-variant">{selectedCountry.description}</p> : null}</div>
          {products.length ? <div className="grid gap-5 md:grid-cols-2">{products.map((product) => {
            const quantity = quantities[product.id] || 0;
            const soldOut = product.remainingShares < 1;
            return <article className="overflow-hidden rounded-[26px] border border-outline-variant/60 bg-white shadow-soft" key={product.id}><div className="relative h-44 bg-primary-container">{product.imageUrl ? <Image alt={product.imageAlt} className="object-cover" fill sizes="(max-width: 768px) 100vw, 50vw" src={product.imageUrl} /> : <div className="grid h-full place-items-center"><span className="material-symbols-outlined text-5xl text-primary/45">pets</span></div>}<span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-primary">{product.kind === "cattle" ? text.cattle : text.small}</span></div><div className="p-5"><h4 className="text-xl font-semibold text-on-surface">{product.title}</h4><p className="mt-2 min-h-12 text-sm leading-6 text-on-surface-variant">{product.description}</p><div className="mt-5 flex items-end justify-between gap-3"><div><strong className="block text-xl text-primary">{formatMoney(product.price, product.currency, locale)}</strong><span className="mt-1 block text-xs text-on-surface-variant">{text.capacity}: {product.capacity} · {text.remaining}: <b className={soldOut ? "text-error" : "text-primary"}>{product.remainingShares}</b></span></div>{soldOut ? <span className="rounded-full bg-error-container px-3 py-1.5 text-xs font-bold text-error">{text.soldOut}</span> : quantity ? <div className="flex items-center rounded-xl border border-outline-variant"><button aria-label={text.remove} className="grid size-10 place-items-center" onClick={() => changeQuantity(product, -1)} type="button">−</button><strong className="min-w-8 text-center">{quantity}</strong><button aria-label={text.add} className="grid size-10 place-items-center" onClick={() => changeQuantity(product, 1)} type="button">+</button></div> : <button className="rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white" onClick={() => changeQuantity(product, 1)} type="button">{text.add}</button>}</div></div></article>;
          })}</div> : <div className="rounded-3xl border border-dashed border-outline-variant bg-white p-10 text-center text-sm text-on-surface-variant">{text.noVariants}</div>}
        </section>

        <aside className="h-fit rounded-[28px] border border-outline-variant/60 bg-white p-6 shadow-ambient xl:sticky xl:top-24">
          <h3 className="text-xl font-semibold text-on-surface">{text.cart}</h3>
          {selectedItems.length ? <ul className="mt-5 space-y-3">{selectedItems.map((product) => <li className="flex items-start justify-between gap-3 rounded-xl bg-surface p-3 text-sm" key={product.id}><div><strong className="block">{product.title}</strong><span className="text-xs text-on-surface-variant">{product.countryName || product.region} · {quantities[product.id]} {text.share}</span></div><span className="font-semibold text-primary">{formatMoney(product.price * quantities[product.id], product.currency, locale)}</span></li>)}</ul> : <p className="mt-5 rounded-xl bg-surface p-4 text-sm text-on-surface-variant">{text.empty}</p>}
          <dl className="mt-6 space-y-3 border-t border-outline-variant/60 pt-5 text-sm"><div className="flex justify-between"><dt>{text.count}</dt><dd className="font-bold">{cartCount} / {MAX_CART_SHARES}</dd></div><div className="flex justify-between text-lg"><dt>{text.total}</dt><dd className="font-bold text-primary">{formatMoney(cartTotal, cartCurrency, locale)}</dd></div></dl>
          {notice ? <p aria-live="polite" className="mt-4 rounded-xl bg-error-container p-3 text-xs text-error">{notice}</p> : null}
          {cartCount ? <Link className="btn-primary mt-5 w-full" href={`/kurban/odeme?items=${encodeURIComponent(checkoutItems)}`}>{text.checkout}</Link> : <button className="mt-5 inline-flex w-full justify-center rounded-xl bg-outline-variant px-5 py-3.5 text-sm font-semibold text-white" disabled type="button">{text.checkout}</button>}
          <p className="mt-3 text-center text-xs text-on-surface-variant">{text.max}</p>
        </aside>
      </div>
    </div>
  );
}
