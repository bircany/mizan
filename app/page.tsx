"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useCurrency } from "@/lib/currency-context";
import ChildInteractiveDonate from "@/components/home/ChildInteractiveDonate";

const slides = [
  {
    img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1920&q=80",
    title: "Elbistan'ın Kalbinden Dünyaya Uzanan Hayır",
  },
  {
    img: "https://images.unsplash.com/photo-1594708767771-a7502209ff51?auto=format&fit=crop&w=1920&q=80",
    title: "Bir Nefeste Umut, Bir Damlada Hayat",
  },
  {
    img: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1920&q=80",
    title: "Mazlumlara Uzanan İyilik Eli",
  },
];

const donationTabs = [
  { label: "Kurban", icon: "payments" },
  { label: "Mescid", icon: "temple_hindu" },
  { label: "Medrese", icon: "school" },
  { label: "Yetim", icon: "child_care" },
  { label: "Su Kuyusu", icon: "water_drop" },
  { label: "Acil Yardım", icon: "emergency" },
  { label: "Sadaka", icon: "volunteer_activism" },
];

const campaigns = [
  {
    img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80",
    tag: "Kurban",
    title: "Afrika Kurban Organizasyonu",
    raised: 450000,
    target: 600000,
    percent: 75,
  },
  {
    img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80",
    tag: "İnşaat",
    title: "Mizan Mescidi İnşaatı",
    raised: 1200000,
    target: 3000000,
    percent: 40,
  },
  {
    img: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&q=80",
    tag: "Eğitim",
    title: "İslami İlimler Medresesi",
    raised: 85000,
    target: 100000,
    percent: 85,
  },
];

const news = [
  {
    img: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&q=80",
    date: "12 Mart 2024",
    title: "Ramazan Kumanya Dağıtımlarımız Başladı",
    desc: "Elbistan genelinde ihtiyaç sahibi ailelerimize ulaşmaya devam ediyoruz...",
  },
  {
    img: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600&q=80",
    date: "05 Mart 2024",
    title: "Çad'da Yeni Su Kuyumuz Açıldı",
    desc: "Temiz suya erişimi olmayan kardeşlerimiz için başlattığımız projemiz sonuç verdi.",
  },
  {
    img: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80",
    date: "28 Şubat 2024",
    title: "Medrese Eğitim Dönemi Kayıtları",
    desc: "Yeni dönem kayıtlarımız kontenjanlar dolmadan başlamıştır.",
  },
];

const stories = [
  {
    quote: "Mizan Derneği sayesinde köylerimizde artık temiz su akıyor. Çocuklarımız hastalıklarla boğuşmuyor. Teşekkürler Elbistan, teşekkürler Türkiye.",
    author: "Abdullah J.",
    role: "Yerel Köy Muhtarı, Çad",
    initial: "A",
  },
  {
    quote: "Gönüllü olarak katıldığım bu yardım seferberliğinde, bir yetimin yüzündeki gülümseme her şeye değerdi. Şeffaf ve dürüst çalışmanın karşılığı buydu.",
    author: "Mustafa K.",
    role: "Gönüllü Yardımsever",
    initial: "M",
  },
];

