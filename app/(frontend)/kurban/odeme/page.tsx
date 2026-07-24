import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QurbaniCheckoutForm } from "@/components/qurbani/qurbani-checkout-form";
import { COUNTRIES } from "@/lib/countries";
import { getPublicLocale, localeTag } from "@/lib/i18n";
import { getQurbaniProducts } from "@/lib/public/qurbani";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kurban Ödemesi | Mizan Derneği",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function QurbaniCheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, locale] = await Promise.all([searchParams, getPublicLocale()]);
  const encodedItems = typeof params.items === "string"
    ? params.items
    : typeof params.product === "string"
      ? `${params.product}:${typeof params.shares === "string" ? params.shares : "1"}`
      : "";
  const requestedItems = encodedItems.split(",").map((item) => {
    const [productId, rawQuantity] = item.split(":");
    const quantity = Number.parseInt(rawQuantity, 10);
    return { productId: productId?.trim() || "", quantity: Number.isInteger(quantity) ? quantity : 0 };
  }).filter((item) => item.productId && item.quantity > 0 && item.quantity <= 7);
  const totalQuantity = requestedItems.reduce((sum, item) => sum + item.quantity, 0);
  if (!requestedItems.length || totalQuantity > 7 || new Set(requestedItems.map((item) => item.productId)).size !== requestedItems.length) notFound();
  const selection = await getQurbaniProducts(requestedItems.map((item) => item.productId), locale);
  if (!selection) notFound();
  const quantityByProduct = new Map(requestedItems.map((item) => [item.productId, item.quantity]));
  const items = selection.products.map((product) => ({ product, quantity: quantityByProduct.get(product.id) || 0 }));
  if (items.some((item) => item.quantity > item.product.remainingShares) || new Set(items.map((item) => item.product.currency)).size > 1) notFound();

  const displayNames = new Intl.DisplayNames([localeTag(locale)], { type: "region" });
  const countries = COUNTRIES
    .map(({ code }) => ({ code, name: displayNames.of(code) || code }))
    .sort((left, right) => left.name.localeCompare(right.name, localeTag(locale)));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#eef5ef_100%)] px-margin-mobile py-lg md:px-margin-desktop">
      <div className="mx-auto max-w-container-max">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-on-surface-variant">
          <Link className="hover:text-primary" href="/kurban">Kurban</Link><span className="mx-2">/</span><span>Ödeme</span>
        </nav>
        <QurbaniCheckoutForm countries={countries} items={items} locale={locale} season={selection.season} />
      </div>
    </main>
  );
}
