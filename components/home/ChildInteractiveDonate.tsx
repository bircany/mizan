"use client";

import { useState } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency-context";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

type PackageKey = "food" | "stationery" | "toy" | "clothing";

type PackageItem = {
  key: PackageKey;
  title: string;
  price: number;
  count: number;
  image: string;
  accent: string;
};

const orphanAssets = {
  stationeryCard: "/images/orphan/tools/stationary.svg",
  stationeryOverlay: "/images/orphan/kid/stationary.svg",
  cloth: "/images/orphan/kid/cloth.svg",
  food: "/images/orphan/kid/food.svg",
  headNormal: "/images/orphan/kid/head_normal.svg",
  headHappy: "/images/orphan/kid/head_happy.svg",
  toy: "/images/orphan/kid/toy.svg",
} as const;

const packageMeta = {
  food: {
    title: "Yemek",
    price: 240,
    image: orphanAssets.food,
    accent: "bg-[#F7E7D0]",
  },
  stationery: {
    title: "Kırtasiye",
    price: 150,
    image: orphanAssets.stationeryCard,
    accent: "bg-[#D9ECFF]",
  },
  toy: {
    title: "Oyuncak",
    price: 150,
    image: orphanAssets.toy,
    accent: "bg-[#FFF0D6]",
  },
  clothing: {
    title: "Giyecek",
    price: 250,
    image: orphanAssets.cloth,
    accent: "bg-[#D8F1FF]",
  },
} satisfies Record<
  PackageKey,
  {
    title: string;
    price: number;
    image: string;
    accent: string;
  }
>;

