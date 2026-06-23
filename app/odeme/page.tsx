"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type PaymentMethod = "credit-card" | "bank-transfer" | "digital-wallet";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  tcKimlik: string;
  donationNote: string;
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
  taxReceipt: boolean;
  saveCard: boolean;
  kvkk: boolean;
  terms: boolean;
}

export default function OdemePage() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit-card");
  const [form, setForm] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    tcKimlik: "",
    donationNote: "",
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvv: "",
    taxReceipt: false,
    saveCard: false,
    kvkk: false,
    terms: false,
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    },
    []
  );

  const handleCardNumber = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 16);
      const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
      setForm((prev) => ({ ...prev, cardNumber: formatted }));
    },
    []
  );

  const handleExpiry = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
      if (v.length > 2) v = v.slice(0, 2) + " / " + v.slice(2, 4);
      setForm((prev) => ({ ...prev, expiry: v }));
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Bağış formu gönderildi:", form);
  };

  const copyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-surface shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center px-margin-desktop py-4 max-w-container-max mx-auto w-full">
          <span className="text-headline-xl font-bold text-primary">Mizan Derneği</span>
          <div className="flex items-center gap-md">
            <div className="hidden md:flex items-center gap-xs text-on-surface-variant text-label-md">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>lock</span>
              Güvenli Ödeme Sayfası
            </div>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center gap-xs text-primary text-label-md hover:opacity-80 transition-all"
            >
              <span className="material-symbols-outlined">close</span>
              Vazgeç
            </button>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <main className="max-w-container-max mx-auto px-margin-desktop py-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-7 space-y-md">
            <section className="bg-surface-container-lowest p-md rounded-lg shadow-soft">
              <h2 className="text-headline-md text-primary mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined">person</span>
                Bağışçı Bilgileri
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="flex flex-col gap-xs">
                  <label className="text-label-md text-on-surface-variant" htmlFor="fullName">Ad Soyad</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={handleChange}
                    className="border border-outline-variant p-sm rounded-lg bg-surface-bright transition-all"
                    placeholder="Mehmet Yılmaz"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-label-md text-on-surface-variant" htmlFor="email">E-Posta</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="border border-outline-variant p-sm rounded-lg bg-surface-bright transition-all"
                    placeholder="mehmet@example.com"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-label-md text-on-surface-variant" htmlFor="phone">Telefon Numarası</label>
                  <div className="flex">
                    <div className="flex items-center gap-xs border border-outline-variant border-r-0 px-sm rounded-l-lg bg-surface-container-low text-label-md">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>flag</span>
                      +90
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className="flex-1 border border-outline-variant p-sm rounded-r-lg bg-surface-bright transition-all"
                      placeholder="5xx xxx xx xx"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-label-md text-on-surface-variant" htmlFor="tcKimlik">T.C. Kimlik No (Opsiyonel)</label>
                  <input
                    id="tcKimlik"
                    name="tcKimlik"
                    type="text"
                    maxLength={11}
                    value={form.tcKimlik}
                    onChange={handleChange}
                    className="border border-outline-variant p-sm rounded-lg bg-surface-bright transition-all"
                    placeholder="12345678901"
                  />
                </div>
              </div>
              <div className="mt-md flex items-center gap-sm">
                <input
                  id="taxReceipt"
                  name="taxReceipt"
                  type="checkbox"
                  checked={form.taxReceipt}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <label htmlFor="taxReceipt" className="text-body-md text-on-surface-variant cursor-pointer">
                  Bağış makbuzu istiyorum (Vergi indirimi için gereklidir)
                </label>
              </div>
            </section>

            <section className="bg-surface-container-lowest p-md rounded-lg shadow-soft">
              <h2 className="text-headline-md text-primary mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined">edit_note</span>
                Bağış Notu
              </h2>
              <textarea
                name="donationNote"
                value={form.donationNote}
                onChange={handleChange}
                className="w-full border border-outline-variant p-sm rounded-lg bg-surface-bright transition-all resize-none"
                placeholder="Bağışınızla ilgili eklemek istediğiniz bir not varsa buraya yazabilirsiniz..."
                rows={3}
              />
            </section>

            <section className="bg-surface-container-lowest p-md rounded-lg shadow-soft overflow-hidden">
              <h2 className="text-headline-md text-primary mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined">payments</span>
                Ödeme Yöntemi
              </h2>
              <div className="flex border-b border-outline-variant mb-md overflow-x-auto whitespace-nowrap">
                {[
                  { id: "credit-card" as const, label: "Kredi / Banka Kartı" },
                  { id: "bank-transfer" as const, label: "Banka Havalesi / EFT" },
                  { id: "digital-wallet" as const, label: "Dijital Cüzdan" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPaymentMethod(tab.id)}
                    className={cn(
                      "px-md py-sm text-label-md transition-all",
                      paymentMethod === tab.id
                        ? "text-primary border-b-2 border-primary"
                        : "text-on-surface-variant hover:text-primary"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "credit-card" && (
                <div className="space-y-md">
                  <div className="flex flex-col gap-xs">
                    <label className="text-label-md text-on-surface-variant" htmlFor="cardNumber">Kart Numarası</label>
                    <div className="relative">
                      <input
                        id="cardNumber"
                        name="cardNumber"
                        type="text"
                        value={form.cardNumber}
                        onChange={handleCardNumber}
                        className="w-full border border-outline-variant p-sm rounded-lg bg-surface-bright pr-10"
                        placeholder="0000 0000 0000 0000"
                      />
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary">credit_card</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="flex flex-col gap-xs">
                      <label className="text-label-md text-on-surface-variant" htmlFor="cardName">Kart Üzerindeki İsim</label>
                      <input
                        id="cardName"
                        name="cardName"
                        type="text"
                        value={form.cardName}
                        onChange={handleChange}
                        className="border border-outline-variant p-sm rounded-lg bg-surface-bright"
                        placeholder="MEHMET YILMAZ"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-sm">
                      <div className="flex flex-col gap-xs">
                        <label className="text-label-md text-on-surface-variant" htmlFor="expiry">Son Kullanma</label>
                        <input
                          id="expiry"
                          name="expiry"
                          type="text"
                          value={form.expiry}
                          onChange={handleExpiry}
                          className="border border-outline-variant p-sm rounded-lg bg-surface-bright"
                          placeholder="AA / YY"
                        />
                      </div>
                      <div className="flex flex-col gap-xs">
                        <label className="text-label-md text-on-surface-variant" htmlFor="cvv">CVV</label>
                        <input
                          id="cvv"
                          name="cvv"
                          type="password"
                          maxLength={4}
                          value={form.cvv}
                          onChange={handleChange}
                          className="border border-outline-variant p-sm rounded-lg bg-surface-bright"
                          placeholder="***"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-surface-container-low p-sm rounded-lg border border-outline-variant">
                    <div className="flex items-center gap-sm">
                      <input
                        id="saveCard"
                        name="saveCard"
                        type="checkbox"
                        checked={form.saveCard}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-outline-variant text-primary"
                      />
                      <label htmlFor="saveCard" className="text-label-md text-on-surface-variant">Kartımı güvenle kaydet</label>
                    </div>
                    <div
                      className="flex items-center gap-xs text-primary font-bold opacity-60 grayscale hover:grayscale-0 transition-all cursor-help"
                      title="3D Secure Güvenlik Sistemi"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>
                      <span className="text-[10px]">3D SECURE</span>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "bank-transfer" && (
                <div className="space-y-sm">
                  <p className="text-label-md text-on-surface-variant mb-sm">
                    Lütfen açıklamaya bağışçı adınızı yazmayı unutmayınız.
                  </p>
                  <div className="space-y-sm">
                    {[
                      { bank: "Kuveyt Türk Katılım Bankası", iban: "TR90 0000 0000 0000 0000 0000 00" },
                      { bank: "Albaraka Türk Katılım Bankası", iban: "TR12 0000 0000 0000 0000 0000 00" },
                    ].map((item) => (
                      <div
                        key={item.bank}
                        className="p-sm bg-surface-container rounded-lg flex justify-between items-center group cursor-pointer hover:bg-primary-container hover:bg-opacity-5"
                      >
                        <div>
                          <p className="text-label-sm text-primary">{item.bank}</p>
                          <p className="font-mono text-body-md">{item.iban}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyIban(item.iban)}
                          className="text-primary hover:scale-110 transition-transform"
                        >
                          <span className="material-symbols-outlined">content_copy</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod === "digital-wallet" && (
                <div className="text-center py-lg text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] mb-sm opacity-20">account_balance_wallet</span>
                  <p className="text-body-md">
                    Masterpass, BKM Express ve PayTR Cüzdan ödemeleri yakında aktif olacaktır.
                  </p>
                </div>
              )}
            </section>

            <div className="space-y-sm mt-md">
              <div className="flex items-start gap-sm">
                <input
                  id="kvkk"
                  name="kvkk"
                  type="checkbox"
                  checked={form.kvkk}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 rounded border-outline-variant text-primary"
                />
                <label htmlFor="kvkk" className="text-label-md text-on-surface-variant leading-tight">
                  <a className="text-primary underline" href="#">KVKK Aydınlatma Metni</a>
                  &apos;ni okudum ve kabul ediyorum. Verilerimin işlenmesine onay veriyorum.
                </label>
              </div>
              <div className="flex items-start gap-sm">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={form.terms}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 rounded border-outline-variant text-primary"
                />
                <label htmlFor="terms" className="text-label-md text-on-surface-variant leading-tight">
                  <a className="text-primary underline" href="#">Bağışçı Sözleşmesi</a>
                  &nbsp;ve Mesafeli Satış Şartları&apos;nı onaylıyorum.
                </label>
              </div>
              <button
                type="submit"
                className="w-full donate-gradient text-white font-bold py-md rounded-lg shadow-teal-ambient flex items-center justify-center gap-md group active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined group-hover:animate-bounce">lock</span>
                <span className="text-headline-md">Bağışımı Tamamla</span>
              </button>
              <p className="text-center text-label-sm text-outline flex items-center justify-center gap-xs">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>shield_lock</span>
                256-bit SSL Güvenlik Sertifikası ile tüm bilgileriniz korunmaktadır.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-md">
            <aside className="sticky top-[100px]">
              <div className="bg-surface-container-lowest p-md rounded-lg shadow-soft border-t-4 border-secondary-container">
                <h2 className="text-headline-md text-primary mb-md flex items-center justify-between">
                  Bağış Özeti
                  <button type="button" className="text-label-sm text-outline font-normal hover:text-primary transition-colors">
                    Düzenle
                  </button>
                </h2>
                <div className="space-y-md mb-lg">
                  <div className="flex items-start gap-sm">
                    <div className="bg-secondary-container bg-opacity-20 p-xs rounded-lg">
                      <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-label-md">
                        <span className="text-on-surface">Su Kuyusu Bağışı</span>
                        <span className="text-primary font-bold">1.500 ₺</span>
                      </div>
                      <p className="text-label-sm text-on-surface-variant">Çad Bölgesi - 1 Hisse</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-sm">
                    <div className="bg-secondary-container bg-opacity-20 p-xs rounded-lg">
                      <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-label-md">
                        <span className="text-on-surface">Eğitim Destek Paketi</span>
                        <span className="text-primary font-bold">500 ₺</span>
                      </div>
                      <p className="text-label-sm text-on-surface-variant">Yetim Eğitim Projesi</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-outline-variant pt-md space-y-sm">
                  <div className="flex justify-between text-headline-md text-primary">
                    <span>Toplam</span>
                    <span className="font-bold">2.000 ₺</span>
                  </div>
                  <div className="flex justify-between text-label-sm text-outline font-normal">
                    <span>Döviz Karşılığı (Tahmini)</span>
                    <span>~ 58.40 USD / 53.90 EUR</span>
                  </div>
                </div>
                <div className="mt-lg bg-primary bg-opacity-5 p-md rounded-xl border border-primary border-dashed relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-primary font-bold text-headline-md mb-xs flex items-center gap-xs">
                      <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                      Büyük Etki!
                    </p>
                    <p className="text-body-md text-on-surface-variant">
                      Bu bağışla <span className="font-bold text-primary">2 aileye</span> temiz su ulaştıracak ve{" "}
                      <span className="font-bold text-primary">1 öğrencinin</span> yıllık eğitim masrafını karşılayacaksınız.
                    </p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-10 text-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: 120 }}>diversity_1</span>
                  </div>
                </div>
              </div>

              <div className="mt-md space-y-md">
                <div className="bg-surface-container-low p-md rounded-lg flex flex-col gap-sm">
                  <div className="flex items-center gap-sm">
                    <span className="text-material-symbols text-primary text-label-md">🇹🇷</span>
                    <p className="text-label-sm font-bold text-on-surface-variant">MİZAN İNSANİ YARDIM DERNEĞİ</p>
                  </div>
                  <div className="grid grid-cols-2 gap-sm text-[11px] text-outline">
                    <div>Kütük No: 34-245-055</div>
                    <div>Vergi Dairesi: Ümraniye</div>
                    <div>Vergi No: 6220815124</div>
                    <div className="flex items-center gap-xs text-primary font-bold">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      Resmi Kamu Yararı Statüsü
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-sm">
                  <div className="flex gap-md opacity-40 grayscale hover:grayscale-0 transition-all">
                    <span className="material-symbols-outlined text-[32px]">credit_card</span>
                    <span className="material-symbols-outlined text-[32px]">security</span>
                    <span className="material-symbols-outlined text-[32px]">language</span>
                  </div>
                  <a className="flex items-center gap-xs text-primary text-label-md hover:underline" href="tel:02160000000">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>support_agent</span>
                    Yardım Merkezi
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </form>
    </div>
  );
}
