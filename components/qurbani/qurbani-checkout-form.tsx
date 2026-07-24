"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import type { AppLocale } from "@/lib/i18n";
import type { PublicQurbaniProduct, PublicQurbaniSeason } from "@/lib/public/qurbani";
import { isValidTurkishIdentityNumber, normalizeTurkishIdentityNumber } from "@/lib/turkish-identity";

type CountryOption = { code: string; name: string };
type Shareholder = { name: string; phone: string };
export type QurbaniCheckoutItem = { product: PublicQurbaniProduct; quantity: number };

const copy = {
  tr: { eyebrow: "Kurban bağışı", title: "Hissedar ve ödeme bilgileri", owners: "Hisse sahipleri", buyer: "Bağışçı bilgileri", payment: "Ödeme ve onay", ownerName: "Hisse sahibi adı soyadı", ownerPhone: "Telefon (isteğe bağlı)", ownerHint: "Boşsa bağışçının telefonu kullanılır.", firstName: "Ad", lastName: "Soyad", email: "E-posta", phone: "Telefon", identity: "T.C. Kimlik No", foreignIdentity: "Pasaport / Ulusal Kimlik No", country: "Ülke", city: "Şehir", address: "Adres", receipt: "Bağış makbuzu istiyorum.", power: "Kurban vekâletini dijital olarak veriyorum ve telefonla teyit için aranabileceğimi kabul ediyorum.", thirdParty: "Girdiğim üçüncü kişilerin iletişim bilgilerini paylaşmaya yetkiliyim; kişisel video bağlantısının WhatsApp ile iletilebileceğini kabul ediyorum.", kvkk: "KVKK Aydınlatma Metni'ni okudum.", terms: "Bağış ve Destek Şartları ile Kullanım Koşulları'nı kabul ediyorum.", back: "Geri", next: "Devam et", submit: "Hisseleri ayır ve ödemeyi başlat", submitting: "Stok ayrılıyor, güvenli ödeme hazırlanıyor…", summary: "Sepet özeti", unit: "Birim fiyat", total: "Toplam", count: "Toplam hisse", remaining: "Kesin kalan", secure: "Fiyat, revizyon ve kesin kalan stok sunucuda yeniden doğrulanır. Ödeme için hisseler 30 dakika ayrılır.", ownersError: "Her hisse için sahibinin adını yazın.", buyerError: "Bağışçı iletişim ve adres bilgilerini eksiksiz girin.", identityError: "Geçerli bir kimlik numarası girin.", consentError: "Vekâlet, iletişim, KVKK ve şart onaylarını tamamlayın.", genericError: "Kurban ödemesi başlatılamadı.", stockChanged: "Seçtiğiniz seçeneklerden birinin stoğu değişti. Sepetinizi yenileyin.", card: "Güvenli kart ödemesi" },
  en: { eyebrow: "Qurbani donation", title: "Shareholders and payment", owners: "Share owners", buyer: "Donor details", payment: "Payment and consent", ownerName: "Share owner's full name", ownerPhone: "Phone (optional)", ownerHint: "The donor's phone is used when blank.", firstName: "First name", lastName: "Last name", email: "Email", phone: "Phone", identity: "National ID", foreignIdentity: "Passport / National ID", country: "Country", city: "City", address: "Address", receipt: "I would like a donation receipt.", power: "I grant digital qurbani proxy and agree to phone confirmation.", thirdParty: "I am authorised to provide third-party contact data and accept personal video delivery via WhatsApp.", kvkk: "I have read the Privacy Notice.", terms: "I accept the Donation Terms and Terms of Use.", back: "Back", next: "Continue", submit: "Hold shares and start payment", submitting: "Holding stock and preparing secure payment…", summary: "Cart summary", unit: "Unit price", total: "Total", count: "Total shares", remaining: "Confirmed remaining", secure: "The server revalidates price, revision and exact stock. Shares are held for 30 minutes for payment.", ownersError: "Enter an owner name for every share.", buyerError: "Complete the donor contact and address details.", identityError: "Enter a valid identity number.", consentError: "Complete proxy, contact, privacy and terms consents.", genericError: "The qurbani payment could not be started.", stockChanged: "Stock changed for one of your selections. Refresh your cart.", card: "Secure card payment" },
  ar: { eyebrow: "تبرع الأضحية", title: "أصحاب الحصص والدفع", owners: "أصحاب الحصص", buyer: "بيانات المتبرع", payment: "الدفع والموافقات", ownerName: "الاسم الكامل لصاحب الحصة", ownerPhone: "الهاتف (اختياري)", ownerHint: "سيُستخدم هاتف المتبرع إذا كان فارغًا.", firstName: "الاسم", lastName: "اللقب", email: "البريد الإلكتروني", phone: "الهاتف", identity: "رقم الهوية", foreignIdentity: "جواز السفر / الهوية الوطنية", country: "الدولة", city: "المدينة", address: "العنوان", receipt: "أرغب في إيصال تبرع.", power: "أمنح وكالة الأضحية رقميًا وأوافق على التأكيد هاتفيًا.", thirdParty: "لدي صلاحية تقديم بيانات الآخرين وأوافق على إرسال رابط الفيديو الشخصي عبر واتساب.", kvkk: "قرأت إشعار الخصوصية.", terms: "أوافق على شروط التبرع والاستخدام.", back: "رجوع", next: "متابعة", submit: "احجز الحصص وابدأ الدفع", submitting: "جارٍ حجز المخزون وتجهيز الدفع…", summary: "ملخص السلة", unit: "سعر الوحدة", total: "الإجمالي", count: "إجمالي الحصص", remaining: "المتبقي المؤكد", secure: "يعيد الخادم التحقق من السعر والمراجعة والمخزون. تُحجز الحصص 30 دقيقة للدفع.", ownersError: "أدخل اسم صاحب كل حصة.", buyerError: "أكمل بيانات اتصال المتبرع وعنوانه.", identityError: "أدخل رقم هوية صالحًا.", consentError: "أكمل موافقات الوكالة والاتصال والخصوصية والشروط.", genericError: "تعذر بدء دفع الأضحية.", stockChanged: "تغير مخزون أحد الخيارات. حدّث السلة.", card: "دفع آمن بالبطاقة" },
} as const;

