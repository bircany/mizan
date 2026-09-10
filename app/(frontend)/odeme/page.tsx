import PaymentForm from "./payment-form";

import { COUNTRIES } from "@/lib/countries";
import { parseEftGuidance } from "@/lib/eft-guidance";
import { resolveIyzicoMaxPaymentAmount } from "@/lib/payments/limits";
import { areCardPaymentsEnabled } from "@/lib/payments/card-payments";
import { getPublishedPageBySlug } from "@/lib/public/pages";
import { getManagedSitePage } from "@/lib/site-pages";

export default async function OdemePage() {
  const fallback = getManagedSitePage("eft-havale-bilgileri");
  const savedPage = await getPublishedPageBySlug(
    "eft-havale-bilgileri",
    "tr",
  ).catch(() => null);
  const eftGuidance = parseEftGuidance(
    savedPage?.title || fallback?.title || "EFT / Havale ile Bağış",
    savedPage?.paragraphs ||
      fallback?.content
        .split(/\n\s*\n/)
        .map((value) => value.trim())
        .filter(Boolean) ||
      [],
  );

  return (
    <PaymentForm
      countries={COUNTRIES}
      eftGuidance={eftGuidance}
      cardPaymentsEnabled={areCardPaymentsEnabled()}
      iyzicoMaxPaymentAmount={resolveIyzicoMaxPaymentAmount(
        process.env.IYZICO_MAX_PAYMENT_AMOUNT,
      )}
    />
  );
}
