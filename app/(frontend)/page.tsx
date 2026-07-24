"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useCurrency } from "@/lib/currency-context";
import ChildInteractiveDonate from "@/components/home/ChildInteractiveDonate";
import InteractiveGallery from "@/components/home/interactive-gallery";
import VideoCarousel from "@/components/home/video-carousel";
import IconFeatureCard from "@/components/home/icon-feature-card";
import ScrollReveal from "@/components/ui/scroll-reveal";
import CountUp from "@/components/ui/count-up";
import FloatingActionBar from "@/components/layout/floating-action-bar";
import QuickDonationCarousel from "@/components/home/quick-donation-carousel";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_E164 } from "@/lib/contact";

const slides = [
  {
    img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1920&q=80",
    title: "Elbistan'ın Kalbinden Dünyaya Uzanan Hayır",
    desc: "Mizan İnsani Yardım Derneği, ihtiyaç sahiplerine onurlu ve sürdürülebilir destek sunan köklü bir yardım kuruluşudur.",
  },
  {
    img: "https://images.unsplash.com/photo-1594708767771-a7502209ff51?auto=format&fit=crop&w=1920&q=80",
    title: "Bir Nefeste Umut, Bir Damlada Hayat",
    desc: "Dünyanın dört bir yanındaki mazlumlara denge ve umut olmak için yola çıktık. Her bağış bir hayata dokunur.",
  },
  {
    img: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1920&q=80",
    title: "Mazlumlara Uzanan İyilik Eli",
    desc: "Şeffaflık ve emanet bilinciyle yönettiğimiz bağışlarınız, en uzak coğrafyalara kadar umut taşır.",
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

type DonationAreaCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string | null;
  raised: number;
  target: number;
  percent: number;
};

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
    rating: 5,
  },
  {
    quote: "Gönüllü olarak katıldığım bu yardım seferberliğinde, bir yetimin yüzündeki gülümseme her şeye değerdi. Şeffaf ve dürüst çalışmanın karşılığı buydu.",
    author: "Mustafa K.",
    role: "Gönüllü Yardımsever",
    initial: "M",
    rating: 5,
  },
  {
    quote: "Bir tabak sıcak yemeğin, bir talebenin duasına dönüşmesine burada şahit oldum. Mizan Derneği, iyiliği gerçekten yaşatıyor.",
    author: "Ayşe H.",
    role: "Gönüllü",
    initial: "A",
    rating: 5,
  },
];

