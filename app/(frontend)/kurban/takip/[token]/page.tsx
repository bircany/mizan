import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicLocale } from "@/lib/i18n";
import { getQurbaniTrackingView } from "@/lib/public/qurbani";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata: Metadata = { title: "Kurban Takibi | Mizan Derneği", robots: { index: false, follow: false, noarchive: true, nocache: true } };

const copy = {
  tr: { eyebrow: "Kişisel kurban takibi", title: "Emanetinizin durumu", code: "Kurban kodu", order: "Sipariş", shares: "Size ait hisseler", status: "Operasyon durumu", video: "Kesim videonuz", videoPending: "Video saha ekibi tarafından yüklenip yönetici onayından geçtikten sonra burada yayınlanacaktır.", privacy: "Bu sayfa yalnız bağlantının sahibi içindir. Bağlantıyı herkese açık alanlarda paylaşmayın.", home: "Anasayfa", labels: { open: "Havuz oluşturuluyor", full: "Havuz doldu", assigned: "Saha ekibine atandı", in_progress: "Kesim süreci başladı", video_processing: "Video hazırlanıyor", ready: "Video hazır", notified: "Bildirim gönderildi", closed: "Tamamlandı", pending: "Bekliyor" } },
  en: { eyebrow: "Personal qurbani tracking", title: "Status of your trust", code: "Animal code", order: "Order", shares: "Your shares", status: "Operation status", video: "Your sacrifice video", videoPending: "The video will appear here after the field team uploads it and an administrator approves it.", privacy: "This page is only for the link owner. Do not share it publicly.", home: "Home", labels: { open: "Pool forming", full: "Pool full", assigned: "Assigned to field team", in_progress: "Sacrifice in progress", video_processing: "Video processing", ready: "Video ready", notified: "Notification sent", closed: "Completed", pending: "Pending" } },
  ar: { eyebrow: "متابعة شخصية للأضحية", title: "حالة أمانتكم", code: "رمز الأضحية", order: "الطلب", shares: "حصصكم", status: "حالة العملية", video: "فيديو الذبح", videoPending: "سيظهر الفيديو هنا بعد رفعه من الفريق الميداني واعتماده من الإدارة.", privacy: "هذه الصفحة لصاحب الرابط فقط، فلا تشاركها علنًا.", home: "الرئيسية", labels: { open: "تكوين الحوض", full: "اكتمل الحوض", assigned: "أُسند للفريق الميداني", in_progress: "بدأ الذبح", video_processing: "تجهيز الفيديو", ready: "الفيديو جاهز", notified: "أُرسل الإشعار", closed: "مكتمل", pending: "قيد الانتظار" } },
} as const;

export default async function QurbaniTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, locale] = await Promise.all([params, getPublicLocale()]);
  const tracking = await getQurbaniTrackingView(token);
  if (!tracking) notFound();
  const text = copy[locale];
  const statusLabel = text.labels[tracking.status as keyof typeof text.labels] || text.labels.pending;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#eaf3ec_100%)] px-margin-mobile py-xl md:px-margin-desktop" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[34px] border border-outline-variant/60 bg-white p-6 shadow-ambient sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{text.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold text-on-surface">{text.title}</h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-primary p-5 text-white"><span className="text-xs text-white/65">{text.code}</span><strong className="mt-2 block font-mono text-xl">{tracking.poolCode || "—"}</strong></div>
            <div className="rounded-2xl bg-surface-container p-5"><span className="text-xs text-on-surface-variant">{text.order}</span><strong className="mt-2 block font-mono text-lg">{tracking.orderNumber || "—"}</strong></div>
            <div className="rounded-2xl bg-primary-container p-5"><span className="text-xs text-on-surface-variant">{text.status}</span><strong className="mt-2 block text-primary">{statusLabel}</strong></div>
          </div>
          <section className="mt-6 rounded-2xl border border-outline-variant/60 p-5"><h2 className="font-semibold text-on-surface">{text.shares} ({tracking.shareCount})</h2><ul className="mt-4 grid gap-2 sm:grid-cols-2">{tracking.ownerNames.map((name, index) => <li className="flex items-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm" key={`${index}-${name}`}><span className="material-symbols-outlined text-lg text-primary">person</span>{name}</li>)}</ul></section>
          <section className="mt-6"><h2 className="text-xl font-semibold text-on-surface">{text.video}</h2>{tracking.videoReady ? <video className="mt-4 aspect-video w-full rounded-2xl bg-black" controls playsInline preload="metadata" src={`/api/qurbani/videos/stream?token=${encodeURIComponent(token)}`} /> : <div className="mt-4 rounded-2xl border border-dashed border-outline-variant bg-surface p-8 text-center"><span className="material-symbols-outlined text-5xl text-primary/45">movie</span><p className="mt-3 text-sm leading-6 text-on-surface-variant">{text.videoPending}</p></div>}</section>
          <p className="mt-7 rounded-2xl bg-secondary-container/50 p-4 text-xs leading-5 text-on-secondary-container"><span className="material-symbols-outlined me-2 align-middle text-lg">lock</span>{text.privacy}</p>
          <Link className="btn-outline mt-7" href="/">{text.home}</Link>
        </section>
      </div>
    </main>
  );
}
