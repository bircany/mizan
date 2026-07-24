import type { Metadata } from "next";
import Link from "next/link";

import { getPublicLocale, localeTag } from "@/lib/i18n";
import { getActiveQurbaniCatalog } from "@/lib/public/qurbani";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kurban Siparişi | Mizan Derneği", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const copy = {
  tr: { paid: "Kurban ödemeniz alındı", processing: "Ödemeniz alındı, hisseleriniz hazırlanıyor", reserved: "Kurban hisseleriniz rezerve edildi", pending: "Ödeme doğrulanıyor", failed: "İşlem tamamlanamadı", paidText: "Ödemeniz kesinleşti ve hisseleriniz kurban havuzlarına yerleştirildi. Havuz dolduğunda kurban kodunuz oluşur.", processingText: "Tahsilatınız doğrulandı. Hisselerinizin resmi kaydı güvenli biçimde hazırlanıyor; yeniden ödeme yapmayın. Sistem işlemi otomatik olarak tamamlayacaktır.", reservedText: "Hisseleriniz ödeme süresi boyunca geçici olarak ayrıldı.", pendingText: "iyzico doğrulaması devam ediyor. Sonuç kesinleşmeden havuz doluluğuna eklenmez.", failedText: "Lütfen bilgilerinizi kontrol ederek yeniden deneyin veya bizimle iletişime geçin.", order: "Checkout referansı", expiry: "Rezervasyon bitişi", bank: "EFT bilgileri", copyWarning: "Açıklamaya sipariş referansınızı yazın. Dekont onaylanmadan ödeme kesinleşmez.", receipt: "PDF makbuzu indir", qurbani: "Kurban seçeneklerine dön", contact: "İletişim" },
  en: { paid: "Your qurbani payment was received", processing: "Payment received, your shares are being prepared", reserved: "Your qurbani shares are reserved", pending: "Payment is being verified", failed: "The transaction could not be completed", paidText: "Your payment is confirmed and the shares were allocated to animal pools. Your animal code is generated when a pool is full.", processingText: "Your payment is verified. The official share records are being prepared securely; do not pay again. The system will retry automatically.", reservedText: "Your shares are temporarily held during the payment window.", pendingText: "iyzico verification is still in progress. It does not count towards the full pool until confirmed.", failedText: "Check your details and try again or contact us.", order: "Checkout reference", expiry: "Reservation expires", bank: "Bank transfer details", copyWarning: "Include your order reference in the payment note. Payment is not confirmed before receipt approval.", receipt: "Download PDF receipt", qurbani: "Back to qurbani", contact: "Contact" },
  ar: { paid: "تم استلام دفعة الأضحية", processing: "تم استلام الدفع وجارٍ تجهيز حصصكم", reserved: "تم حجز حصص الأضحية", pending: "يجري التحقق من الدفع", failed: "تعذر إكمال العملية", paidText: "تم تأكيد الدفع وتخصيص الحصص في أحواض الأضاحي، ويُنشأ الرمز عند اكتمال الحوض.", processingText: "تم التحقق من التحصيل ويجري إعداد السجلات الرسمية للحصص بأمان. لا تدفع مرة أخرى، وسيعيد النظام المحاولة تلقائيًا.", reservedText: "حُجزت الحصص مؤقتًا خلال مهلة الدفع.", pendingText: "التحقق عبر iyzico مستمر ولا تُحتسب الحصص قبل التأكيد.", failedText: "تحقق من البيانات وحاول مجددًا أو تواصل معنا.", order: "مرجع الدفع", expiry: "انتهاء الحجز", bank: "بيانات التحويل", copyWarning: "اكتب مرجع الطلب في وصف التحويل. لا يتأكد الدفع قبل اعتماد الإيصال.", receipt: "تنزيل إيصال PDF", qurbani: "العودة للأضاحي", contact: "اتصل بنا" },
} as const;

export default async function QurbaniResultPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, locale] = await Promise.all([searchParams, getPublicLocale()]);
  const text = copy[locale];
  const rawStatus = typeof params.status === "string" ? params.status : "failed";
  const status = rawStatus === "paid" || rawStatus === "reserved" || rawStatus === "processing" || rawStatus === "payment_received_processing"
    ? rawStatus === "payment_received_processing" ? "processing" : rawStatus
    : rawStatus === "pending" || rawStatus === "pending_review"
      ? "pending"
      : "failed";
  const order = typeof params.order === "string" ? params.order : "";
  const expiry = typeof params.expires === "string" ? params.expires : "";
  const method = params.method === "eft" ? "eft" : "iyzico";
  const receipt = typeof params.receipt === "string" ? params.receipt : "";
  const receiptToken = typeof params.token === "string" ? params.token : "";
  const receiptRequested = params.receiptRequested === "1";
  const catalog = method === "eft" ? await getActiveQurbaniCatalog(locale) : null;
  const bank = catalog?.season.bank;
  const title = text[status];
  const description = text[`${status}Text` as const];

  return (
    <main className="grid min-h-[72vh] place-items-center bg-surface px-margin-mobile py-xl" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-2xl rounded-[32px] border border-outline-variant/60 bg-white p-7 shadow-ambient sm:p-10">
        <span className={status === "failed" ? "grid size-16 place-items-center rounded-full bg-error-container text-error" : "grid size-16 place-items-center rounded-full bg-primary-container text-primary"}><span className="material-symbols-outlined text-3xl">{status === "failed" ? "error" : status === "paid" ? "check_circle" : status === "processing" ? "sync" : "schedule"}</span></span>
        <h1 className="mt-6 text-3xl font-semibold text-on-surface">{title}</h1>
        <p className="mt-4 leading-7 text-on-surface-variant">{description}</p>
        {order ? <div className="mt-6 rounded-2xl bg-surface-container p-4 text-sm"><span className="text-on-surface-variant">{text.order}</span><strong className="mt-1 block font-mono text-lg text-on-surface">{order}</strong></div> : null}
        {expiry && Number.isFinite(Date.parse(expiry)) ? <p className="mt-4 text-sm text-on-surface-variant">{text.expiry}: <strong>{new Date(expiry).toLocaleString(localeTag(locale))}</strong></p> : null}
        {method === "eft" && bank ? <section className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5"><h2 className="font-semibold text-on-surface">{text.bank}</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt>Banka</dt><dd className="font-semibold">{bank.bankName}</dd></div><div className="flex justify-between gap-4"><dt>Hesap</dt><dd className="font-semibold">{bank.accountHolder}</dd></div><div className="flex flex-col gap-1"><dt>IBAN</dt><dd className="break-all font-mono font-semibold">{bank.iban}</dd></div></dl><p className="mt-4 text-xs leading-5 text-on-surface-variant">{text.copyWarning}</p></section> : null}
        {(status === "paid" || status === "processing") && receiptRequested && receipt && receiptToken ? <Link className="btn-outline mt-6" href={`/api/receipts/${encodeURIComponent(receipt)}?token=${encodeURIComponent(receiptToken)}`}>{text.receipt}</Link> : null}
        <div className="mt-8 flex flex-wrap gap-3"><Link className="btn-primary" href="/kurban">{text.qurbani}</Link><Link className="btn-outline" href="/iletisim">{text.contact}</Link></div>
      </div>
    </main>
  );
}
