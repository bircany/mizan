import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  HeartHandshake,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { getPublicLocale } from "@/lib/i18n";
import { getPublishedPageBySlug } from "@/lib/public/pages";
import { getManagedSitePage } from "@/lib/site-pages";

const principles = [
  {
    icon: HeartHandshake,
    title: "İhtiyaca Odaklı Yardım",
    description:
      "Yardımı yalnız ulaştırmakla kalmıyor; gerçek ihtiyacı gözeten, insan onurunu koruyan bir yaklaşım benimsiyoruz.",
  },
  {
    icon: RefreshCw,
    title: "Sürekli Sosyal Fayda",
    description:
      "Dönemsel desteğin ötesine geçerek kalıcı iyilik, düzenli takip ve sürdürülebilir çözüm üretmeyi hedefliyoruz.",
  },
  {
    icon: ShieldCheck,
    title: "Şeffaflık ve Emanet Bilinci",
    description:
      "Bağışları emanet kabul ediyor; ödeme, operasyon ve teslimat süreçlerini kayıtlı ve denetlenebilir biçimde yürütüyoruz.",
  },
] as const;

export async function AboutPage() {
  const [locale, fallback] = await Promise.all([
    getPublicLocale(),
    Promise.resolve(getManagedSitePage("hakkimizda")),
  ]);
  const page = await getPublishedPageBySlug("hakkimizda", locale);
  const paragraphs = page?.paragraphs?.length
    ? page.paragraphs
    : (fallback?.content || "").split(/\n\s*\n/).filter(Boolean);
  const intro =
    paragraphs[0] ||
    "Mizan Derneği, iyiliği adalet ve sorumluluk bilinciyle ihtiyaç sahiplerine ulaştırmak için çalışır.";
  const detail =
    paragraphs.slice(1).join(" ") ||
    "Acil yardımdan sürdürülebilir projelere kadar her çalışmayı güven, takip ve hesap verebilirlik ilkeleriyle ele alır.";

  return (
    <main
      className="overflow-hidden bg-[#fbfaf7] text-on-surface"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <section className="relative border-b border-[#e6ddcf]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_72%_18%,rgba(216,231,221,0.72),transparent_42%)]"
        />
        <div className="relative mx-auto grid max-w-[1280px] gap-12 px-margin-mobile py-14 md:px-margin-desktop md:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9a7445]">
              Mizan Derneği Hakkında
            </p>
            <h1 className="mt-5 text-[clamp(2.35rem,5vw,4.5rem)] font-semibold leading-[1.03] tracking-[-0.045em] text-[#173525]">
              İyiliği güvenle,
              <span className="block text-[#8a5a20]">emanet bilinciyle büyütüyoruz.</span>
            </h1>
            <p className="mt-7 max-w-[58ch] text-base leading-7 text-[#4f5c54] md:text-lg md:leading-8">
              {intro}
            </p>
            <p className="mt-4 max-w-[60ch] text-sm leading-7 text-[#6c746f]">
              {detail}
            </p>

            <div className="mt-9 space-y-5">
              {principles.map((principle, index) => {
                const Icon = principle.icon;
                return (
                  <article className="group flex gap-4" key={principle.title}>
                    <span
                      className={
                        index === 1
                          ? "grid size-14 shrink-0 place-items-center rounded-2xl bg-[#80694f] text-white shadow-[0_12px_28px_rgba(80,65,48,0.18)]"
                          : "grid size-14 shrink-0 place-items-center rounded-2xl border border-[#e6ddcf] bg-white text-[#80694f] shadow-[0_10px_28px_rgba(31,53,40,0.07)]"
                      }
                    >
                      <Icon className="size-6" strokeWidth={1.7} />
                    </span>
                    <div className="pt-0.5">
                      <h2 className="text-base font-bold text-[#2c4034] md:text-lg">
                        {principle.title}
                      </h2>
                      <p className="mt-1.5 max-w-[48ch] text-sm leading-6 text-[#6c746f]">
                        {principle.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#80603d] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(128,96,61,0.22)] transition hover:-translate-y-0.5 hover:bg-[#6f502f]"
                href="/bagis"
              >
                Çalışmalarımızı inceleyin
                <ArrowRight className="size-4" />
              </Link>
              <div className="flex items-center gap-3">
                <Image
                  alt="Mizan Derneği"
                  className="rounded-full border border-[#e6ddcf] bg-white p-1"
                  height={52}
                  src="/mizan-logo.png"
                  width={52}
                />
                <div>
                  <p className="text-sm font-bold text-[#2c4034]">Mizan Derneği</p>
                  <p className="mt-0.5 text-xs text-[#7a817d]">
                    İyilikte adalet, hizmette güven
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[720px]">
            <div className="grid grid-cols-2 gap-3 md:gap-5">
              <figure className="relative min-h-[270px] overflow-hidden rounded-[28px] bg-[#dce8df] md:min-h-[390px]">
                <Image
                  alt="İhtiyaç sahiplerine yardım ulaştırma çalışması"
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 1024px) 50vw, 360px"
                  src="/images/donations/kurban-dagitimi.png"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-5 pb-5 pt-16 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                    Sahada
                  </p>
                  <figcaption className="mt-1 text-base font-bold">
                    İhtiyaç sahibine doğrudan destek
                  </figcaption>
                </div>
              </figure>
              <figure className="relative mt-10 min-h-[230px] overflow-hidden rounded-[28px] bg-[#e8dfd1] md:min-h-[350px]">
                <Image
                  alt="Kalıcı eser ve sosyal fayda çalışması"
                  className="object-cover"
                  fill
                  sizes="(max-width: 1024px) 50vw, 340px"
                  src="/images/donations/mescid-imar.png"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-5 pb-5 pt-16 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                    Kalıcı eser
                  </p>
                  <figcaption className="mt-1 text-base font-bold">
                    Sürdürülebilir sosyal fayda
                  </figcaption>
                </div>
              </figure>
            </div>

            <div className="relative -mt-8 mx-4 overflow-hidden rounded-[28px] border border-white/10 bg-[#173525] p-6 text-white shadow-[0_24px_60px_rgba(23,53,37,0.24)] md:mx-10 md:-mt-12 md:p-8">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-20 size-52 rounded-full bg-[#d9b77d]/15 blur-2xl"
              />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-md">
                  <div className="flex items-center gap-2 text-[#e5c895]">
                    <BadgeCheck className="size-5" />
                    <p className="text-xs font-bold uppercase tracking-[0.18em]">
                      Güven ilkesi
                    </p>
                  </div>
                  <p className="mt-3 text-xl font-semibold leading-8 md:text-2xl">
                    Her bağış bir emanet, her süreç bir sorumluluktur.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    Kaynakların amacı doğrultusunda kullanılması, operasyonun
                    izlenmesi ve bağışçıya geri bildirim temel çalışma ilkemizdir.
                  </p>
                </div>
                <Image
                  alt=""
                  aria-hidden="true"
                  className="size-20 shrink-0 rounded-full border border-white/15 bg-[#f8f4ea] p-1.5"
                  height={80}
                  src="/mizan-logo.png"
                  width={80}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1280px] gap-5 px-margin-mobile py-10 md:grid-cols-3 md:px-margin-desktop md:py-12">
          {[
            ["Kayıtlı süreç", "Bağış, ödeme ve operasyon adımları tek sistem üzerinden takip edilir."],
            ["Kontrollü teslimat", "Makbuz ve video gibi teslimatlar doğrulanan kayıtlarla eşleştirilir."],
            ["İnsan onuruna saygı", "Yardım süreçlerinde mahremiyet, güvenlik ve saygınlık gözetilir."],
          ].map(([title, description]) => (
            <article
              className="rounded-2xl border border-[#e9e2d7] bg-[#fdfcf9] p-5"
              key={title}
            >
              <p className="text-sm font-bold text-[#274633]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[#6c746f]">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
