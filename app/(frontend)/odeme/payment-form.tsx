"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Copy, Landmark, Phone } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { useCart } from "@/lib/cart-context";
import {
  formatIban,
  phoneHref,
  whatsappNumber,
  type EftGuidance,
} from "@/lib/eft-guidance";
import {
  getMaximumCardQuantity,
  isIyzicoAmountAllowed,
} from "@/lib/payments/limits";
import { isValidTurkishIdentityNumber, normalizeTurkishIdentityNumber } from "@/lib/turkish-identity";
import { formatCurrency } from "@/lib/utils";

type CountryOption = { code: string; name: string };

export default function PaymentForm({
  countries,
  eftGuidance,
  iyzicoMaxPaymentAmount,
}: {
  countries: CountryOption[];
  eftGuidance: EftGuidance;
  iyzicoMaxPaymentAmount: number;
}) {
  const { items, totalAmount, updateQuantity } = useCart();
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
    paymentMethod: "card" as "card" | "eft",
    ownIdentity: true,
    powerOfAttorney: false,
    thirdPartyContact: false,
  });
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [participantPhones, setParticipantPhones] = useState<string[]>([]);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const summaryNote = useMemo(
    () => items.map((item) => `${item.title} x${item.quantity}`).join(", "),
    [items],
  );
  const checkoutItem = items[0];
  const cardLimitExceeded =
    form.paymentMethod === "card" &&
    totalAmount > 0 &&
    !isIyzicoAmountAllowed(totalAmount, iyzicoMaxPaymentAmount);
  const maximumCardQuantity =
    checkoutItem?.pricingModel === "fixed"
      ? getMaximumCardQuantity(
          Number(checkoutItem.amount),
          iyzicoMaxPaymentAmount,
        )
      : null;
  const cardLimitMessage = cardLimitExceeded
    ? maximumCardQuantity && maximumCardQuantity > 0
      ? `Kartla tek işlem tutarı ${formatCurrency(iyzicoMaxPaymentAmount, checkoutItem?.currency || "TRY")} değerinden küçük olmalıdır. Bu kampanyada kartla en fazla ${maximumCardQuantity} hisse/adet alabilirsiniz. Adedi azaltın veya EFT/Havale seçin.`
      : `Kartla tek işlem tutarı ${formatCurrency(iyzicoMaxPaymentAmount, checkoutItem?.currency || "TRY")} değerinden küçük olmalıdır. Tutarı azaltın veya EFT/Havale seçin.`
    : null;

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

    if (form.paymentMethod === "eft") {
      setSubmitError(
        "EFT/Havale bağışları çevrim içi ödeme oluşturmaz. Lütfen dernek ekibiyle telefon veya WhatsApp üzerinden iletişime geçin.",
      );
      return;
    }

    if (cardLimitExceeded) {
      setSubmitError(cardLimitMessage);
      return;
    }

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
      const participants = checkoutItem?.participantRequired
        ? Array.from({ length: checkoutItem.quantity }, (_, index) => ({
            name: form.ownIdentity
              ? `${form.firstName} ${form.lastName}`.trim()
              : participantNames[index] || "",
            phone: form.ownIdentity
              ? undefined
              : participantPhones[index]?.trim() || undefined,
            useBuyerIdentity: form.ownIdentity,
          }))
        : [];
      if (participants.some((participant) => participant.name.length < 2)) {
        throw new Error("Her hisse/katılımcı için ad soyad girin.");
      }

      const response = await fetch("/api/donations/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: checkoutItem?.campaignId,
          paymentMethod: form.paymentMethod,
          amount:
            checkoutItem?.pricingModel === "fixed" ? undefined : totalAmount,
          childDonationPackages: checkoutItem?.childDonationPackages,
          childDonationCurrency: checkoutItem?.childDonationCurrency,
          quantity: checkoutItem?.quantity || 1,
          participants,
          buyer: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            identityNumber: form.tcKimlik,
            countryCode: form.countryCode,
            address: form.address,
            city: form.city,
          },
          note: [form.donationNote, summaryNote].filter(Boolean).join(" | "),
          taxReceiptRequested: form.taxReceipt,
          consents: {
            kvkk: form.kvkk,
            terms: form.terms,
            powerOfAttorney: form.powerOfAttorney,
            thirdPartyContact: form.thirdPartyContact,
          },
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
          <h1 className="mt-3 text-headline-xl text-on-surface">
            {form.paymentMethod === "card" ? "Bağışçı Bilgileri" : "EFT / Havale ile Bağış"}
          </h1>
          <p className="mt-3 text-body-md text-on-surface-variant">
            {form.paymentMethod === "card"
              ? "Ödeme, iyzico callback, retrieve ve webhook adımlarıyla doğrulanır."
              : "Dernek görevlisi kampanya uygunluğunu kontrol eder ve transfer sürecinde size yardımcı olur."}
          </p>

          <div className="mt-8 rounded-[24px] border border-outline-variant bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-label-md font-semibold text-on-surface">Ödeme Yöntemi</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Kart ödemesi çevrim içi alınır; EFT/Havale işlemini dernek görevlisi birebir yürütür.
                </p>
              </div>
              {form.paymentMethod === "card" ? (
                <Image
                  src="/images/payments/iyzico-ile-ode.svg"
                  alt="iyzico ile öde"
                  width={160}
                  height={40}
                  className="h-10 w-auto"
                  style={{ height: "auto" }}
                />
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-outline-variant bg-white p-4">
                <input
                  checked={form.paymentMethod === "card"}
                  name="paymentMethod"
                  onChange={updateField}
                  type="radio"
                  value="card"
                />
                Kart
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-outline-variant bg-white p-4">
                <input
                  checked={form.paymentMethod === "eft"}
                  name="paymentMethod"
                  onChange={updateField}
                  type="radio"
                  value="eft"
                />
                EFT / Havale
              </label>
            </div>
            {cardLimitMessage ? (
              <Alert className="mt-4" tone="error">
                {cardLimitMessage}
              </Alert>
            ) : null}
          </div>

          {form.paymentMethod === "card" ? (
          <>
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

          {checkoutItem?.participantRequired ? (
            <div className="mt-6 rounded-[24px] border border-outline-variant bg-surface p-5">
              <label className="flex items-center gap-3 text-sm font-semibold text-on-surface">
                <input
                  checked={form.ownIdentity}
                  name="ownIdentity"
                  onChange={updateField}
                  type="checkbox"
                />
                Tüm hisse/adetleri kendi adıma alıyorum
              </label>
              {!form.ownIdentity ? (
                <div className="mt-4 grid gap-3">
                  {Array.from(
                    { length: checkoutItem.quantity },
                    (_, index) => participantNames[index] || "",
                  ).map((name, index) => (
                    <div className="grid gap-3 md:grid-cols-2" key={index}>
                      <label className="block">
                        <span className="mb-2 block text-sm text-on-surface-variant">
                          {index + 1}. katılımcı / vekâlet sahibi
                        </span>
                        <input
                          className="w-full rounded-2xl border border-outline-variant bg-white p-4"
                          onChange={(event) =>
                            setParticipantNames((current) => {
                              const next = Array.from(
                                { length: checkoutItem.quantity },
                                (_, itemIndex) => current[itemIndex] || "",
                              );
                              next[index] = event.target.value;
                              return next;
                            })
                          }
                          required
                          value={name}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm text-on-surface-variant">
                          WhatsApp telefonu (isteğe bağlı)
                        </span>
                        <input
                          className="w-full rounded-2xl border border-outline-variant bg-white p-4"
                          onChange={(event) =>
                            setParticipantPhones((current) => {
                              const next = Array.from(
                                { length: checkoutItem.quantity },
                                (_, itemIndex) => current[itemIndex] || "",
                              );
                              next[index] = event.target.value;
                              return next;
                            })
                          }
                          type="tel"
                          value={participantPhones[index] || ""}
                        />
                      </label>
                    </div>
                  ))}
                  <label className="flex items-start gap-3 text-sm text-on-surface">
                    <input
                      checked={form.thirdPartyContact}
                      name="thirdPartyContact"
                      onChange={updateField}
                      type="checkbox"
                    />
                    Katılımcıların telefonlarını WhatsApp video teslimatı için paylaşmaya yetkiliyim.
                  </label>
                </div>
              ) : null}
              <label className="mt-4 flex items-center gap-3 text-sm text-on-surface">
                <input
                  checked={form.powerOfAttorney}
                  name="powerOfAttorney"
                  onChange={updateField}
                  type="checkbox"
                />
                Katılımcı/vekâlet şartlarını onaylıyorum.
              </label>
            </div>
          ) : null}

          </>
          ) : null}

          {form.paymentMethod === "eft" ? (
            <EftGuidancePanel
              copiedIban={copiedIban}
              currency={checkoutItem?.currency || "TRY"}
              guidance={eftGuidance}
              onCopy={async (iban) => {
                await navigator.clipboard.writeText(formatIban(iban));
                setCopiedIban(iban);
                window.setTimeout(() => setCopiedIban(null), 2000);
              }}
              summaryNote={summaryNote}
              totalAmount={totalAmount}
            />
          ) : null}

          {form.paymentMethod === "card" ? (
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
          ) : null}

          {submitError ? <Alert className="mt-4" tone="error">{submitError}</Alert> : null}

          {form.paymentMethod === "card" ? <button
            className="btn-primary mt-6 w-full justify-center"
            disabled={isSubmitting || !items.length || cardLimitExceeded}
            type="submit"
          >
            {isSubmitting ? "Ödeme Sayfası Hazırlanıyor..." : "Bağışımı Tamamla"}
          </button> : null}
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
                      {formatCurrency(item.amount * item.quantity, item.currency)}
                    </p>
                  </div>
                  {item.pricingModel === "fixed" ? (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
                      <span className="text-sm font-medium text-on-surface-variant">
                        Adet / hisse
                      </span>
                      <div className="flex items-center overflow-hidden rounded-xl border border-outline-variant bg-white">
                        <button
                          aria-label="Adedi azalt"
                          className="size-10 text-lg font-semibold text-on-surface transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            updateQuantity(
                              item.campaignId,
                              Math.max(1, item.quantity - 1),
                            )
                          }
                          type="button"
                        >
                          −
                        </button>
                        <input
                          aria-label="Bağış adedi"
                          className="h-10 w-14 border-x border-outline-variant bg-white text-center font-semibold text-on-surface outline-none"
                          inputMode="numeric"
                          max={100}
                          min={1}
                          onChange={(event) =>
                            updateQuantity(
                              item.campaignId,
                              Math.min(
                                100,
                                Math.max(1, Number(event.target.value) || 1),
                              ),
                            )
                          }
                          type="number"
                          value={item.quantity}
                        />
                        <button
                          aria-label="Adedi artır"
                          className="size-10 text-lg font-semibold text-on-surface transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={item.quantity >= 100}
                          onClick={() =>
                            updateQuantity(
                              item.campaignId,
                              Math.min(100, item.quantity + 1),
                            )
                          }
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : null}
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
                {formatCurrency(totalAmount || 0, checkoutItem?.currency || "TRY")}
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

function EftGuidancePanel({
  copiedIban,
  currency,
  guidance,
  onCopy,
  summaryNote,
  totalAmount,
}: {
  copiedIban: string | null;
  currency: string;
  guidance: EftGuidance;
  onCopy: (iban: string) => Promise<void>;
  summaryNote: string;
  totalAmount: number;
}) {
  const callNumber = phoneHref(guidance.phone);
  const whatsApp = whatsappNumber(guidance.whatsapp || guidance.phone);
  const whatsAppText = encodeURIComponent(
    `Merhaba, ${summaryNote || "bağış"} için EFT/Havale hakkında bilgi almak istiyorum. Toplam: ${formatCurrency(totalAmount, currency)}.`,
  );

  return (
    <section className="mt-6 rounded-[24px] border border-primary/25 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <Landmark className="mt-0.5 size-6 shrink-0 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-on-surface">{guidance.title}</h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            EFT/Havale işlemleri dernek görevlisiyle birebir yürütülür. Bu ekranda
            çevrim içi sipariş, stok rezervasyonu veya dekont kaydı oluşturulmaz.
          </p>
          {guidance.description.map((paragraph) => (
            <p className="mt-2 text-sm leading-6 text-on-surface-variant" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {callNumber ? (
          <a
            className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border-2 border-primary/70 bg-white px-5 text-sm font-bold text-primary shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href={`tel:${callNumber}`}
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary/10">
              <Phone className="size-4" strokeWidth={2.3} />
            </span>
            {guidance.phone || "Derneği ara"}
          </a>
        ) : null}
        {whatsApp ? (
          <a
            className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border-2 border-[#1fb956] bg-[#25D366] px-5 text-sm font-bold text-[#063b1d] shadow-[0_8px_20px_rgba(37,211,102,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#20c760] hover:shadow-[0_10px_24px_rgba(37,211,102,0.32)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]"
            href={`https://wa.me/${whatsApp}?text=${whatsAppText}`}
            rel="noreferrer"
            target="_blank"
          >
            <span className="grid size-8 place-items-center rounded-full bg-white/90 text-[#128C7E] shadow-sm">
              <WhatsAppIcon className="size-[18px]" />
            </span>
            WhatsApp&apos;tan yaz
          </a>
        ) : null}
      </div>

      {guidance.workingHours ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          Çalışma saatleri: {guidance.workingHours}
        </p>
      ) : null}

      {guidance.accounts.length ? (
        <div className="mt-5 space-y-3">
          {guidance.accounts.map((account) => (
            <article
              className="rounded-2xl border border-outline-variant bg-white p-4"
              key={`${account.bankName}-${account.iban}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">{account.bankName}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {account.accountHolder} · {account.currency}
                  </p>
                </div>
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-outline-variant px-3 text-xs font-semibold text-primary"
                  onClick={() => onCopy(account.iban)}
                  type="button"
                >
                  {copiedIban === account.iban ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copiedIban === account.iban ? "Kopyalandı" : "IBAN’ı kopyala"}
                </button>
              </div>
              <p className="mt-3 break-all font-mono text-sm font-semibold tracking-wide text-on-surface">
                {formatIban(account.iban)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <Alert className="mt-5" tone="info">
          IBAN bilgisi henüz yayımlanmadı. Transfer yapmadan önce telefon veya
          WhatsApp üzerinden dernek görevlisiyle iletişime geçin.
        </Alert>
      )}
    </section>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
    >
      <path
        d="M16 4.25A11.75 11.75 0 0 0 5.91 22.03L4.4 27.6l5.72-1.5A11.75 11.75 0 1 0 16 4.25Z"
        fill="currentColor"
      />
      <path
        d="M12.02 10.35c-.3-.68-.62-.7-.91-.71h-.78c-.27 0-.7.1-1.07.5-.37.4-1.41 1.38-1.41 3.36 0 1.98 1.44 3.9 1.64 4.17.2.26 2.83 4.32 6.86 6.06.96.41 1.7.66 2.29.85.96.3 1.83.26 2.52.16.77-.12 2.36-.97 2.69-1.9.33-.93.33-1.73.23-1.9-.1-.16-.36-.26-.76-.46-.4-.2-2.36-1.17-2.73-1.3-.36-.13-.63-.2-.89.2-.27.4-1.03 1.3-1.26 1.56-.23.27-.46.3-.86.1-.4-.2-1.68-.62-3.2-1.98-1.19-1.06-1.99-2.36-2.22-2.76-.23-.4-.02-.61.18-.81.18-.18.4-.46.6-.7.2-.23.26-.4.4-.66.13-.27.06-.5-.04-.7-.1-.2-.88-2.19-1.24-2.99Z"
        fill="white"
      />
    </svg>
  );
}
