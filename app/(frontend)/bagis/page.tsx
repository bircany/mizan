import type { Metadata } from "next";

import { DonationAreasBrowser } from "@/components/donations/donation-areas-browser";
import { buildDonationAreaCategories, getOpenDonationAreas } from "@/lib/public/donation-areas";
import { getPublicLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const metadataByLocale = {
  tr: { title: "Bağış alanları | Mizan Derneği", description: "Güncel bağış alanlarını inceleyin, hedefleri takip edin ve size uygun alana kolayca bağış yapın." },
  en: { title: "Donation areas | Mizan Association", description: "Explore current donation areas, follow their targets, and donate to the area that matters to you." },
  ar: { title: "مجالات التبرع | جمعية ميزان", description: "تعرّف على مجالات التبرع الحالية وتابع أهدافها وتبرع للمجال الذي يهمك." },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPublicLocale();
  return metadataByLocale[locale];
}

export default async function BagisPage() {
  const locale = await getPublicLocale();
  const areas = await getOpenDonationAreas(locale);
  const categories = buildDonationAreaCategories(areas, locale);

  return <DonationAreasBrowser areas={areas} categories={categories} locale={locale} />;
}
