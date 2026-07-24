import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DonationAreaDetail } from "@/components/donations/donation-area-detail";
import { getDonationAreaBySlug, getOpenDonationAreas } from "@/lib/public/donation-areas";
import { getPublicLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getPublicLocale();
  const area = await getDonationAreaBySlug(slug, locale);

  if (!area) {
    return {
      title: "Bagis alani bulunamadi | Mizan Dernegi",
      description: "Aradiginiz bagis alani yayinli degil veya bulunamadi.",
    };
  }

  const description = area.description || area.excerpt;

  return {
    title: `${area.title} | Bagis alani | Mizan Dernegi`,
    description,
    alternates: {
      canonical: `/bagis/${area.slug}`,
    },
    openGraph: {
      title: area.title,
      description,
      url: `/bagis/${area.slug}`,
      type: "article",
      images: area.image ? [{ url: area.image.src, alt: area.image.alt }] : undefined,
    },
  };
}

export default async function BagisDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getPublicLocale();
  const area = await getDonationAreaBySlug(slug, locale);

  if (!area) {
    notFound();
  }

  return <DonationAreaDetail area={area} locale={locale} />;
}

export async function generateStaticParams() {
  const areas = await getOpenDonationAreas("tr");
  return areas.map((area) => ({ slug: area.slug }));
}
