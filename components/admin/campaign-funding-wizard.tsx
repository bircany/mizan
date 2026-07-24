"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, X } from "lucide-react";

import type { ContentActionState } from "@/lib/admin/content-actions";
import { saveContentRecord } from "@/lib/admin/content-actions";
import type { ContentDefinition, ContentRecord } from "@/lib/admin/content";

type Locale = "tr" | "en" | "ar";
type Translation = { title: string; description: string; category: string };
type Pool = {
  id?: string;
  currency: string;
  targetAmount: string;
  reportingMode: "pool" | "donation_based";
  isDonationOpen: boolean;
  translations: Record<Locale, Translation>;
};

const locales: { value: Locale; label: string }[] = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];
const currencies = ["TRY", "USD", "EUR", "GBP"];
const steps = [
  { title: "Dil ve para birimi", description: "Havuzları seçin" },
  { title: "Hedefler", description: "Tutarları belirleyin" },
  { title: "İçerikler", description: "Her havuzu yazın" },
  { title: "Görsel ve onay", description: "Son kontrol" },
];

const blankTranslations = (): Record<Locale, Translation> => ({
  tr: { title: "", description: "", category: "" },
  en: { title: "", description: "", category: "" },
  ar: { title: "", description: "", category: "" },
});

const makePool = (currency: string): Pool => ({
  currency,
  targetAmount: "",
  reportingMode: "pool",
  isDonationOpen: true,
  translations: blankTranslations(),
});

