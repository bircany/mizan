"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";

const campaigns = [
  {
    id: "su-kuyusu",
    title: "Mizan Su Kuyuları Projesi",
    description:
      "Temiz suya erişimi olmayan kardeşlerimiz için kalıcı çözümler üretiyoruz. Afrika'nın kırsal bölgelerinde açtığımız su kuyuları ile binlerce insanın temiz içme suyuna kavuşmasını sağlıyoruz. Her bir kuyu, bir köyün kaderini değiştiriyor.",
    category: "Su Kuyusu",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDnIPwrfRLrudRXSUCe8iQSWYdiYaXfJrsLQGohophjtkc06TsQ-g3bmmb9ahl7Al7KPFvEjjuY1xmh9UU69ozWwI8o8yLy6qtg3m9d2SaCVrU_uRq6caklCq1uzBKNOsO2lsShaog2w3y4Hoy2U49cd0IX_6pYDZITQTPsJpifj0I1yUma3j5oMkACRH7ycCV2e7AnegG8Du1Psks_LlaJKuGHDTCjSoVQvqiGDfRnGRWpdoFEH11mXwcAPThS6KHpdm9odU1fs6Jp",
    collected: 32400,
    target: 45000,
    donors: 1248,
    quickAmounts: [100, 250, 500, 1000],
  },
  {
    id: "yetim",
    title: "Bir Yetim Gülsün Dünya Gülsün",
    description:
      "Yetimlerimizin barınma, gıda ve eğitim masraflarına sponsor olarak geleceklerine ışık tutun. Düzenli sponsorluk sistemi ile bir yetimin tüm ihtiyaçlarını karşılayabilir, onun büyüme hikayesine ortak olabilirsiniz.",
    category: "Yetim",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBJC1zi1wrmC724eQykm3zfLh8PDw00MvA9z-teXi0AA1kwJCpBW8kdrgW47nm4iyYY50cNDBQNx5g1R1VGeHBstcBzuK8eyoQuNMInZ0Dvjg6lYvdmVx4iWN5RTUU8zZGlYzPTKjZxnrHi5noinWaUK6eW0TRv8vbBxzvjDlv72LflihcrEytw4RaEUb193MDAT91lg5HNUGrQIgc6q9gIVRNO3zTYwYY-WafDDCCwoovz669PVMANKBScZpMQF0nt9mLu3UzzwPud",
    collected: 11250,
    target: 25000,
    donors: 856,
    quickAmounts: [250, 500, 1000, 2500],
  },
  {
    id: "kurban-2024",
    title: "2024 Kurban Bağışı",
    description:
      "Kurban vekaletlerinizi ihtiyaç sahiplerine ulaştırıyoruz. İslami usullere uygun kesimler, hijyenik koşullarda gerçekleştirilmekte ve bağışçılarımıza görsel bilgilendirme yapılmaktadır. Afrika, Yemen, Suriye ve Türkiye'deki ihtiyaç sahiplerine ulaştırıyoruz.",
    category: "Kurban",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDnIPwrfRLrudRXSUCe8iQSWYdiYaXfJrsLQGohophjtkc06TsQ-g3bmmb9ahl7Al7KPFvEjjuY1xmh9UU69ozWwI8o8yLy6qtg3m9d2SaCVrU_uRq6caklCq1uzBKNOsO2lsShaog2w3y4Hoy2U49cd0IX_6pYDZITQTPsJpifj0I1yUma3j5oMkACRH7ycCV2e7AnegG8Du1Psks_LlaJKuGHDTCjSoVQvqiGDfRnGRWpdoFEH11mXwcAPThS6KHpdm9odU1fs6Jp",
    collected: 81600,
    target: 120000,
    donors: 2100,
    quickAmounts: [500, 1000, 2500, 5000],
  },
  {
    id: "mescid",
    title: "Mescid Projeleri",
    description:
      "Allah'ın evlerini imar ederek sevaba ortak olun. İhtiyaç bölgelerinde mescit ve medrese inşa projelerimizle hem ibadet hem de eğitim hizmetlerini bir arada sunuyoruz. Her bir mescit, bir topluluğun merkezi haline geliyor.",
    category: "Mescid",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBJC1zi1wrmC724eQykm3zfLh8PDw00MvA9z-teXi0AA1kwJCpBW8kdrgW47nm4iyYY50cNDBQNx5g1R1VGeHBstcBzuK8eyoQuNMInZ0Dvjg6lYvdmVx4iWN5RTUU8zZGlYzPTKjZxnrHi5noinWaUK6eW0TRv8vbBxzvjDlv72LflihcrEytw4RaEUb193MDAT91lg5HNUGrQIgc6q9gIVRNO3zTYwYY-WafDDCCwoovz669PVMANKBScZpMQF0nt9mLu3UzzwPud",
    collected: 24000,
    target: 80000,
    donors: 340,
    quickAmounts: [250, 500, 1000, 2000],
  },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const campaign = campaigns.find((c) => c.id === slug);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  if (!campaign) {
    return (
      <section className="max-w-container-max mx-auto px-margin-desktop py-xl text-center">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant block mb-md">search</span>
        <h1 className="font-headline-xl text-headline-xl text-on-surface mb-sm">Kampanya Bulunamadı</h1>
        <p className="text-body-md text-on-surface-variant mb-lg">Aradığınız kampanya mevcut değil.</p>
        <Link href="/bagis" className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold inline-flex items-center gap-2 hover:opacity-90 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
          Tüm Bağış Alanları
        </Link>
      </section>
    );
  }

  const progress = Math.round((campaign.collected / campaign.target) * 100);

  function handleAmountPreset(amount: number) {
    setSelectedAmount(amount);
    setCustomAmount("");
  }

  function handleCustomChange(value: string) {
    setCustomAmount(value);
    setSelectedAmount(null);
  }

  const donationAmount = selectedAmount ?? (customAmount ? parseInt(customAmount) : 0);

  return (
    <>
      <nav aria-label="Breadcrumb" className="max-w-container-max mx-auto px-margin-desktop pt-md">
        <ol className="flex items-center space-x-2 text-label-sm text-on-surface-variant">
          <li>
            <Link href="/" className="hover:text-primary transition-colors">Anasayfa</Link>
          </li>
          <li>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          </li>
          <li>
            <Link href="/bagis" className="hover:text-primary transition-colors">Bağış Yap</Link>
          </li>
          <li>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          </li>
          <li className="text-primary font-bold truncate max-w-[200px]">{campaign.title}</li>
        </ol>
      </nav>

      <section className="relative h-[320px] md:h-[400px] overflow-hidden">
        <Image
          src={campaign.image}
          alt={campaign.title}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-container-max mx-auto px-margin-desktop pb-lg">
          <span className="bg-primary text-white px-4 py-1.5 rounded-full text-label-sm font-bold inline-block mb-sm">
            {campaign.category}
          </span>
          <h1 className="text-display-lg-mobile md:text-display-lg text-white max-w-3xl">
            {campaign.title}
          </h1>
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8 space-y-lg">
            <div className="bg-surface rounded-xl p-lg shadow-soft border border-surface-container">
              <div className="mb-md">
                <div className="flex justify-between items-center mb-xs">
                  <span className="font-label-md text-label-md text-primary font-bold">
                    %{progress} Tamamlandı
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    {campaign.donors.toLocaleString("tr-TR")} bağışçı
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-sm">
                  <span className="text-body-md font-bold text-on-surface">
                    Toplanan: {formatCurrency(campaign.collected)}
                  </span>
                  <span className="text-body-md text-on-surface-variant">
                    Hedef: {formatCurrency(campaign.target)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-lg shadow-soft border border-surface-container">
              <h2 className="font-headline-md text-headline-md text-primary mb-md">Proje Detayı</h2>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {campaign.description}
              </p>
              <p className="text-body-md text-on-surface-variant leading-relaxed mt-md">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="text-body-md text-on-surface-variant leading-relaxed mt-md">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-[100px] bg-surface rounded-xl p-lg shadow-soft border border-surface-container space-y-md">
              <h3 className="font-headline-md text-headline-md text-primary">
                Bağış Yap
              </h3>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-sm">Tutar Seçin</label>
                <div className="grid grid-cols-2 gap-xs">
                  {campaign.quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountPreset(amount)}
                      className={cn(
                        "py-3 rounded-lg border font-label-md font-bold transition-all",
                        selectedAmount === amount
                          ? "bg-primary text-on-primary border-primary"
                          : "border-outline-variant text-on-surface hover:border-primary hover:text-primary"
                      )}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Özel Tutar</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-label-md">₺</span>
                  <input
                    type="number"
                    min={1}
                    value={customAmount}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    placeholder="Diğer"
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
                  />
                </div>
              </div>

              {donationAmount > 0 && (
                <div className="bg-primary-container/20 rounded-lg p-md text-center">
                  <span className="text-label-md text-on-surface-variant block mb-xs">Bağış Tutarı</span>
                  <span className="text-headline-xl text-primary font-bold">{formatCurrency(donationAmount)}</span>
                </div>
              )}

              <button
                disabled={donationAmount <= 0}
                className={cn(
                  "w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all",
                  donationAmount > 0
                    ? "bg-secondary text-on-secondary hover:opacity-90 active:scale-95"
                    : "bg-surface-container text-on-surface-variant cursor-not-allowed"
                )}
              >
                <span className="material-symbols-outlined">shopping_cart</span>
                Sepete Ekle
              </button>

              <div className="flex items-center gap-2 text-label-sm text-on-surface-variant justify-center pt-2 border-t border-surface-container">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Güvenli ödeme</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
