import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { QurbaniCatalog } from "@/components/qurbani/qurbani-catalog";
import { QurbaniCountdown } from "@/components/qurbani/countdown";
import { getPublicLocale } from "@/lib/i18n";
import { getActiveQurbaniCatalog } from "@/lib/public/qurbani";

export const dynamic = "force-dynamic";

const copy = {
  tr: {
    metaTitle: "Kurban Bağışı | Mizan Derneği", metaDescription: "Kurban hissenizi güvenle bağışlayın; emanetinizin operasyonunu ve kesim videosunu kişisel bağlantınızdan takip edin.", noSeason: "Aktif kurban sezonu bulunmuyor", noSeasonDescription: "Kurban satışı açıldığında kurbanlık seçenekleri ve tarihler burada yayınlanacaktır.", returnHome: "Anasayfaya dön", badge: "Şeffaf kurban organizasyonu", cta: "Kurbanımı seç", processCta: "Süreç nasıl işliyor?", productsEyebrow: "Aktif sezon", productsTitle: "Kurban seçenekleri", productsDescription: "Bölge ve kurban türünü seçin. Aynı siparişteki büyükbaş hisseleri mümkün olduğunca aynı kurbanda tutulur; miktar veya uygun stok gerektirirse en az sayıda kurbana bölünür.", processEyebrow: "Emanetinizin yolculuğu", processTitle: "Seçimden videoya izlenebilir süreç", days: "Gün", hours: "Saat", minutes: "Dakika", seconds: "Saniye", defaultSteps: ["Kurban türünü, bölgeyi ve hisse sayısını seçin.", "Her hisse sahibini kaydedip vekâletinizi verin.", "Kartla güvenli ödeme yapın.", "Kesim tamamlanınca kişisel video bağlantınızı alın."], trackingTitle: "Kişisel ve güvenli takip", trackingDescription: "Bağlantınız yalnız size ait hisse adlarını, kurban kodunu ve onaylanan videoyu gösterir. Diğer hissedarların bilgileri paylaşılmaz.", trackingButton: "Takip bağlantısı nasıl gelir?", reservation: "Ödeme başlatıldığında hisseleriniz 30 dakika süreyle rezerve edilir.",
  },
  en: {
    metaTitle: "Qurbani Donation | Mizan Association", metaDescription: "Donate your qurbani securely and follow the operation and approved video through your personal link.", noSeason: "There is no active qurbani season", noSeasonDescription: "Options and dates will be published here when qurbani sales open.", returnHome: "Return home", badge: "Transparent qurbani operation", cta: "Choose my qurbani", processCta: "How does it work?", productsEyebrow: "Active season", productsTitle: "Qurbani options", productsDescription: "Choose a region and animal type. Cattle shares in one order stay in the same animal whenever possible; quantity or available stock may require allocation across the minimum number of animals.", processEyebrow: "Your trust's journey", processTitle: "A traceable process from selection to video", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", defaultSteps: ["Choose the animal type, region and number of shares.", "Record each share owner and grant your proxy.", "Pay securely by card.", "Receive your personal video link after the sacrifice."], trackingTitle: "Personal and secure tracking", trackingDescription: "Your link only shows your share names, animal code and approved video. Other shareholders' details are never disclosed.", trackingButton: "How is the tracking link delivered?", reservation: "Your shares are reserved for 30 minutes when payment starts.",
  },
  ar: {
    metaTitle: "تبرع الأضحية | جمعية ميزان", metaDescription: "تبرع بأضحيتك بأمان وتابع العملية والفيديو المعتمد عبر رابطك الشخصي.", noSeason: "لا يوجد موسم أضاحي نشط", noSeasonDescription: "ستُنشر الخيارات والمواعيد هنا عند فتح مبيعات الأضاحي.", returnHome: "العودة للرئيسية", badge: "تنظيم أضاحي شفاف", cta: "اختر أضحيتي", processCta: "كيف تسير العملية؟", productsEyebrow: "الموسم النشط", productsTitle: "خيارات الأضاحي", productsDescription: "اختر المنطقة ونوع الأضحية. تُحفظ حصص البقر في أضحية واحدة قدر الإمكان، وإذا تطلب العدد أو المخزون فتوزع على أقل عدد ممكن من الأضاحي.", processEyebrow: "رحلة أمانتكم", processTitle: "عملية قابلة للتتبع من الاختيار إلى الفيديو", days: "يوم", hours: "ساعة", minutes: "دقيقة", seconds: "ثانية", defaultSteps: ["اختر نوع الأضحية والمنطقة وعدد الحصص.", "سجّل اسم كل صاحب حصة وامنح الوكالة.", "ادفع بالبطاقة بأمان.", "استلم رابط الفيديو الشخصي بعد الذبح."], trackingTitle: "متابعة شخصية وآمنة", trackingDescription: "يعرض رابطك أسماء حصصك ورمز الأضحية والفيديو المعتمد فقط، ولا يكشف بيانات المساهمين الآخرين.", trackingButton: "كيف يصل رابط المتابعة؟", reservation: "تُحجز حصصك لمدة 30 دقيقة عند بدء الدفع.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPublicLocale();
  return { title: copy[locale].metaTitle, description: copy[locale].metaDescription };
}

export default async function QurbaniPage() {
  const locale = await getPublicLocale();
  const text = copy[locale];
  const catalog = await getActiveQurbaniCatalog(locale);

  if (!catalog) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-surface px-margin-mobile py-xl" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="max-w-xl rounded-[32px] border border-outline-variant/60 bg-white p-10 text-center shadow-ambient">
          <span className="material-symbols-outlined text-6xl text-primary/55">event_busy</span>
          <h1 className="mt-5 text-3xl font-semibold text-on-surface">{text.noSeason}</h1>
          <p className="mt-4 leading-7 text-on-surface-variant">{text.noSeasonDescription}</p>
          <Link className="btn-primary mt-7" href="/">{text.returnHome}</Link>
        </div>
      </main>
    );
  }

  const { season, countries } = catalog;
  const processSteps = season.processSteps.length ? season.processSteps : text.defaultSteps;
  return (
    <main className="bg-surface" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="relative isolate min-h-[620px] overflow-hidden bg-primary">
        {season.heroImageUrl ? <Image alt={season.title} className="-z-20 object-cover" fill priority sizes="100vw" src={season.heroImageUrl} /> : null}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,53,33,.96),rgba(14,90,58,.72),rgba(14,90,58,.28))]" />
        <div className="mx-auto grid min-h-[620px] max-w-container-max items-center gap-10 px-margin-mobile py-xl md:px-margin-desktop lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl text-white">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">{season.year} · {text.badge}</span>
            <h1 className="mt-6 text-display-lg-mobile font-bold leading-tight md:text-display-lg">{season.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">{season.description || text.metaDescription}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="btn-primary" href="#kurban-secenekleri">{text.cta}<span aria-hidden className="material-symbols-outlined">arrow_downward</span></a>
              <a className="btn-secondary" href="#kurban-sureci">{text.processCta}</a>
            </div>
          </div>
          {season.eidAt ? <QurbaniCountdown labels={[text.days, text.hours, text.minutes, text.seconds]} target={season.eidAt} /> : null}
        </div>
      </section>

      <section className="mx-auto max-w-container-max scroll-mt-24 px-margin-mobile py-xl md:px-margin-desktop" id="kurban-secenekleri">
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{text.productsEyebrow} · {season.year}</p>
          <h2 className="mt-3 text-headline-xl-mobile text-on-surface md:text-headline-xl">{text.productsTitle}</h2>
          <p className="mt-4 text-body-md text-on-surface-variant">{text.productsDescription}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-container px-4 py-2 text-xs font-semibold text-on-primary-container"><span aria-hidden className="material-symbols-outlined text-base">schedule</span>{text.reservation}</p>
        </div>
        <QurbaniCatalog countries={countries} locale={locale} />
      </section>

      <section className="border-y border-outline-variant/45 bg-surface-container-low py-xl" id="kurban-sureci">
        <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{text.processEyebrow}</p>
            <h2 className="mt-3 text-headline-xl-mobile text-on-surface md:text-headline-xl">{text.processTitle}</h2>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {processSteps.slice(0, 6).map((step, index) => <li className="rounded-[26px] border border-outline-variant/55 bg-white p-6 shadow-soft" key={`${index}-${step}`}><span className="grid size-11 place-items-center rounded-full bg-primary text-lg font-bold text-white">{index + 1}</span><p className="mt-5 text-sm leading-7 text-on-surface-variant">{step}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-xl md:px-margin-desktop">
        <div className="overflow-hidden rounded-[34px] bg-primary px-6 py-10 text-white shadow-ambient md:px-12">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-fixed">MD-{season.year}-0001</p><h2 className="mt-3 text-3xl font-semibold">{text.trackingTitle}</h2><p className="mt-4 max-w-2xl leading-7 text-white/75">{text.trackingDescription}</p></div>
            <Link className="btn-secondary" href="/iletisim">{text.trackingButton}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
