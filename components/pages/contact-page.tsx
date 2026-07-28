import {
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { InquiryForm } from "@/components/pages/inquiry-form";
import { phoneHref, whatsappNumber } from "@/lib/eft-guidance";
import { getPublicLocale } from "@/lib/i18n";
import { parseContactPage } from "@/lib/inquiry-pages";
import { getPublishedPageBySlug } from "@/lib/public/pages";
import { getManagedSitePage } from "@/lib/site-pages";

export async function ContactPage() {
  const [locale, fallback] = await Promise.all([
    getPublicLocale(),
    Promise.resolve(getManagedSitePage("iletisim")),
  ]);
  const page = await getPublishedPageBySlug("iletisim", locale);
  const paragraphs = page?.paragraphs?.length
    ? page.paragraphs
    : (fallback?.content || "").split(/\n\s*\n/).filter(Boolean);
  const content = parseContactPage(
    page?.title || fallback?.title || "İletişim",
    paragraphs,
  );
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    content.mapQuery || content.address,
  )}&output=embed`;
  const callNumber = phoneHref(content.phone);
  const whatsApp = whatsappNumber(content.whatsapp);

  return (
    <main className="bg-[#fbfaf7]" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="relative">
        <div className="relative h-[330px] overflow-hidden bg-[#dfe8e2] md:h-[440px]">
          <iframe
            allowFullScreen
            className="absolute inset-0 size-full border-0 grayscale-[18%]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={mapSrc}
            title="Mizan Derneği konum haritası"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#173525]/8 via-transparent to-[#fbfaf7]"
          />
        </div>

        <div className="relative mx-auto -mt-16 grid max-w-[1180px] gap-8 px-margin-mobile pb-16 md:px-margin-desktop lg:-mt-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-12">
          <section className="pt-8 lg:pt-32">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a7445]">
              İletişime geçin
            </p>
            <h1 className="mt-4 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[#173525]">
              {content.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#606b64]">
              {content.intro}
            </p>

            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <InfoCard icon={Phone} title="İletişim bilgileri">
                <div className="space-y-2">
                  {callNumber ? (
                    <a className="block font-semibold text-[#264d37] hover:underline" href={`tel:${callNumber}`}>
                      {content.phone}
                    </a>
                  ) : null}
                  {whatsApp ? (
                    <a
                      className="inline-flex items-center gap-2 font-semibold text-[#128c55] hover:underline"
                      href={`https://wa.me/${whatsApp}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <MessageCircle className="size-4" />
                      WhatsApp üzerinden yazın
                    </a>
                  ) : null}
                  {content.emails.map((email) => (
                    <a className="block text-sm hover:text-[#1d6744]" href={`mailto:${email}`} key={email}>
                      {email}
                    </a>
                  ))}
                </div>
              </InfoCard>

              <InfoCard icon={MapPin} title="Adres bilgileri">
                <p>{content.address || "Adres bilgisi Sayfalar bölümünden güncellenebilir."}</p>
              </InfoCard>
            </div>

            {content.workingHours.length ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-[#e5ded3] bg-white/80 p-4 text-sm text-[#5f6963]">
                <Clock3 className="mt-0.5 size-5 shrink-0 text-[#9a7445]" />
                <div>
                  <p className="font-bold text-[#34463b]">Çalışma saatleri</p>
                  {content.workingHours.map((hours) => (
                    <p className="mt-1" key={hours}>{hours}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <InquiryForm type="contact" />
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e5ded3] bg-white p-5 shadow-[0_12px_35px_rgba(42,58,49,0.07)]">
      <span className="grid size-11 place-items-center rounded-xl bg-[#80694f] text-white">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <h2 className="mt-4 text-lg font-bold text-[#34463b]">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-[#6b746f]">{children}</div>
    </article>
  );
}
