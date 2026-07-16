"use client";

import { useState } from "react";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_E164, SUPPORT_WHATSAPP_URL } from "@/lib/contact";

export default function IletisimPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <section className="relative h-[280px] bg-gradient-to-r from-primary to-primary-container flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <div className="relative z-10 text-center px-margin-mobile">
          <span className="material-symbols-outlined text-white text-5xl mb-sm block" style={{ fontVariationSettings: '"FILL" 1' }}>
            contact_mail
          </span>
          <h1 className="text-display-lg-mobile md:text-display-lg text-white mb-2">
            İletişim
          </h1>
          <div className="w-16 h-1 bg-gold mx-auto rounded-full" />
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-4 space-y-md">
            <div className="bg-surface rounded-xl p-md shadow-soft border border-surface-container">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-primary text-[28px] flex-shrink-0" style={{ fontVariationSettings: '"FILL" 1' }}>
                  location_on
                </span>
                <div>
                  <h3 className="font-label-md text-label-md font-bold text-on-surface mb-xs">Adres</h3>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    Şehit Mehmet Efendi Bulvarı No:42<br />
                    Elbistan / Kahramanmaraş
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-md shadow-soft border border-surface-container">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-primary text-[28px] flex-shrink-0" style={{ fontVariationSettings: '"FILL" 1' }}>
                  call
                </span>
                <div>
                  <h3 className="font-label-md text-label-md font-bold text-on-surface mb-xs">Telefon</h3>
                  <a className="block text-body-md text-on-surface-variant leading-relaxed hover:text-primary transition-colors" href={`tel:${SUPPORT_PHONE_E164}`}>
                    {SUPPORT_PHONE_DISPLAY}
                  </a>
                  <a className="mt-1 block text-body-md text-on-surface-variant leading-relaxed hover:text-primary transition-colors" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">
                    WhatsApp: {SUPPORT_PHONE_DISPLAY}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-md shadow-soft border border-surface-container">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-primary text-[28px] flex-shrink-0" style={{ fontVariationSettings: '"FILL" 1' }}>
                  mail
                </span>
                <div>
                  <h3 className="font-label-md text-label-md font-bold text-on-surface mb-xs">E-posta</h3>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    info@mizandernegi.org
                  </p>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    bagis@mizandernegi.org
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary-container text-on-primary-container rounded-xl p-md shadow-soft">
              <h3 className="font-headline-md text-headline-md mb-sm">Çalışma Saatleri</h3>
              <div className="space-y-2 text-body-md">
                <div className="flex justify-between">
                  <span>Hafta İçi</span>
                  <span className="font-medium">09:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Cumartesi</span>
                  <span className="font-medium">09:00 - 13:00</span>
                </div>
                <div className="flex justify-between opacity-70">
                  <span>Pazar</span>
                  <span className="font-medium">Kapalı</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-md">
            <div className="bg-surface rounded-xl p-lg shadow-soft border border-surface-container">
              <h2 className="font-headline-xl text-headline-xl text-primary mb-sm">Bize Ulaşın</h2>
              <p className="text-body-md text-on-surface-variant mb-lg">
                Sorularınız, önerileriniz veya bağış talepleriniz için aşağıdaki formu doldurabilirsiniz.
              </p>

              {submitted ? (
                <div className="bg-primary-container/20 border border-primary-container rounded-xl p-lg text-center">
                  <span className="material-symbols-outlined text-primary text-5xl mb-sm block" style={{ fontVariationSettings: '"FILL" 1' }}>
                    check_circle
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">Mesajınız Alındı</h3>
                  <p className="text-body-md text-on-surface-variant">
                    En kısa sürede size dönüş yapacağız. Teşekkür ederiz.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-xs">Adınız Soyadınız</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Adınız ve soyadınız"
                        className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-xs">E-posta Adresiniz</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="ornek@email.com"
                        className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-xs">Telefon</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="05XX XXX XX XX"
                        className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-xs">Konu</label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                      >
                        <option value="">Konu seçin</option>
                        <option value="bagis">Bağış</option>
                        <option value="kurban">Kurban</option>
                        <option value="gonullu">Gönüllülük</option>
                        <option value="bilgi">Bilgi Talebi</option>
                        <option value="diger">Diğer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-xs">Mesajınız</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Mesajınızı buraya yazın..."
                      className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">send</span>
                    Mesajı Gönder
                  </button>
                </form>
              )}
            </div>

            <div className="bg-surface rounded-xl overflow-hidden shadow-soft border border-surface-container">
              <div className="bg-surface-container-low px-md py-4 border-b border-surface-container">
                <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">map</span>
                  Konum
                </h3>
              </div>
              <div className="h-[300px] bg-surface-container-higher flex items-center justify-center">
                <div className="text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl block mb-sm">map</span>
                  <p className="text-body-md">Google Maps entegrasyonu burada yer alacak</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