export default function HomePage() {
  const { t, dir } = useLanguage();
  const { formatPrice } = useCurrency();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div dir={dir}>
      {/* HERO SLIDER */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden group">
        <div
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="min-w-full h-full relative">
              <img
                alt={`Hero ${i + 1}`}
                className="w-full h-full object-cover"
                src={slide.img}
              />
              <div className="absolute inset-0 hero-gradient" />
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-container-max mx-auto px-margin-desktop w-full text-white">
                  <div className="max-w-2xl animate-fade-in-up">
                    <span className="inline-block bg-primary px-sm py-1 rounded text-label-sm uppercase tracking-wider mb-md">
                      {t("home.badge")}
                    </span>
                    <h1 className="text-display-lg max-sm:text-display-lg-mobile mb-lg leading-tight">
                      {i === 0 ? t("home.heroTitle") : i === 1 ? t("home.heroTitle2") : t("home.heroTitle3")}
                    </h1>
                    <div className="flex gap-md flex-wrap">
                      <Link
                        href="/bagis"
                        className="bg-secondary text-white px-xl py-lg rounded-lg text-headline-md shadow-lg hover:scale-105 transition-transform inline-block"
                      >
                        {t("common.donate")}
                      </Link>
                      <Link
                        href="/hakkimizda"
                        className="border-2 border-white text-white px-xl py-lg rounded-lg text-headline-md hover:bg-white hover:text-primary transition-all inline-block"
                      >
                        {t("common.learnMore")}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => goToSlide((currentSlide - 1 + slides.length) % slides.length)}
          className="absolute left-margin-desktop top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <button
          onClick={() => goToSlide((currentSlide + 1) % slides.length)}
          className="absolute right-margin-desktop top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                i === currentSlide ? "bg-white w-8" : "bg-white/50"
              )}
            />
          ))}
        </div>
      </section>

      {/* QUICK DONATION TABS */}
      <section className="py-xl lg:-mt-12 relative z-10 lg:mx-margin-desktop lg:rounded-xl lg:shadow-ambient bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="flex overflow-x-auto no-scrollbar gap-md justify-between">
            {donationTabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "flex-shrink-0 flex-1 flex flex-col items-center p-md rounded-xl cursor-pointer transition-all min-w-[80px]",
                  activeTab === i
                    ? "bg-secondary text-white scale-105"
                    : "bg-white text-on-surface-variant hover:bg-primary-fixed border border-outline-variant/30"
                )}
              >
                <span className="material-symbols-outlined text-[40px] mb-xs">{tab.icon}</span>
                <span className="text-label-sm whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CAMPAIGNS */}
      <section className="py-xl">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="flex justify-between items-end mb-lg">
            <div>
              <h2 className="text-headline-xl text-primary mb-2">{t("home.campaigns")}</h2>
              <div className="h-1.5 w-24 bg-secondary rounded-full" />
            </div>
            <Link href="/bagis" className="text-primary font-bold flex items-center gap-2 hover:underline">
              {t("home.allCampaigns")} <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {campaigns.map((campaign, i) => (
              <div
                key={i}
                className="bg-white rounded-xl overflow-hidden shadow-soft flex flex-col hover:shadow-ambient transition-all border border-outline-variant/10 bento-card"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    alt={campaign.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    src={campaign.img}
                  />
                  <span className="absolute top-4 left-4 bg-primary text-white px-sm py-1 rounded text-label-sm">
                    {campaign.tag}
                  </span>
                </div>
                <div className="p-md flex flex-col flex-grow">
                  <h3 className="text-headline-md text-on-surface mb-md">{campaign.title}</h3>
                  <div className="mt-auto">
                    <div className="flex justify-between text-label-sm mb-2 text-on-surface-variant">
                      <span>Toplanan: <b>{formatPrice(campaign.raised)}</b></span>
                      <span>Hedef: <b>{formatPrice(campaign.target)}</b></span>
                    </div>
                    <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden mb-lg">
                      <div
                        className="h-full bg-primary rounded-full progress-bar-fill"
                        style={{ width: `${campaign.percent}%` }}
                      />
                    </div>
                    <Link
                      href="/bagis"
                      className="block w-full bg-secondary text-white text-center py-3 rounded-lg text-label-md hover:bg-opacity-90 transition-all"
                    >
                      Hemen Bağış Yap
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT STATS */}
      <section className="bg-primary-container text-white py-xl">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-2 md:grid-cols-4 gap-xl text-center">
          <div>
            <span className="material-symbols-outlined text-[48px] text-secondary mb-md">send</span>
            <h4 className="text-display-lg max-sm:text-display-lg-mobile mb-2">954+</h4>
            <p className="text-label-sm opacity-80 uppercase tracking-widest">{t("home.shipments")}</p>
          </div>
          <div>
            <span className="material-symbols-outlined text-[48px] text-secondary mb-md">group</span>
            <h4 className="text-display-lg max-sm:text-display-lg-mobile mb-2">3.588</h4>
            <p className="text-label-sm opacity-80 uppercase tracking-widest">{t("home.supporters")}</p>
          </div>
          <div>
            <span className="material-symbols-outlined text-[48px] text-secondary mb-md">public</span>
            <h4 className="text-display-lg max-sm:text-display-lg-mobile mb-2">10+</h4>
            <p className="text-label-sm opacity-80 uppercase tracking-widest">{t("home.countries")}</p>
          </div>
          <div>
            <span className="material-symbols-outlined text-[48px] text-secondary mb-md">history</span>
            <h4 className="text-display-lg max-sm:text-display-lg-mobile mb-2">2023</h4>
            <p className="text-label-sm opacity-80 uppercase tracking-widest">{t("home.activeSince")}</p>
          </div>
        </div>
      </section>

      {/* NEWS */}
      <section className="py-xl">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <h2 className="text-headline-xl text-primary text-center mb-xl">Haberler ve Duyurular</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {news.map((item, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="relative rounded-xl overflow-hidden mb-md aspect-video">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-all"
                    src={item.img}
                    alt={item.title}
                  />
                </div>
                <span className="text-secondary text-label-sm uppercase">{item.date}</span>
                <h4 className="text-headline-md mt-2 group-hover:text-primary transition-colors">{item.title}</h4>
                <p className="text-body-md text-on-surface-variant line-clamp-2 mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section className="py-xl bg-surface-container">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center mb-xl">
            <span className="text-secondary text-label-sm uppercase tracking-widest">Gönüllere Dokunanlar</span>
            <h2 className="text-headline-xl text-primary mt-2">Sahadan Hikayeler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {stories.map((story, i) => (
              <div
                key={i}
                className="bg-surface p-xl rounded-2xl flex flex-col shadow-soft border-l-8 border-secondary"
              >
                <span className="material-symbols-outlined text-secondary text-[48px] mb-lg">format_quote</span>
                <p className="text-body-lg italic text-on-surface mb-lg">"{story.quote}"</p>
                <div className="mt-auto flex items-center gap-md">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary">
                    {story.initial}
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface">{story.author}</p>
                    <p className="text-label-sm text-on-surface-variant">{story.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE CHILD DONATION SECTION - Replaces static Mobile App */}
      <ChildInteractiveDonate />

      {/* FAB */}
      <Link
        href="/bagis"
        className="fixed bottom-margin-desktop right-margin-desktop bg-secondary text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group z-[100] md:bottom-margin-desktop md:right-margin-desktop max-md:bottom-20"
      >
        <span className="material-symbols-outlined text-[32px]">volunteer_activism</span>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 group-hover:ml-2 text-label-md whitespace-nowrap">
          Hızlı Bağış
        </span>
      </Link>
    </div>
  );
}
