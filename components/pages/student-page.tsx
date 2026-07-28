import { Clock3, Mail, Phone, Sparkles } from "lucide-react";

import { InquiryForm } from "@/components/pages/inquiry-form";
import { phoneHref } from "@/lib/eft-guidance";
import { getPublicLocale } from "@/lib/i18n";
import { parseStudentPage } from "@/lib/inquiry-pages";
import { getPublishedPageBySlug } from "@/lib/public/pages";
import { getManagedSitePage } from "@/lib/site-pages";

export async function StudentPage() {
  const [locale, fallback] = await Promise.all([
    getPublicLocale(),
    Promise.resolve(getManagedSitePage("talebe-ol")),
  ]);
  const page = await getPublishedPageBySlug("talebe-ol", locale);
  const paragraphs = page?.paragraphs?.length
    ? page.paragraphs
    : (fallback?.content || "").split(/\n\s*\n/).filter(Boolean);
  const content = parseStudentPage(
    page?.title || fallback?.title || "Talebe Ol",
    paragraphs,
  );
  const callNumber = phoneHref(content.phone);

  return (
    <main className="bg-[#fbfaf7]" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="relative overflow-hidden bg-[#806f5c] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2)_0,transparent_30%),linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.12)_35%,rgba(255,255,255,0.03)_68%,transparent_68%)]"
        />
        <div className="relative mx-auto flex min-h-64 max-w-[1120px] items-center justify-between gap-8 px-margin-mobile py-14 md:px-margin-desktop">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ead6b2]">
              Eğitim ve gelişim
            </p>
            <h1 className="mt-3 text-[clamp(2.4rem,6vw,4.4rem)] font-semibold tracking-[-0.04em]">
              {content.title}
            </h1>
          </div>
          <Sparkles className="hidden size-20 text-white/25 md:block" strokeWidth={1} />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-10 px-margin-mobile py-14 md:px-margin-desktop md:py-20 lg:grid-cols-[1fr_0.95fr] lg:items-start lg:gap-16">
        <InquiryForm programs={content.programs} type="student" />

        <div className="lg:pt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a7445]">
            Ön başvuru ve bilgi
          </p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#173525]">
            İlim yolculuğunuz için ilk adımı atın.
          </h2>
          <p className="mt-6 text-base leading-8 text-[#657069]">{content.intro}</p>

          <div className="mt-9 rounded-2xl border border-[#e6ded2] bg-white p-5">
            <div className="flex items-center gap-3">
              <Clock3 className="size-5 text-[#9a7445]" />
              <h3 className="font-bold text-[#34463b]">Eğitim ve görüşme zamanları</h3>
            </div>
            <dl className="mt-4 divide-y divide-[#eee8df] text-sm">
              <div className="flex items-start justify-between gap-5 py-3">
                <dt className="text-[#737b76]">Hafta içi</dt>
                <dd className="text-right font-semibold text-[#34463b]">{content.weekday || "Bilgi için iletişime geçin"}</dd>
              </div>
              <div className="flex items-start justify-between gap-5 py-3">
                <dt className="text-[#737b76]">Hafta sonu</dt>
                <dd className="text-right font-semibold text-[#34463b]">{content.weekend || "Bilgi için iletişime geçin"}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {content.email ? (
              <a className="rounded-2xl border border-[#e6ded2] bg-white p-5 transition hover:border-[#b8cdbf]" href={`mailto:${content.email}`}>
                <Mail className="size-5 text-[#1d6744]" />
                <p className="mt-3 text-xs text-[#737b76]">E-posta</p>
                <p className="mt-1 break-all text-sm font-bold text-[#34463b]">{content.email}</p>
              </a>
            ) : null}
            {callNumber ? (
              <a className="rounded-2xl border border-[#e6ded2] bg-white p-5 transition hover:border-[#b8cdbf]" href={`tel:${callNumber}`}>
                <Phone className="size-5 text-[#1d6744]" />
                <p className="mt-3 text-xs text-[#737b76]">Telefon</p>
                <p className="mt-1 text-sm font-bold text-[#34463b]">{content.phone}</p>
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
