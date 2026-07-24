"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { useCart } from "@/lib/cart-context";
import { isValidTurkishIdentityNumber, normalizeTurkishIdentityNumber } from "@/lib/turkish-identity";
import { formatCurrency } from "@/lib/utils";

type CountryOption = { code: string; name: string };

export default function PaymentForm({ countries }: { countries: CountryOption[] }) {
  const { items, totalAmount } = useCart();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    tcKimlik: "",
    address: "",
    city: "",
    countryCode: "TR",
    donationNote: "",
    taxReceipt: false,
    kvkk: false,
    terms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const summaryNote = useMemo(
    () => items.map((item) => `${item.title} x${item.quantity}`).join(", "),
    [items],
  );

  function updateField(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, type, value } = event.target;
    const checked = (event.target as HTMLInputElement).checked;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function updateIdentityNumber(event: React.ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({
      ...current,
      tcKimlik: current.countryCode === "TR"
        ? normalizeTurkishIdentityNumber(event.target.value).slice(0, 11)
        : event.target.value.slice(0, 30),
    }));
  }

  function updateCountry(event: React.ChangeEvent<HTMLSelectElement>) {
    setForm((current) => ({ ...current, countryCode: event.target.value, tcKimlik: "" }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!items.length) {
      setSubmitError("Ödeme için önce bağış sepeti oluşturun.");
      return;
    }

    if (!form.kvkk || !form.terms) {
      setSubmitError("KVKK ve bağışçı sözleşmesi onayları zorunludur.");
      return;
    }

    if (form.countryCode === "TR" && !isValidTurkishIdentityNumber(form.tcKimlik)) {
      setSubmitError("Geçerli bir T.C. Kimlik No girin.");
      return;
    }

    if (form.countryCode !== "TR" && !/^[A-Za-z0-9][A-Za-z0-9 -]{4,29}$/.test(form.tcKimlik)) {
      setSubmitError("Geçerli bir pasaport veya ulusal kimlik numarası girin.");
      return;
    }

    if (items.some((item) => item.campaignId !== items[0]?.campaignId)) {
      setSubmitError("Bu sürümde her ödeme işlemi tek bir bağış alanı için başlatılabilir.");
      return;
    }

    if (items.some((item) => item.isRecurring)) {
      setSubmitError("Düzenli bağış tahsilatı henüz kullanıma açılmadı. Lütfen tek seferlik bağış seçin.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          donorName: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: form.phone,
          identityNumber: form.tcKimlik,
          countryCode: form.countryCode,
          address: form.address,
          city: form.city,
          amount: totalAmount,
          currency: items[0]?.currency || "TRY",
          campaignId: items[0]?.campaignId,
          note: [form.donationNote, summaryNote].filter(Boolean).join(" | "),
          taxReceiptRequested: form.taxReceipt,
          kvkkAccepted: form.kvkk,
          termsAccepted: form.terms,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Ödeme sayfası oluşturulamadı.");
      }

      if (payload.paymentPageUrl) {
        window.location.href = payload.paymentPageUrl;
        return;
      }

      if (payload.checkoutFormContent) {
        document.open();
        document.write(payload.checkoutFormContent);
        document.close();
        return;
      }

      throw new Error("iyzico ödeme formu dönmedi.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Ödeme başlatılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f9f9f7_0%,_#eef7ef_100%)] px-margin-mobile py-lg md:px-margin-desktop">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-ambient"
          onSubmit={handleSubmit}
        >
          <p className="text-label-sm uppercase tracking-[0.28em] text-primary">Güvenli Ödeme</p>
          <h1 className="mt-3 text-headline-xl text-on-surface">Bağışçı Bilgileri</h1>
          <p className="mt-3 text-body-md text-on-surface-variant">
            Ödeme, iyzico callback, retrieve ve webhook adımlarıyla doğrulanır.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-label-md text-on-surface-variant">Ad <span className="text-error">*</span></span>
              <input
                autoComplete="given-name"
                className="w-full rounded-2xl border border-outline-variant bg-surface p-4"
                name="firstName"
                onChange={updateField}
                required
                value={form.firstName}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-label-md text-on-surface-variant">Soyad <span className="text-error">*</span></span>
              <input
                autoComplete="family-name"
                className="w-full rounded-2xl border border-outline-variant bg-surface p-4"
                name="lastName"
                onChange={updateField}
                required
                value={form.lastName}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-label-md text-on-surface-variant">E-posta</span>
              <input
                autoComplete="email"
                className="w-full rounded-2xl border border-outline-variant bg-surface p-4"
                name="email"
                onChange={updateField}
                required
                type="email"
                value={form.email}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-label-md text-on-surface-variant">Telefon</span>
              <input
                autoComplete="tel"
                className="w-full rounded-2xl border border-outline-variant bg-surface p-4"
                name="phone"
                onChange={updateField}
                required
                type="tel"
                value={form.phone}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-label-md text-on-surface-variant">{form.countryCode === "TR" ? "T.C. Kimlik No" : "Pasaport / Ulusal Kimlik No"} <span className="text-error">*</span></span>
              <input
                autoComplete="off"
                className="w-full rounded-2xl border border-outline-variant bg-surface p-4"
                inputMode={form.countryCode === "TR" ? "numeric" : "text"}
                maxLength={form.countryCode === "TR" ? 11 : 30}
                name="tcKimlik"
                onChange={updateIdentityNumber}
                pattern={form.countryCode === "TR" ? "[0-9]{11}" : "[A-Za-z0-9 -]{5,30}"}
                required
                value={form.tcKimlik}
              />
              <span className="mt-2 block text-xs text-on-surface-variant">{form.countryCode === "TR" ? "11 haneli T.C. Kimlik Numaranızı girin." : "Pasaport veya ülkenizde geçerli ulusal kimlik numaranızı girin."}</span>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-label-md text-on-surface-variant">Ülke <span className="text-error">*</span></span>
              <select
                autoComplete="country-name"
                className="w-full rounded-2xl border border-outline-variant bg-surface p-4"
                name="countryCode"
                onChange={updateCountry}
                required
                value={form.countryCode}
              >
                {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-label-md text-on-surface-variant">Şehir <span className="text-error">*</span></span>
              <input
                autoComplete="address-level2"
                className="w-full rounded-2xl border border-outline-variant bg-surface p-4"
                name="city"
                onChange={updateField}
                required
                value={form.city}
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-label-md text-on-surface-variant">Adres</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-outline-variant bg-surface p-4"
              name="address"
              onChange={updateField}
              required
              value={form.address}
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-label-md text-on-surface-variant">Bağış Notu</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-outline-variant bg-surface p-4"
              name="donationNote"
              onChange={updateField}
              value={form.donationNote}
            />
          </label>

          <div className="mt-8 rounded-[24px] border border-outline-variant bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-label-md font-semibold text-on-surface">Ödeme Yöntemi</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Güvenli kart ödemeniz iyzico Checkout Form üzerinden alınır.
                </p>
              </div>
              <Image
                src="/images/payments/iyzico-ile-ode.svg"
                alt="iyzico ile öde"
                width={160}
                height={40}
                className="h-10 w-auto"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4 rounded-[24px] border border-outline-variant bg-white p-5">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface">
              <input checked={form.taxReceipt} className="size-4 rounded border-outline-variant accent-primary" name="taxReceipt" onChange={updateField} type="checkbox" />
              Bağış makbuzu istiyorum.
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface">
              <input checked={form.kvkk} className="size-4 rounded border-outline-variant accent-primary" name="kvkk" onChange={updateField} type="checkbox" />
              <span><Link className="underline underline-offset-2 hover:text-primary" href="/kvkk-aydinlatma-metni" target="_blank">KVKK Aydınlatma Metni</Link>&apos;ni okudum.</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface">
              <input checked={form.terms} className="size-4 rounded border-outline-variant accent-primary" name="terms" onChange={updateField} type="checkbox" />
              <span><Link className="underline underline-offset-2 hover:text-primary" href="/bagis-ve-destek-sartlari" target="_blank">Bağış ve Destek Şartları</Link> ile <Link className="underline underline-offset-2 hover:text-primary" href="/kullanim-kosullari" target="_blank">Kullanım Koşulları</Link>&apos;nı kabul ediyorum.</span>
            </label>
          </div>

          {submitError ? <Alert className="mt-4" tone="error">{submitError}</Alert> : null}

          <button
            className="btn-primary mt-6 w-full justify-center"
            disabled={isSubmitting || !items.length}
            type="submit"
          >
            {isSubmitting ? "Ödeme Sayfası Hazırlanıyor..." : "Bağışımı Tamamla"}
          </button>
        </form>

        <aside className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-soft">
          <p className="text-label-sm uppercase tracking-[0.28em] text-primary">Bağış Özeti</p>
          <div className="mt-6 space-y-4">
            {items.length ? (
              items.map((item) => (
                <div key={item.campaignId} className="rounded-2xl bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-on-surface">{item.title}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {item.quantity} adet {item.isRecurring ? "düzenli" : "tek sefer"}
                      </p>
                    </div>
                    <p className="font-semibold text-primary">
                      {formatCurrency(item.amount * item.quantity)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-surface p-4 text-sm text-on-surface-variant">
                Sepetinizde bağış bulunmuyor.
              </div>
            )}
          </div>

          <div className="mt-6 rounded-[24px] border border-dashed border-primary/30 bg-secondary-container/30 p-5">
            <div className="flex items-center justify-between">
              <span className="text-label-md text-on-surface-variant">Toplam</span>
              <strong className="text-headline-md text-primary">
                {formatCurrency(totalAmount || 0)}
              </strong>
            </div>
            <p className="mt-3 text-sm text-on-surface-variant">
              Ödeme başarılı olsa bile sistem bağışı ancak iyzico retrieve ve webhook doğrulamasından
              sonra kesinleştirir.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
