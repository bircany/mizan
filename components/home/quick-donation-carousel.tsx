"use client";

import { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";

interface Category {
  label: string;
  icon: string;
}

interface QuickDonationCarouselProps {
  categories: Category[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function QuickDonationCarousel({
  categories,
  activeIndex,
  onSelect,
}: QuickDonationCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: true,
    skipSnaps: false,
    dragFree: false,
  });

  const onEmblaSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    onSelect(idx);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onEmblaSelect);
    emblaApi.on("reInit", onEmblaSelect);
    const frame = requestAnimationFrame(onEmblaSelect);
    return () => {
      cancelAnimationFrame(frame);
      emblaApi.off("select", onEmblaSelect);
      emblaApi.off("reInit", onEmblaSelect);
    };
  }, [emblaApi, onEmblaSelect]);

  const handleCardClick = useCallback(
    (index: number) => {
      if (!emblaApi) return;
      emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {categories.map((category, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              aria-pressed={isActive}
              className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all duration-300 ${
                isActive
                  ? "border-primary bg-primary text-white shadow-[0_14px_28px_rgba(14,90,58,0.22)]"
                  : "border-[#e7ebe6] bg-white text-on-surface-variant shadow-sm active:scale-[0.98]"
              }`}
              key={category.label}
              onClick={() => onSelect(index)}
              type="button"
            >
              <span
                className={`grid size-11 place-items-center rounded-xl ${
                  isActive ? "bg-white/15 text-white" : "bg-primary/5 text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[23px]">{category.icon}</span>
              </span>
              <span className="text-sm font-semibold leading-tight">{category.label}</span>
            </button>
          );
        })}
      </div>

      <div className="hidden overflow-hidden sm:block" ref={emblaRef}>
        <div className="flex">
        {categories.map((cat, i) => {
          const isActive = i === activeIndex;
          return (
            <div
              key={cat.label}
              className="flex-[0_0_auto] min-w-0 px-3 py-2"
              style={{ width: "calc(100% / 5)" }}
            >
              <button
                aria-pressed={isActive}
                onClick={() => handleCardClick(i)}
                className={`w-full flex flex-col items-center gap-3 p-5 rounded-3xl cursor-pointer transition-all duration-500 ease-out ${
                  isActive
                    ? "bg-primary text-white scale-110 shadow-2xl z-10"
                    : "bg-white text-on-surface-variant scale-90 opacity-70 shadow-md hover:opacity-90"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isActive ? "bg-white/20 text-white" : "bg-primary/5 text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[28px]">
                    {cat.icon}
                  </span>
                </div>
                <span className="text-label-sm font-semibold whitespace-nowrap">
                  {cat.label}
                </span>
              </button>
            </div>
          );
        })}
        </div>
      </div>
    </>
  );
}