const inputClass = "mt-2 w-full rounded-2xl border border-outline-variant bg-white px-4 py-3.5 text-sm text-on-surface shadow-sm placeholder:text-outline focus:border-primary";

function money(value: number, currency: string, locale: AppLocale) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale === "ar" ? "ar" : "en-US", { style: "currency", currency }).format(value);
}

export function QurbaniCheckoutForm({ countries, items, locale, season }: { countries: CountryOption[]; items: QurbaniCheckoutItem[]; locale: AppLocale; season: PublicQurbaniSeason }) {
  const text = copy[locale];
  const [step, setStep] = useState(0);
  const [owners, setOwners] = useState<Record<string, Shareholder[]>>(() => Object.fromEntries(items.map((item) => [item.product.id, Array.from({ length: item.quantity }, () => ({ name: "", phone: "" }))])));
  const [buyer, setBuyer] = useState({ firstName: "", lastName: "", email: "", phone: "", identityNumber: "", countryCode: "TR", city: "", address: "" });
  const [receiptRequested, setReceiptRequested] = useState(false);
  const [consents, setConsents] = useState({ digitalPowerOfAttorney: false, thirdPartyContact: false, kvkk: false, terms: false });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const shareCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const currency = items[0]?.product.currency || "TRY";

  function updateOwner(productId: string, index: number, field: keyof Shareholder, value: string) {
    setOwners((current) => ({ ...current, [productId]: current[productId].map((owner, ownerIndex) => ownerIndex === index ? { ...owner, [field]: value } : owner) }));
  }

  function advance() {
    setError("");
    if (step === 0 && Object.values(owners).flat().some((owner) => owner.name.trim().length < 2)) { setError(text.ownersError); return; }
    if (step === 1) {
      if (!buyer.firstName.trim() || !buyer.lastName.trim() || !buyer.email.includes("@") || buyer.phone.replace(/\D/g, "").length < 10 || !buyer.city.trim() || !buyer.address.trim()) { setError(text.buyerError); return; }
      const identityValid = buyer.countryCode === "TR" ? isValidTurkishIdentityNumber(buyer.identityNumber) : /^[A-Za-z0-9][A-Za-z0-9 -]{4,29}$/.test(buyer.identityNumber);
      if (!identityValid) { setError(text.identityError); return; }
    }
    setStep((current) => Math.min(2, current + 1));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!consents.digitalPowerOfAttorney || !consents.thirdPartyContact || !consents.kvkk || !consents.terms) { setError(text.consentError); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/qurbani/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.product.id, priceRevisionId: item.product.priceRevisionId, priceRevision: item.product.priceRevision, quantity: item.quantity, shareholders: owners[item.product.id] })),
          buyer,
          receiptRequested,
          consents,
          locale,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.code === "OUT_OF_STOCK" ? text.stockChanged : result.error || text.genericError);
      if (result.paymentPageUrl) { window.location.assign(result.paymentPageUrl); return; }
      if (result.checkoutFormContent) { document.open(); document.write(result.checkoutFormContent); document.close(); return; }
      throw new Error(text.genericError);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : text.genericError);
      setSubmitting(false);
    }
  }

  const labels = [text.owners, text.buyer, text.payment];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" dir={locale === "ar" ? "rtl" : "ltr"}>
      <form className="rounded-[30px] border border-outline-variant/60 bg-white p-5 shadow-ambient sm:p-8" onSubmit={submit}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{text.eyebrow} · {season.year}</p><h1 className="mt-2 text-3xl font-semibold text-on-surface">{text.title}</h1>
        <ol className="mt-7 grid grid-cols-3 gap-2">{labels.map((label, index) => <li className={index <= step ? "rounded-xl bg-primary px-2 py-3 text-center text-xs font-semibold text-white" : "rounded-xl bg-surface-container px-2 py-3 text-center text-xs font-semibold text-on-surface-variant"} key={label}>{index + 1}. {label}</li>)}</ol>

        {step === 0 ? <section className="mt-8 space-y-6">{items.map((item) => <fieldset className="rounded-2xl border border-outline-variant/60 bg-surface p-4" key={item.product.id}><legend className="px-2 font-bold text-primary">{item.product.countryName || item.product.region} · {item.product.title} ({item.quantity})</legend><div className="mt-2 space-y-4">{owners[item.product.id].map((owner, index) => <div className="grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-2" key={`${item.product.id}-${index}`}><label className="text-sm text-on-surface-variant">{index + 1}. {text.ownerName}<input className={inputClass} maxLength={120} onChange={(event) => updateOwner(item.product.id, index, "name", event.target.value)} value={owner.name} /></label><label className="text-sm text-on-surface-variant">{text.ownerPhone}<input className={inputClass} maxLength={24} onChange={(event) => updateOwner(item.product.id, index, "phone", event.target.value)} type="tel" value={owner.phone} /><span className="mt-1 block text-xs">{text.ownerHint}</span></label></div>)}</div></fieldset>)}</section> : null}

        {step === 1 ? <section className="mt-8 grid gap-4 sm:grid-cols-2">{(["firstName", "lastName", "email", "phone"] as const).map((field) => <label className="text-sm text-on-surface-variant" key={field}>{text[field]}<input autoComplete={field === "firstName" ? "given-name" : field === "lastName" ? "family-name" : field} className={inputClass} onChange={(event) => setBuyer((current) => ({ ...current, [field]: event.target.value }))} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} value={buyer[field]} /></label>)}<label className="text-sm text-on-surface-variant">{text.country}<select className={inputClass} onChange={(event) => setBuyer((current) => ({ ...current, countryCode: event.target.value, identityNumber: "" }))} value={buyer.countryCode}>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label className="text-sm text-on-surface-variant">{buyer.countryCode === "TR" ? text.identity : text.foreignIdentity}<input className={inputClass} inputMode={buyer.countryCode === "TR" ? "numeric" : "text"} maxLength={buyer.countryCode === "TR" ? 11 : 30} onChange={(event) => setBuyer((current) => ({ ...current, identityNumber: current.countryCode === "TR" ? normalizeTurkishIdentityNumber(event.target.value).slice(0, 11) : event.target.value.slice(0, 30) }))} value={buyer.identityNumber} /></label><label className="text-sm text-on-surface-variant sm:col-span-2">{text.city}<input className={inputClass} onChange={(event) => setBuyer((current) => ({ ...current, city: event.target.value }))} value={buyer.city} /></label><label className="text-sm text-on-surface-variant sm:col-span-2">{text.address}<textarea className={`${inputClass} min-h-28`} onChange={(event) => setBuyer((current) => ({ ...current, address: event.target.value }))} value={buyer.address} /></label></section> : null}

        {step === 2 ? <section className="mt-8"><div className="rounded-2xl border-2 border-primary bg-primary/5 p-5"><strong>{text.card}</strong><p className="mt-2 text-sm text-on-surface-variant">{text.secure}</p><Image alt="iyzico ile öde" className="mt-4 h-9 w-auto" height={36} src="/images/payments/iyzico-ile-ode.svg" width={144} /></div><div className="mt-5 space-y-4 rounded-2xl bg-surface p-5"><label className="flex gap-3 text-sm"><input checked={receiptRequested} className="mt-1 size-4 accent-primary" onChange={(event) => setReceiptRequested(event.target.checked)} type="checkbox" />{text.receipt}</label><label className="flex gap-3 text-sm"><input checked={consents.digitalPowerOfAttorney} className="mt-1 size-4 accent-primary" onChange={(event) => setConsents((current) => ({ ...current, digitalPowerOfAttorney: event.target.checked }))} type="checkbox" />{text.power}</label><label className="flex gap-3 text-sm"><input checked={consents.thirdPartyContact} className="mt-1 size-4 accent-primary" onChange={(event) => setConsents((current) => ({ ...current, thirdPartyContact: event.target.checked }))} type="checkbox" />{text.thirdParty}</label><label className="flex gap-3 text-sm"><input checked={consents.kvkk} className="mt-1 size-4 accent-primary" onChange={(event) => setConsents((current) => ({ ...current, kvkk: event.target.checked }))} type="checkbox" /><Link className="font-semibold text-primary underline" href="/kvkk-aydinlatma-metni" target="_blank">{text.kvkk}</Link></label><label className="flex gap-3 text-sm"><input checked={consents.terms} className="mt-1 size-4 accent-primary" onChange={(event) => setConsents((current) => ({ ...current, terms: event.target.checked }))} type="checkbox" /><Link className="font-semibold text-primary underline" href="/bagis-ve-destek-sartlari" target="_blank">{text.terms}</Link></label></div></section> : null}

        {error ? <Alert className="mt-5" tone="error">{error}</Alert> : null}<div className="mt-7 flex justify-between gap-3">{step > 0 ? <button className="btn-outline" onClick={() => { setError(""); setStep((current) => current - 1); }} type="button">{text.back}</button> : <Link className="btn-outline" href="/kurban">{text.back}</Link>}{step < 2 ? <button className="btn-primary" onClick={advance} type="button">{text.next}</button> : <button className="btn-primary" disabled={submitting} type="submit">{submitting ? text.submitting : text.submit}</button>}</div>
      </form>

      <aside className="h-fit rounded-[28px] border border-outline-variant/60 bg-primary-container/60 p-6 lg:sticky lg:top-24"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{text.summary}</p><ul className="mt-5 space-y-3">{items.map((item) => <li className="rounded-xl bg-white/75 p-4 text-sm" key={item.product.id}><div className="flex justify-between gap-3"><div><strong className="block">{item.product.title}</strong><span className="text-xs text-on-surface-variant">{item.product.countryName || item.product.region} · {item.quantity}</span></div><b className="text-primary">{money(item.product.price * item.quantity, item.product.currency, locale)}</b></div><p className="mt-2 text-xs text-on-surface-variant">{text.remaining}: {item.product.remainingShares} · {text.unit}: {money(item.product.price, item.product.currency, locale)}</p></li>)}</ul><dl className="mt-6 space-y-3 border-t border-primary/15 pt-5"><div className="flex justify-between"><dt>{text.count}</dt><dd className="font-bold">{shareCount} / 7</dd></div><div className="flex justify-between text-lg"><dt>{text.total}</dt><dd className="font-bold text-primary">{money(total, currency, locale)}</dd></div></dl><p className="mt-5 rounded-xl bg-white/70 p-4 text-xs leading-5 text-on-surface-variant">{text.secure}</p></aside>
    </div>
  );
}
