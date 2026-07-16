"use client";

import { useState } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency-context";
import { useCart } from "@/lib/cart-context";

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
  stationary: "https://ihh.org.tr/images/orphan/kid/stationary.svg",
  cloth: "https://ihh.org.tr/images/orphan/kid/cloth.svg",
  food: "https://ihh.org.tr/images/orphan/kid/food.svg",
  headNormal: "https://ihh.org.tr/images/orphan/kid/head_normal.svg",
  headHappy: "https://ihh.org.tr/images/orphan/kid/head_happy.svg",
  toy: "https://ihh.org.tr/images/orphan/kid/toy.svg",
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
    image: orphanAssets.stationary,
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
    { key: "food", count: food, ...packageMeta.food },
    { key: "stationery", count: stationery, ...packageMeta.stationery },
    { key: "toy", count: toy, ...packageMeta.toy },
    { key: "clothing", count: clothing, ...packageMeta.clothing },
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
      title: "Ahmet için destek paketi",
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
            Merhaba, <strong>benim adım Ahmet!</strong>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-7 text-black/90 lg:text-[20px]">
            İhtiyaç sahibi bir çocuğu mutlu etmeye ne dersiniz? Bize katılın, bir çocuğun daha
            eğitimine katkı yapalım.
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
              />
            ))}
          </div>

          <div className="mx-auto w-full max-w-[420px] text-center">
            <div className="relative mx-auto aspect-[370/490] w-[290px] sm:w-[320px]">
              {stationery > 0 && (
                <img
                  src={orphanAssets.stationary}
                  alt="Ahmet'in kırtasiye desteği"
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-contain"
                />
              )}

              <img
                src={happy ? orphanAssets.headHappy : orphanAssets.headNormal}
                alt={happy ? "Gülümseyen Ahmet" : "Ahmet"}
                className="pointer-events-none absolute inset-0 z-10 h-full w-full select-none object-contain"
              />

              <img
                src={orphanAssets.cloth}
                alt={clothing > 0 ? "Yeşil kıyafet" : "Mavi kıyafet"}
                className="pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-contain transition-[filter] duration-300"
                style={{
                  filter: clothing > 0 ? "hue-rotate(-85deg) saturate(1.25)" : "none",
                }}
              />

              {food > 0 && (
                <img
                  src={orphanAssets.food}
                  alt="Ahmet'in yemek desteği"
                  className="pointer-events-none absolute inset-0 z-30 h-full w-full select-none object-contain"
                />
              )}
              {toy > 0 && (
                <img
                  src={orphanAssets.toy}
                  alt="Ahmet'in oyuncak desteği"
                  className="pointer-events-none absolute inset-0 z-30 h-full w-full select-none object-contain"
                />
              )}
            </div>

            <div className="mt-5 text-[17px] text-black">
              Toplam <strong>{formatPrice(totalTry)}</strong>
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
              {isAdding ? "Sepete ekleniyor..." : "Sepete Ekle"}
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
}: {
  item: PackageItem;
  onDecrement: (key: PackageKey) => void;
  onIncrement: (key: PackageKey) => void;
  formatPrice: (amount: number) => string;
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
          aria-label={`${item.title} azalt`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[18px] text-[18px] text-black">{item.count}</span>
        <button
          type="button"
          onClick={() => onIncrement(item.key)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f4f4] text-[18px] text-black transition-colors hover:bg-[#ededed]"
          aria-label={`${item.title} artır`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
