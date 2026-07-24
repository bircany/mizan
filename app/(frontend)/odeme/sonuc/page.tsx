import Link from "next/link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getLabel(status: string) {
  switch (status) {
    case "paid":
      return {
        title: "Bağışınız başarıyla alındı",
        description: "Makbuzunuz hazırlanıyor. Operasyon raporu onaylandığında yeni bilgilendirme gönderilecek.",
      };
    case "pending_review":
      return {
        title: "Ödeme alındı, inceleme bekleniyor",
        description: "Fraud veya banka onayı nedeniyle ödemeniz incelemede olabilir.",
      };
    default:
      return {
        title: "Ödeme tamamlanamadı",
        description: "Lütfen bilgileri kontrol edip tekrar deneyin veya dernekle iletişime geçin.",
      };
  }
}

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "failed";
  const receipt = typeof params.receipt === "string" ? params.receipt : undefined;
  const token = typeof params.token === "string" ? params.token : undefined;
  const receiptRequested = params.receiptRequested === "1";
  const message = typeof params.message === "string" ? params.message : undefined;
  const content = getLabel(status);

  return (
    <div className="min-h-screen bg-surface px-margin-mobile py-lg md:px-margin-desktop">
      <div className="mx-auto max-w-2xl rounded-3xl border border-outline-variant bg-white p-8 shadow-soft">
        <p className="mb-3 text-label-md uppercase tracking-[0.2em] text-primary">Ödeme Sonucu</p>
        <h1 className="text-headline-xl text-on-surface">{content.title}</h1>
        <p className="mt-4 text-body-md text-on-surface-variant">{message || content.description}</p>
        {receipt ? (
          <div className="mt-6 rounded-2xl bg-surface-container p-4 text-label-md text-on-surface">
            Makbuz Numaranız: <strong>{receipt}</strong>
            {status === "paid" && receiptRequested && token ? (
              <Link className="btn-primary mt-4 w-full justify-center sm:w-auto" href={`/api/receipts/${encodeURIComponent(receipt)}?token=${encodeURIComponent(token)}`}>
                PDF makbuzu indir
              </Link>
            ) : null}
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/">
            Anasayfaya Dön
          </Link>
          <Link className="btn-outline" href="/bagis">
            Yeni Bağış Yap
          </Link>
        </div>
      </div>
    </div>
  );
}