export function CampaignFundingWizard({ definition, record }: { definition: ContentDefinition; record?: ContentRecord }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const existing = Array.isArray(record?.values.fundingPools) ? (record.values.fundingPools as Pool[]) : [];
  const initialLocales: Locale[] = existing.length
    ? locales.filter((locale) => existing.some((pool) => pool.translations?.[locale.value]?.title)).map((locale) => locale.value)
    : ["tr", "en", "ar"];
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [selectedLocales, setSelectedLocales] = useState<Locale[]>(initialLocales.length ? initialLocales : ["tr"]);
  const [pools, setPools] = useState<Pool[]>(existing.length ? existing : [makePool("TRY")]);
  const [state, action] = useActionState<ContentActionState, FormData>(saveContentRecord, { message: null, success: false });
  const options = definition.fields.find((field) => field.name === "category")?.options || [];
  const isEditing = Boolean(record);

  useEffect(() => {
    if (!state.success) return;
    closeDialog();
  }, [state.success]);

  function openDialog() {
    setStepError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleDialogClose() {
    setStep(0);
    setStepError(null);
  }

  function toggleCurrency(currency: string) {
    setPools((current) => current.some((pool) => pool.currency === currency)
      ? current.filter((pool) => pool.currency !== currency)
      : [...current, makePool(currency)]);
  }

  function toggleLocale(locale: Locale) {
    setSelectedLocales((current) => current.includes(locale) ? current.filter((item) => item !== locale) : [...current, locale]);
  }

  function updatePool(index: number, patch: Partial<Pool>) {
    setPools((current) => current.map((pool, currentIndex) => currentIndex === index ? { ...pool, ...patch } : pool));
  }

  function updateTranslation(poolIndex: number, locale: Locale, patch: Partial<Translation>) {
    setPools((current) => current.map((pool, index) => index === poolIndex
      ? {
          ...pool,
          translations: {
            ...pool.translations,
            [locale]: { ...pool.translations[locale], ...patch },
          },
        }
      : pool));
  }

  function validateCurrentStep() {
    if (step === 0 && selectedLocales.length === 0) return "Devam etmek için en az bir dil seçin.";
    if (step === 0 && pools.length === 0) return "Devam etmek için en az bir para birimi seçin.";
    if (step === 1 && pools.some((pool) => !pool.targetAmount || Number(pool.targetAmount) < 0)) return "Her para birimi için geçerli bir hedef tutar girin.";
    if (step === 2 && pools.some((pool) => selectedLocales.some((locale) => {
      const translation = pool.translations[locale];
      return !translation.title.trim() || !translation.description.trim() || !translation.category;
    }))) return "Seçtiğiniz her dilde başlık, kategori ve kısa açıklama zorunludur.";

    return null;
  }

  function goNext() {
    const error = validateCurrentStep();
    setStepError(error);
    if (!error) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  function jumpToStep(index: number) {
    if (index <= step) {
      setStepError(null);
      setStep(index);
    }
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={isEditing ? "inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] px-3 py-2 text-sm font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]" : "admin-action-button w-full sm:w-auto"}
        onClick={openDialog}
        type="button"
      >
        {isEditing ? <Pencil aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
        {isEditing ? "Bağış alanını düzenle" : "Yeni bağış alanı"}
      </button>

      <dialog
        aria-describedby="funding-wizard-description"
        aria-labelledby="funding-wizard-title"
        className="admin-modal m-auto w-[calc(100%-1.5rem)] max-w-5xl overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-0 text-[var(--admin-text)] shadow-2xl"
        onClose={handleDialogClose}
        ref={dialogRef}
      >
        <form action={action} className="flex max-h-[calc(100dvh-1.5rem)] flex-col">
          <input name="collection" type="hidden" value="campaigns" />
          {record ? <input name="id" type="hidden" value={record.id} /> : null}
          <input name="fundingPools" type="hidden" value={JSON.stringify(pools)} />
          <input name="selectedLocales" type="hidden" value={selectedLocales.join(",")} />

          <header className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-raised)] px-5 py-4 sm:px-7 sm:py-5">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-primary-strong)]">Bağış alanı sihirbazı</p>
                <h2 className="mt-1 text-xl font-bold text-[var(--admin-text)]" id="funding-wizard-title">
                  {isEditing ? "Bağış alanını düzenle" : "Yeni bağış alanı oluştur"}
                </h2>
                <p className="mt-1 text-sm text-[var(--admin-muted)]" id="funding-wizard-description">
                  Her para birimi bağımsız bir finansal havuzdur; seçilen dillerde içeriklerini tamamlayın.
                </p>
              </div>
              <button
                aria-label="Sihirbazı kapat"
                className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--admin-muted)] transition hover:bg-[var(--admin-surface-muted)] hover:text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
                onClick={closeDialog}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Oluşturma adımları">
              {steps.map((item, index) => {
                const active = index === step;
                const complete = index < step;
                return (
                  <li key={item.title}>
                    <button
                      aria-current={active ? "step" : undefined}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)] ${active ? "border-[var(--admin-primary)] bg-[rgb(166_215_178_/_18%)]" : "border-[var(--admin-border)] bg-white"} ${index > step ? "cursor-not-allowed opacity-55" : "hover:bg-[var(--admin-surface-muted)]"}`}
                      disabled={index > step}
                      onClick={() => jumpToStep(index)}
                      type="button"
                    >
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${active || complete ? "bg-[var(--admin-primary-strong)] text-white" : "bg-[var(--admin-surface-muted)] text-[var(--admin-muted)]"}`}>
                        {complete ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold">{item.title}</span>
                        <span className="hidden truncate text-[11px] text-[var(--admin-muted)] sm:block">{item.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {step === 0 ? (
              <fieldset>
                <legend className="text-lg font-bold text-[var(--admin-text)]">Dilleri ve para birimlerini seçin</legend>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--admin-muted)]">Her para biriminin kendi hedefi ve finansal havuzu olur. Seçtiğiniz tüm dillerde, her havuz için içerik girersiniz.</p>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Diller</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {locales.map((locale) => (
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold transition hover:border-[var(--admin-primary)]" key={locale.value}>
                      <input checked={selectedLocales.includes(locale.value)} className="size-4 accent-[var(--admin-primary-strong)]" onChange={() => toggleLocale(locale.value)} type="checkbox" />
                      {locale.label}
                    </label>
                  ))}
                </div>

                <p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Para birimleri</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {currencies.map((currency) => (
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold transition hover:border-[var(--admin-primary)]" key={currency}>
                      <input checked={pools.some((pool) => pool.currency === currency)} className="size-4 accent-[var(--admin-primary-strong)]" onChange={() => toggleCurrency(currency)} type="checkbox" />
                      {currency}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">Havuz hedeflerini belirleyin</h3>
                  <p className="mt-1 text-sm text-[var(--admin-muted)]">Tutarlar birbirinden bağımsızdır ve seçilen para biriminde toplanır.</p>
                </div>
                {pools.map((pool, index) => (
                  <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-5" key={pool.currency}>
                    <h4 className="font-bold text-[var(--admin-text)]">{pool.currency} havuzu</h4>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <label>
                        <span className="mb-1.5 block text-xs font-bold">Hedef tutar</span>
                        <input className="admin-input" min="0" onChange={(event) => updatePool(index, { targetAmount: event.target.value })} type="number" value={pool.targetAmount} />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-bold">Raporlama</span>
                        <select className="admin-input" onChange={(event) => updatePool(index, { reportingMode: event.target.value as Pool["reportingMode"] })} value={pool.reportingMode}>
                          <option value="pool">Havuz</option>
                          <option value="donation_based">Bağış bazlı</option>
                        </select>
                      </label>
                      <label className="mt-6 flex min-h-11 items-center gap-2 text-sm font-semibold">
                        <input checked={pool.isDonationOpen} className="size-4 accent-[var(--admin-primary-strong)]" onChange={(event) => updatePool(index, { isDonationOpen: event.target.checked })} type="checkbox" />
                        Bağışa açık
                      </label>
                    </div>
                  </section>
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">Havuz içeriklerini yazın</h3>
                  <p className="mt-1 text-sm text-[var(--admin-muted)]">Her seçili dil, her para birimi için zorunludur.</p>
                </div>
                {pools.map((pool, poolIndex) => (
                  <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-5" key={pool.currency}>
                    <h4 className="font-bold text-[var(--admin-text)]">{pool.currency} havuzu</h4>
                    <div className="mt-4 grid gap-4 xl:grid-cols-3">
                      {locales.filter((locale) => selectedLocales.includes(locale.value)).map((locale) => (
                        <fieldset className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-4 shadow-sm" dir={locale.value === "ar" ? "rtl" : "ltr"} key={locale.value}>
                          <legend className="rounded-full bg-[var(--admin-primary)] px-3 py-1 text-xs font-bold text-white">{locale.label}</legend>
                          <div className="mt-2 grid gap-4">
                            <label>
                              <span className="mb-1.5 block text-xs font-bold">Başlık</span>
                              <input className="admin-input" onChange={(event) => updateTranslation(poolIndex, locale.value, { title: event.target.value })} value={pool.translations[locale.value].title} />
                            </label>
                            <label>
                              <span className="mb-1.5 block text-xs font-bold">Kategori</span>
                              <select className="admin-input" onChange={(event) => updateTranslation(poolIndex, locale.value, { category: event.target.value })} value={pool.translations[locale.value].category}>
                                <option value="">Seçiniz</option>
                                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            </label>
                            <label className="sm:col-span-2">
                              <span className="mb-1.5 block text-xs font-bold">Kısa açıklama</span>
                              <textarea className="admin-input min-h-28" onChange={(event) => updateTranslation(poolIndex, locale.value, { description: event.target.value })} value={pool.translations[locale.value].description} />
                            </label>
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold">Görsel ve son kontrol</h3>
                  <p className="mt-1 text-sm text-[var(--admin-muted)]">Kapak görseli Supabase Storage&apos;a yüklenir; URL Türkçe başlıktan bir kez oluşturulur ve ortak kalır.</p>
                </div>
                <label className="block rounded-xl border border-dashed border-[var(--admin-border)] bg-white p-5">
                  <span className="mb-2 block text-sm font-bold">Kapak fotoğrafı</span>
                  <input accept="image/jpeg,image/png,image/webp" className="admin-input" name="coverImage" type="file" />
                  <span className="mt-2 block text-xs text-[var(--admin-muted)]">JPEG, PNG veya WebP yükleyin.</span>
                </label>
                <div className="rounded-xl border border-[rgb(166_215_178_/_35%)] bg-[rgb(166_215_178_/_12%)] p-4 text-sm text-[var(--admin-text)]">
                  <p className="font-bold">Oluşturulacak finansal havuzlar</p>
                  <ul className="mt-2 space-y-1 text-[var(--admin-muted)]">
                    {pools.map((pool) => <li key={pool.currency}>{pool.currency}: {pool.targetAmount || "0"} hedef, {pool.isDonationOpen ? "bağışa açık" : "pasif"}</li>)}
                  </ul>
                </div>
              </div>
            ) : null}

            {stepError ? <p aria-live="polite" className="mt-5 rounded-lg bg-[rgb(240_140_123_/_15%)] px-4 py-3 text-sm font-semibold text-[var(--admin-danger)]">{stepError}</p> : null}
            {state.message ? <p aria-live="polite" className={state.success ? "mt-5 rounded-lg bg-[rgb(166_215_178_/_15%)] px-4 py-3 text-sm font-semibold text-[var(--admin-primary-strong)]" : "mt-5 rounded-lg bg-[rgb(240_140_123_/_15%)] px-4 py-3 text-sm font-semibold text-[var(--admin-danger)]"}>{state.message}</p> : null}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-[var(--admin-border)] bg-[var(--admin-surface-raised)] px-5 py-4 sm:px-7">
            <button className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50" disabled={step === 0} onClick={goBack} type="button">
              <ChevronLeft aria-hidden="true" className="size-4" /> Geri
            </button>
            {step < steps.length - 1 ? (
              <button className="admin-action-button w-auto" onClick={goNext} type="button">
                Devam et <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            ) : (
              <button className="admin-action-button w-auto" type="submit">
                {isEditing ? <Pencil aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
                {isEditing ? "Değişiklikleri kaydet" : "Bağış alanını oluştur"}
              </button>
            )}
          </footer>
        </form>
      </dialog>
    </>
  );
}
