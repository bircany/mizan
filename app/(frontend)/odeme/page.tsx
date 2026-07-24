import PaymentForm from "./payment-form";

import { COUNTRIES } from "@/lib/countries";

export default function OdemePage() {
  return <PaymentForm countries={COUNTRIES} />;
}
