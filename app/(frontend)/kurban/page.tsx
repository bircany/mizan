import type { Metadata } from "next";

import { DonationAreasBrowser } from "@/components/donations/donation-areas-browser";
import {
  buildDonationAreaCategories,
  getOpenDonationAreas,
  isQurbaniDonationArea,
} from "@/lib/public/donation-areas";
import { getPublicLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kurban Bağışı | Mizan Derneği",
  description:
    "Mizan Derneği kurban, adak ve hisse bağışı kampanyalarını inceleyin ve güvenle bağış yapın.",
};

export default async function KurbanPage() {
  const locale = await getPublicLocale();
  const areas = (await getOpenDonationAreas(locale)).filter(isQurbaniDonationArea);

  return (
    <DonationAreasBrowser
      areas={areas}
      categories={buildDonationAreaCategories(areas, locale)}
      locale={locale}
    />
  );
}