export default function HomePage() {
  const { t, dir, locale } = useLanguage();
  const { formatPrice } = useCurrency();
  const [donationAreas, setDonationAreas] = useState<DonationAreaCard[]>([]);
  const [donationAreasLoading, setDonationAreasLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const slides = [
    { img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1920&q=80", title: t("home.heroTitle"), desc: t("home.heroDescription1") },
    { img: "https://images.unsplash.com/photo-1594708767771-a7502209ff51?auto=format&fit=crop&w=1920&q=80", title: t("home.heroTitle2"), desc: t("home.heroDescription2") },
    { img: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1920&q=80", title: t("home.heroTitle3"), desc: t("home.heroDescription3") },
  ];
  const donationTabs = ["payments", "temple_hindu", "school", "child_care", "water_drop", "emergency", "volunteer_activism"].map((icon, index) => ({
    icon,
    label: t(`home.quickDonationCategories.${index}`),
  }));
  const news = [
    "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&q=80",
    "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=600&q=80",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80",
  ].map((img, index) => ({ img, date: t(`home.newsItems.${index}.date`), title: t(`home.newsItems.${index}.title`), desc: t(`home.newsItems.${index}.description`) }));
  const stories = ["A", "M", "A"].map((initial, index) => ({
    initial,
    rating: 5,
    quote: t(`home.storiesItems.${index}.quote`),
    author: t(`home.storiesItems.${index}.author`),
    role: t(`home.storiesItems.${index}.role`),
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % stories.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [stories.length]);

  useEffect(() => {
    let active = true;
    async function loadDonationAreas() {
      try {
        const response = await fetch(`/api/bagis-alanlari?locale=${locale}`, { cache: "no-store" });
        const payload = await response.json();
        if (!active) return;
        const areas = Array.isArray(payload?.areas) ? payload.areas : [];
        setDonationAreas(
          areas.slice(0, 3).map((area: {
            id?: string;
            slug?: string;
            title?: string;
            excerpt?: string;
            category?: { name?: string } | null;
            image?: { src?: string } | null;
            collectedAmount?: number;
            targetAmount?: number;
            progress?: number;
          }) => ({
            id: String(area.id || area.title || Math.random()),
            slug: area.slug || String(area.id || area.title || Math.random()),
            title: area.title || t("home.donationAreaFallback"),
            excerpt: area.excerpt || "",
            category: area.category?.name || t("home.donationCategoryFallback"),
            image: area.image?.src || null,
            raised: Number(area.collectedAmount || 0),
            target: Number(area.targetAmount || 0),
            percent: Number(area.progress || 0),
          })),
        );
      } catch {
        if (active) setDonationAreas([]);
      } finally {
        if (active) setDonationAreasLoading(false);
      }
    }

    loadDonationAreas();
    return () => {
      active = false;
    };
  }, [locale, t]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div dir={dir}>
      {/* HERO */}
      <section className="relative h-[580px] sm:h-[600px] lg:h-[700px] overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0 bg-cover bg-[center_35%]"
            style={{ backgroundImage: `url(${slides[currentSlide].img})` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 max-w-[1140px] mx-auto px-4 lg:px-2.5 h-full flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6 items-center w-full">
            <div className="max-w-lg lg:max-w-none">
              <AnimatePresence mode="wait">
                <motion.div key={currentSlide}>
                  <motion.h5
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="text-gold text-base uppercase tracking-[0.2em] font-medium mb-5"
                  >
                    {t("home.badge")}
                  </motion.h5>

                  <motion.h1
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="text-display-lg max-sm:text-display-lg-mobile text-white leading-[1.08] mb-5 max-w-[560px]"
                  >
                    {slides[currentSlide].title}
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="text-base text-white/60 leading-relaxed mb-7 max-w-[480px]"
                  >
                    {slides[currentSlide].desc}
                  </motion.p>

                  <div className="flex flex-wrap gap-3 sm:gap-5">
                    <motion.div
                      initial={{ opacity: 0, x: -100 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    >
                      <Link
                        href="/bagis"
                        className="inline-flex items-center gap-2 bg-secondary text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full text-base font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {t("common.donate")} →
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 60 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 2, delay: 1, ease: "easeOut" }}
                    >
                      <Link
                        href="/hakkimizda"
                        className="inline-flex items-center gap-2 border-2 border-white/30 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full text-base font-semibold hover:bg-white/10 hover:border-white/50 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {t("common.learnMore")} →
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={cn(
                "rounded-full transition-all duration-500",
                i === currentSlide
                  ? "bg-white w-10 h-2.5"
                  : "bg-white/40 w-2.5 h-2.5 hover:bg-white/60"
              )}
              aria-label={t("home.slideLabel").replace("{number}", String(i + 1))}
            />
          ))}
        </div>
      </section>

      {/* HERO BOTTOM INFO CARDS */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-surface-container-low rounded-3xl p-8 lg:p-10 relative overflow-hidden"
            >
              <h3 className="text-headline-md text-on-surface mb-4">
                {t("about.title")}
              </h3>
              <p className="text-base text-on-surface-variant/60 leading-relaxed mb-8 max-w-lg">
                {t("home.introDescription")}
              </p>
              <div className="space-y-3 mb-8">
                {[
                  t("home.introItems.0"),
                  t("home.introItems.1"),
                  t("home.introItems.2"),
                  t("home.introItems.3"),
                  t("home.introItems.4"),
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                    <span className="text-base text-on-surface-variant/70">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/hakkimizda"
                className="inline-flex items-center gap-2 bg-secondary text-white px-7 py-3.5 rounded-full text-[15px] font-semibold hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {t("home.meetFoundation")}
                <span className="text-base">→</span>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
              className="bg-primary-container rounded-3xl p-8 lg:p-10 flex flex-col justify-center"
            >
              <div className="flex items-start gap-4 mb-6">
                <span className="material-symbols-outlined text-[32px] text-primary">volunteer_activism</span>
                <div>
                  <h3 className="text-headline-md text-on-surface mb-2">
                    {t("home.donationContactTitle")}
                  </h3>
                  <p className="text-base text-on-surface-variant/70 leading-relaxed">
                    {t("home.donationContactDescription")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant mt-4">
                <span className="material-symbols-outlined text-primary">phone_in_talk</span>
                <a href={`tel:${SUPPORT_PHONE_E164}`} className="text-lg font-semibold hover:text-gold transition-colors">
                  {SUPPORT_PHONE_DISPLAY}
                  </a>
                </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ABOUT / ICON FEATURES */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div>
                <motion.span
                  initial={{ x: -80, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="inline-flex items-center gap-3 text-gold text-label-sm uppercase tracking-[0.15em] font-medium mb-4"
                >
                  <span className="w-8 h-[2px] bg-gold rounded-full" />
                  {t("home.aboutEyebrow")}
                </motion.span>
                <h2 className="text-headline-xl text-on-surface leading-tight mb-6">
                  {t("home.aboutHeading")}
                </h2>
                <p className="text-base text-on-surface-variant/60 leading-relaxed mb-10 max-w-lg">
                  {t("home.aboutDescription")}
                </p>

                <div className="space-y-6"
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  {[
                    {
                      icon: "school",
                      title: t("home.aboutFeatures.0.title"),
                      desc: t("home.aboutFeatures.0.description"),
                    },
                    {
                      icon: "volunteer_activism",
                      title: t("home.aboutFeatures.1.title"),
                      desc: t("home.aboutFeatures.1.description"),
                    },
                    {
                      icon: "verified_user",
                      title: t("home.aboutFeatures.2.title"),
                      desc: t("home.aboutFeatures.2.description"),
                    },
                  ].map((item, i) => {
                    const isActive = hoveredFeature === i || (hoveredFeature === null && i === 0);
                    return (
                    <div
                      key={i}
                      className="flex gap-4 group"
                      onMouseEnter={() => setHoveredFeature(i)}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ease-out",
                        isActive ? "bg-primary text-white" : "bg-surface text-primary",
                      )}>
                        <span className="material-symbols-outlined text-[24px]">
                          {item.icon}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-on-surface mb-1">{item.title}</h4>
                        <p className="text-base text-on-surface-variant/55 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-8 mt-8">
                  <Link
                    href="/hakkimizda"
                    className="inline-flex items-center gap-2 bg-secondary text-white px-7 py-3.5 rounded-full text-[15px] font-semibold hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shrink-0"
                  >
                    {t("home.getToKnowUs")}
                  </Link>
                  <div className="hidden lg:flex items-center gap-3.5">
                    <div className="w-[52px] h-[52px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-xl">M</span>
                    </div>
                    <div>
                      <p className="text-[18px] font-semibold leading-tight text-on-surface">Mizan Derneği</p>
                      <p className="text-[16px] text-on-surface-variant mt-1">{t("home.motto")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="relative rounded-3xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.08)] aspect-[3/4]">
                  <Image
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80"
                    alt="Mizan Derneği"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* IMPACT STATS */}
      <section className="pt-12 pb-20 lg:pb-28 bg-white">
        <div className="max-w-[1200px] mx-auto px-margin-desktop">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-headline-xl text-on-surface leading-tight">
              {t("home.statsHeading")}
            </h2>
            <p className="text-base text-on-surface-variant/60 mt-3 leading-relaxed">
              {t("home.statsDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: "send", value: 954, suffix: "+", label: t("home.shipments"), sublabel: t("home.statSublabels.0") },
              { icon: "group", value: 3588, suffix: "", label: t("home.supporters"), sublabel: t("home.statSublabels.1") },
              { icon: "public", value: 10, suffix: "+", label: t("home.countries"), sublabel: t("home.statSublabels.2") },
              { icon: "history", value: 2023, suffix: "", label: t("home.activeSince"), sublabel: t("home.statSublabels.3") },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-primary rounded-3xl shadow-lg p-10 flex flex-col items-center text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
              >
                <span className="material-symbols-outlined text-[44px] text-white">
                  {stat.icon}
                </span>
                <h4 className="text-5xl font-bold text-white mt-6">
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </h4>
                <p className="text-white/80 text-base font-medium mt-3">{stat.label}</p>
                <p className="text-white/50 text-sm mt-1">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE GALLERY TABS */}
      <InteractiveGallery
        tabs={[
          {
            id: "medrese",
            label: t("home.gallery.0"),
            image:
              "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80",
          },
          {
            id: "talebe",
            label: t("home.gallery.1"),
            image:
              "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1600&q=80",
          },
          {
            id: "asevi",
            label: t("home.gallery.2"),
            image:
              "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80",
          },
          {
            id: "yardim",
            label: t("home.gallery.3"),
            image:
              "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1600&q=80",
          },
        ]}
      />

      {/* CAMPAIGNS */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-14 gap-4">
            <div>
              <span className="inline-flex items-center gap-3 text-gold text-label-sm uppercase tracking-[0.15em] font-medium mb-4">
                <span className="w-8 h-[2px] bg-gold rounded-full" />
                {t("home.donationAreasEyebrow")}
              </span>
              <h2 className="text-headline-xl text-on-surface leading-tight">
                {t("home.donationAreasEyebrow")}
              </h2>
              <p className="text-base text-on-surface-variant/60 mt-3 max-w-md leading-relaxed">
                {t("home.donationAreasDescription")}
              </p>
            </div>
            <Link
              href="/bagis"
              className="inline-flex items-center gap-2 border-2 border-outline-variant/25 text-on-surface-variant/70 px-7 py-3.5 rounded-full text-[15px] font-semibold hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all duration-200 shrink-0"
            >
                {t("home.allDonationAreas")}
              <span className="text-lg ml-0.5">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
            {donationAreasLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-outline-variant/20 bg-white p-6">
                  <div className="h-56 rounded-2xl bg-surface-container-high animate-pulse" />
                  <div className="mt-6 space-y-3">
                    <div className="h-5 w-2/3 rounded bg-surface-container-high animate-pulse" />
                    <div className="h-4 w-full rounded bg-surface-container-high animate-pulse" />
                    <div className="h-4 w-5/6 rounded bg-surface-container-high animate-pulse" />
                  </div>
                </div>
              ))
            ) : donationAreas.length ? (
              donationAreas.map((area) => (
                <div key={area.id} className="relative group/card">
                  <div className="absolute -inset-x-6 -inset-y-10 rounded-[40px] bg-[radial-gradient(circle,rgba(14,90,58,.18)_0%,rgba(172,120,15,.08)_45%,transparent_75%)] opacity-0 group-hover/card:opacity-100 blur-3xl transition-opacity duration-500 pointer-events-none z-0" />
                  <div className="relative z-10 bg-white rounded-3xl overflow-hidden shadow-lg group-hover/card:shadow-2xl transition-all duration-500 ease-out group-hover/card:scale-105 group-hover/card:-translate-y-3 cursor-pointer">
                    <div className="relative h-56 overflow-hidden">
                      {area.image ? (
                        <Image
                          alt={area.title}
                          src={area.image}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover group-hover/card:scale-110 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="h-full w-full bg-[linear-gradient(135deg,_rgba(14,90,58,.14),_rgba(172,120,15,.14))]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                      <span className="absolute top-4 left-4 bg-white/80 backdrop-blur-md text-primary px-4 py-1.5 rounded-full text-label-sm font-semibold shadow-sm group-hover/card:shadow-lg transition-shadow duration-500">
                        {area.category}
                      </span>
                    </div>

                    <div className="p-6 flex flex-col">
                      <h3 className="text-headline-md text-on-surface mb-2 group-hover/card:text-primary transition-colors duration-200 leading-snug">
                        {area.title}
                      </h3>
                      <p className="text-base text-on-surface-variant/55 leading-relaxed mb-6 line-clamp-2">
                        {area.excerpt}
                      </p>

                      <div className="mt-auto space-y-5">
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant/70">
                            {t("home.collected")}
                            <span className="block text-on-surface font-semibold text-base">{formatPrice(area.raised)}</span>
                          </span>
                          <span className="text-on-surface-variant/70 text-right">
                            {t("home.target")}
                            <span className="block text-on-surface font-semibold text-base">{formatPrice(area.target)}</span>
                          </span>
                        </div>

                        <div className="relative w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-gold rounded-full transition-all duration-1000 ease-out group-hover/card:brightness-110"
                            style={{ width: `${area.percent}%` }}
                          />
                          <span className="absolute -top-7 right-0 bg-gold text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                            %{area.percent}
                          </span>
                        </div>

                        <Link
                          href={`/bagis/${area.slug}`}
                          className="group/btn mt-1 inline-flex items-center justify-center gap-2 bg-secondary text-white px-6 py-3.5 rounded-full text-[15px] font-semibold hover:shadow-lg hover:shadow-secondary/25 group-hover/card:scale-105 transition-all duration-300"
                        >
                          <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
                          {t("common.donate")}
                          <span className="text-base transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="md:col-span-2 lg:col-span-3 rounded-3xl border border-dashed border-outline-variant/30 bg-white p-8 text-center text-on-surface-variant">
                {t("home.noDonationAreas")}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* QUICK DONATION CATEGORIES */}
      <section className="pt-10 lg:pt-16 pb-20 lg:pb-28 bg-white relative">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center mb-10">
            <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-center text-on-surface sm:text-4xl lg:text-5xl">
              {t("home.quickDonationHeading")}
            </h2>
            <p className="text-base text-on-surface-variant/60 mt-6 leading-relaxed">
              {t("home.quickDonationDescription")}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <QuickDonationCarousel
              categories={donationTabs}
              activeIndex={activeTab}
              onSelect={setActiveTab}
            />
          </div>
        </div>
      </section>

      {/* DONATION PROCESS + CTA BANNER */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <ScrollReveal>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.08)] lg:aspect-auto lg:min-h-[500px]">
                                <Image
                  src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=800&q=80"
                  alt={t("home.donationContactTitle")}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-secondary/95 backdrop-blur-sm p-6 text-white text-center rounded-b-3xl">
                  <h3 className="text-headline-md mb-2">{t("home.processCardTitle")}</h3>
                  <Link
                    href="/bagis"
                    className="inline-flex items-center gap-2 bg-white text-secondary px-8 py-3.5 rounded-full text-[15px] font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 mt-2"
                  >
                    {t("home.processCardButton")}
                    <span className="text-base">→</span>
                  </Link>
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-3 text-gold text-label-sm uppercase tracking-[0.15em] font-medium mb-4">
                  <span className="w-8 h-[2px] bg-gold rounded-full" />
                  {t("home.processEyebrow")}
                </span>
                <h2 className="text-headline-xl text-on-surface leading-tight mb-4">
                  {t("home.processHeading")}
                </h2>
                <p className="text-base text-on-surface-variant/60 leading-relaxed mb-10">
                  {t("home.processDescription")}
                </p>

                <div className="space-y-1">
                  {[
                    {
                      step: "01",
                      icon: "touch_app",
                      title: t("home.processSteps.0.title"),
                      desc: t("home.processSteps.0.description"),
                    },
                    {
                      step: "02",
                      icon: "description",
                      title: t("home.processSteps.1.title"),
                      desc: t("home.processSteps.1.description"),
                    },
                    {
                      step: "03",
                      icon: "volunteer_activism",
                      title: t("home.processSteps.2.title"),
                      desc: t("home.processSteps.2.description"),
                    },
                    {
                      step: "04",
                      icon: "eco",
                      title: t("home.processSteps.3.title"),
                      desc: t("home.processSteps.3.description"),
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-5 py-4 group"
                    >
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                          <span className="material-symbols-outlined text-primary text-[22px]">{item.icon}</span>
                        </div>
                        {i < 3 && (
                          <div className="w-[1px] h-6 bg-outline-variant/20 mt-1" />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className="text-label-sm text-primary font-bold mb-1">{item.step}</p>
                        <h4 className="text-base font-semibold text-on-surface mb-1">{item.title}</h4>
                        <p className="text-sm text-on-surface-variant/55 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* VIDEO CAROUSEL */}
      <VideoCarousel
        slides={[
          {
            id: "v1",
            thumbnail:
              "https://img.youtube.com/vi/qgUldGZABdQ/hqdefault.jpg",
            title: "Beraat kandili özel | Hamza Algül Hocaefendi",
            url: "https://www.youtube.com/watch?v=qgUldGZABdQ",
          },
          {
            id: "v2",
            thumbnail:
              "https://img.youtube.com/vi/lm_CFUwQX5Q/hqdefault.jpg",
            title: "Fıkıh sohbeti -1 (Nur'ul İzah)",
            url: "https://www.youtube.com/watch?v=lm_CFUwQX5Q",
          },
          {
            id: "v3",
            thumbnail:
              "https://img.youtube.com/vi/Zg81RYBZk8o/hqdefault.jpg",
            title: "HAMZA HOCA GÜMÜŞPINAR CAMİİ TAZİYE SOHBETİ",
            url: "https://www.youtube.com/watch?v=Zg81RYBZk8o",
          },
          {
            id: "v4",
            thumbnail:
              "https://img.youtube.com/vi/2GFFYDXU7ck/hqdefault.jpg",
            title: "Kalblerin Keşfi -95 Haram Mal Toplamak",
            url: "https://m.youtube.com/watch?v=2GFFYDXU7ck",
          },
        ]}
      />

      {/* NEWS */}
      <section className="py-20 lg:py-28 bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="inline-flex items-center justify-center gap-3 text-gold text-label-sm uppercase tracking-[0.15em] font-medium mb-4">
              <span className="w-8 h-[2px] bg-gold rounded-full" />
              {t("home.newsEyebrow")}
            </span>
            <h2 className="text-headline-xl text-on-surface leading-tight">
              {t("home.news")}
            </h2>
            <p className="text-base text-on-surface-variant/60 mt-4 leading-relaxed">
              {t("home.newsDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {news.map((item, i) => (
              <article
                key={i}
                className="group bg-white rounded-3xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1 cursor-pointer"
              >
                <div className="relative aspect-video overflow-hidden bg-surface-container-high">
                                    <Image
                    className="object-cover group-hover:scale-105 transition-transform duration-[1200ms] ease-out"
                    src={item.img}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary/60">calendar_today</span>
                    <span className="text-label-sm text-on-surface-variant/60">{item.date}</span>
                  </div>

                  <h4 className="text-headline-md text-on-surface group-hover:text-primary transition-colors duration-200 leading-snug line-clamp-2">
                    {item.title}
                  </h4>

                  <p className="text-base text-on-surface-variant/55 leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>

                  <div className="flex items-center gap-1.5 text-label-sm font-semibold text-primary pt-1 group-hover:gap-3 transition-all duration-300">
                    {t("common.readMore")}
                    <span className="text-base">→</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section className="py-20 lg:py-28 bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="inline-flex items-center justify-center gap-3 text-gold text-label-sm uppercase tracking-[0.15em] font-medium mb-4">
              <span className="w-8 h-[2px] bg-gold rounded-full" />
              {t("home.storiesEyebrow")}
            </span>
            <h2 className="text-headline-xl text-on-surface leading-tight">
              {t("home.stories")}
            </h2>
            <p className="text-base text-on-surface-variant/60 mt-4 leading-relaxed">
              {t("home.storiesDescription")}
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="bg-white p-10 rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] text-center relative"
              >
                <span className="material-symbols-outlined text-[64px] text-gold/15 mb-6 block">
                  format_quote
                </span>

                <div className="flex justify-center gap-1 mb-6">
                  {Array.from({ length: stories[activeTestimonial].rating }).map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-gold"
                      fill="currentColor"
                      viewBox="0 0 576 512"
                    >
                      <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z" />
                    </svg>
                  ))}
                </div>

                <p className="text-lg text-on-surface/75 italic leading-relaxed mb-8 max-w-lg mx-auto">
                  &ldquo;{stories[activeTestimonial].quote}&rdquo;
                </p>

                <div className="flex items-center justify-center gap-4 pt-6 border-t border-outline-variant/10">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center font-bold text-primary text-xl">
                    {stories[activeTestimonial].initial}
                  </div>
                  <div className="text-left">
                    <p className="text-label-md font-semibold text-on-surface">
                      {stories[activeTestimonial].author}
                    </p>
                    <p className="text-label-sm text-on-surface-variant/60">
                      {stories[activeTestimonial].role}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center gap-3 mt-8">
              {stories.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`rounded-full transition-all duration-500 ${
                    i === activeTestimonial
                      ? "bg-primary w-8 h-2.5"
                      : "bg-outline-variant/30 w-2.5 h-2.5 hover:bg-outline-variant/60"
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE CHILD DONATION SECTION - Replaces static Mobile App */}
      <ChildInteractiveDonate />

      {/* FLOATING ACTION BAR */}
      <FloatingActionBar />

      {/* FAB */}
      <Link
        href="/bagis"
        className="fixed bottom-24 right-4 sm:right-6 md:bottom-8 md:right-8 bg-secondary text-white p-4 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-110 hover:-translate-y-1 transition-all duration-300 group z-[100]"
      >
        <span className="material-symbols-outlined text-[28px]">volunteer_activism</span>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 group-hover:ml-2 text-label-md font-medium whitespace-nowrap">
          {t("home.quickDonate")}
        </span>
      </Link>
    </div>
  );
}
