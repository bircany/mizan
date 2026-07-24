import { CreditCard, MapPin, UserRound } from "lucide-react";

const steps = [
  { description: "Bağışçı bilgileri", icon: UserRound, title: "Bilgiler" },
  { description: "Adres ve onaylar", icon: MapPin, title: "Adres" },
  { description: "Güvenli iyzico formu", icon: CreditCard, title: "Ödeme" },
];

export function PaymentSteps() {
  return (
    <section aria-labelledby="payment-steps-title">
      <h2 className="sr-only" id="payment-steps-title">Ödeme adımları</h2>
      <ol className="grid overflow-hidden rounded-xl border border-outline-variant/60 text-sm text-on-surface-variant sm:grid-cols-3 sm:divide-x sm:divide-outline-variant/60">
        {steps.map(({ description, icon: Icon, title }, index) => (
          <li className={index === 1 ? "relative flex items-center justify-center gap-3 bg-surface-container-low p-4" : "flex items-center justify-center gap-3 bg-white p-4"} key={title}>
            <Icon aria-hidden="true" className="size-6 shrink-0 text-primary" strokeWidth={1.75} />
            <p className="leading-none">
              <strong className="block font-semibold text-on-surface">{title}</strong>
              <span className="mt-1 block text-xs text-on-surface-variant">{description}</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