export default function ChildInteractiveDonate() {
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const { t } = useLanguage();

  const [food, setFood] = useState(0);
  const [stationery, setStationery] = useState(0);
  const [toy, setToy] = useState(0);
  const [clothing, setClothing] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const totalTry =
    food * packageMeta.food.price +
    stationery * packageMeta.stationery.price +
    toy * packageMeta.toy.price +
    clothing * packageMeta.clothing.price;

  const totalItems = food + stationery + toy + clothing;
  const packageItems: PackageItem[] = [
    { key: "food", count: food, ...packageMeta.food, title: t("childDonation.packages.food") },
    { key: "stationery", count: stationery, ...packageMeta.stationery, title: t("childDonation.packages.stationery") },
    { key: "toy", count: toy, ...packageMeta.toy, title: t("childDonation.packages.toy") },
    { key: "clothing", count: clothing, ...packageMeta.clothing, title: t("childDonation.packages.clothing") },
  ];

  const happy = totalItems > 0;

  const handleIncrement = (key: PackageKey) => {
    if (key === "food") setFood((prev) => prev + 1);
    if (key === "stationery") setStationery((prev) => prev + 1);
    if (key === "toy") setToy((prev) => prev + 1);
    if (key === "clothing") setClothing((prev) => prev + 1);
  };

  const handleDecrement = (key: PackageKey) => {
    if (key === "food") setFood((prev) => Math.max(0, prev - 1));
    if (key === "stationery") setStationery((prev) => Math.max(0, prev - 1));
    if (key === "toy") setToy((prev) => Math.max(0, prev - 1));
    if (key === "clothing") setClothing((prev) => Math.max(0, prev - 1));
  };

  const handleAddToCart = () => {
    if (totalItems === 0 || isAdding) return;

    setIsAdding(true);
    addItem({
      campaignId: "yetim",
      currency: "TRY",
      title: t("childDonation.supportPackage"),
      amount: totalTry,
      quantity: 1,
    });

    window.setTimeout(() => {
      setIsAdding(false);
      setFood(0);
      setStationery(0);
      setToy(0);
      setClothing(0);
    }, 1200);
  };

  return (
    <section className="relative overflow-hidden bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-[1100px] px-5 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[34px] leading-tight text-black lg:text-[44px]">
            {t("childDonation.headingBefore")}<strong>{t("childDonation.headingStrong")}</strong>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-7 text-black/90 lg:text-[20px]">
            {t("childDonation.description")}
          </p>
        </div>

        <div className="mt-10 grid items-start gap-x-10 gap-y-12 lg:grid-cols-[1fr_420px_1fr] lg:gap-y-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:block lg:space-y-12">
            {packageItems.slice(0, 2).map((item) => (
              <PackageCard
                key={item.key}
                item={item}
                onDecrement={handleDecrement}
                onIncrement={handleIncrement}
                formatPrice={formatPrice}
                t={t}
              />
            ))}
          </div>

          <div className="mx-auto w-full max-w-[420px] text-center">
            <div className="relative mx-auto aspect-[370/490] w-[290px] sm:w-[320px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2"
              >
                <div
                  className="ahmet-spotlight h-full w-full rounded-full blur-[2px]"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(22, 163, 74, 0.34) 0%, rgba(22, 163, 74, 0.16) 42%, rgba(22, 163, 74, 0) 72%)",
                  }}
                />
              </div>

              {stationery > 0 && (
                <img
                  src={orphanAssets.stationeryOverlay}
                  alt={t("childDonation.packages.stationery")}
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-contain"
                />
              )}

              <img
                src={happy ? orphanAssets.headHappy : orphanAssets.headNormal}
                alt="Ahmet"
                className="pointer-events-none absolute inset-0 z-10 h-full w-full select-none object-contain"
              />

              <img
                src={orphanAssets.cloth}
                alt={t("childDonation.packages.clothing")}
                className="pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-contain transition-[filter] duration-300"
                style={{
                  filter: clothing > 0 ? "hue-rotate(-85deg) saturate(1.25)" : "none",
                }}
              />

              {food > 0 && (
                <img
                  src={orphanAssets.food}
                  alt={t("childDonation.packages.food")}
                  className="pointer-events-none absolute inset-0 z-30 h-full w-full select-none object-contain"
                />
              )}
              {toy > 0 && (
                <img
                  src={orphanAssets.toy}
                  alt={t("childDonation.packages.toy")}
                  className="pointer-events-none absolute inset-0 z-30 h-full w-full select-none object-contain"
                />
              )}
            </div>

            <style jsx>{`
              .ahmet-spotlight {
                animation: ahmet-spotlight-pulse 5.2s ease-in-out infinite;
                transform-origin: center;
              }

              @keyframes ahmet-spotlight-pulse {
                0%,
                100% {
                  opacity: 0.58;
                  transform: scale(0.92);
                }
                50% {
                  opacity: 0.9;
                  transform: scale(1.08);
                }
              }

              @media (prefers-reduced-motion: reduce) {
                .ahmet-spotlight {
                  animation: none;
                  opacity: 0.72;
                  transform: none;
                }
              }
            `}</style>

            <div className="mt-5 text-[17px] text-black">
              {t("childDonation.total")} <strong>{formatPrice(totalTry)}</strong>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={totalItems === 0 || isAdding}
              className={cn(
                "mt-4 inline-flex items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-[15px] font-semibold text-white transition-colors",
                totalItems > 0 ? "bg-[#1688e0] hover:bg-[#1278c7]" : "bg-[#9e9e9e] cursor-not-allowed"
              )}
            >
              {isAdding ? t("childDonation.adding") : t("donate.addToCart")}
              {!isAdding && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:block lg:space-y-12">
            {packageItems.slice(2).map((item) => (
              <PackageCard
                key={item.key}
                item={item}
                onDecrement={handleDecrement}
                onIncrement={handleIncrement}
                formatPrice={formatPrice}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PackageCard({
  item,
  onDecrement,
  onIncrement,
  formatPrice,
  t,
}: {
  item: PackageItem;
  onDecrement: (key: PackageKey) => void;
  onIncrement: (key: PackageKey) => void;
  formatPrice: (amount: number) => string;
  t: (key: string) => string;
}) {
  return (
    <div className="text-center">
      <img src={item.image} alt={item.title} className="mx-auto h-[96px] w-[96px] object-contain" />

      <div className="mt-4 flex items-center justify-center gap-3">
        <h3 className="text-[18px] font-semibold text-black">{item.title}</h3>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-medium",
            item.accent,
            item.key === "food" && "text-[#d6801f]",
            item.key === "toy" && "text-[#d68a00]",
            item.key === "stationery" && "text-[#1d81d9]",
            item.key === "clothing" && "text-[#1d81d9]"
          )}
        >
          {formatPrice(item.price)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => onDecrement(item.key)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f4f4] text-[18px] text-black transition-colors hover:bg-[#ededed]"
          aria-label={t("childDonation.decrease").replace("{item}", item.title)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[18px] text-[18px] text-black">{item.count}</span>
        <button
          type="button"
          onClick={() => onIncrement(item.key)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f4f4] text-[18px] text-black transition-colors hover:bg-[#ededed]"
          aria-label={t("childDonation.increase").replace("{item}", item.title)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
