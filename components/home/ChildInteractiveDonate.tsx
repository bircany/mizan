"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/lib/currency-context";
import { useCart } from "@/lib/cart-context";

interface Particle {
  id: number;
  x: number;
  type: "heart" | "star" | "sparkle";
}

export default function ChildInteractiveDonate() {
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();

  const [food, setFood] = useState(0);
  const [stationery, setStationery] = useState(0);
  const [toy, setToy] = useState(0);
  const [clothing, setClothing] = useState(0);

  const [particles, setParticles] = useState<Particle[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const FOOD_PRICE = 240;
  const STATIONERY_PRICE = 150;
  const TOY_PRICE = 150;
  const CLOTHING_PRICE = 250;

  const totalTry =
    food * FOOD_PRICE +
    stationery * STATIONERY_PRICE +
    toy * TOY_PRICE +
    clothing * CLOTHING_PRICE;

  const totalItems = food + stationery + toy + clothing;

  let happinessLevel = 0;
  if (food > 0) happinessLevel++;
  if (stationery > 0) happinessLevel++;
  if (toy > 0) happinessLevel++;
  if (clothing > 0) happinessLevel++;

  const triggerParticles = (type: "heart" | "star" | "sparkle") => {
    const newParticles: Particle[] = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: 30 + Math.random() * 40,
      type,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
  };

  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles((prev) => prev.slice(6));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  const handleIncrement = (type: "food" | "stationery" | "toy" | "clothing") => {
    if (type === "food") {
      setFood((prev) => prev + 1);
      triggerParticles("heart");
    } else if (type === "stationery") {
      setStationery((prev) => prev + 1);
      triggerParticles("sparkle");
    } else if (type === "toy") {
      setToy((prev) => prev + 1);
      triggerParticles("star");
    } else if (type === "clothing") {
      setClothing((prev) => prev + 1);
      triggerParticles("sparkle");
    }
  };

  const handleDecrement = (type: "food" | "stationery" | "toy" | "clothing") => {
    if (type === "food" && food > 0) setFood((prev) => prev - 1);
    else if (type === "stationery" && stationery > 0) setStationery((prev) => prev - 1);
    else if (type === "toy" && toy > 0) setToy((prev) => prev - 1);
    else if (type === "clothing" && clothing > 0) setClothing((prev) => prev - 1);
  };

  const handleAddToCart = () => {
    if (totalItems === 0) return;

    setIsAdding(true);
    setShowConfetti(true);

    if (food > 0) {
      addItem({
        campaignId: "ahmed-gida",
        title: "Yetim Sevindir - Gıda Paketi (Ahmed)",
        amount: FOOD_PRICE,
        quantity: food,
      });
    }
    if (stationery > 0) {
      addItem({
        campaignId: "ahmed-kirtasiye",
        title: "Yetim Sevindir - Kırtasiye Paketi (Ahmed)",
        amount: STATIONERY_PRICE,
        quantity: stationery,
      });
    }
    if (toy > 0) {
      addItem({
        campaignId: "ahmed-oyuncak",
        title: "Yetim Sevindir - Oyuncak Paketi (Ahmed)",
        amount: TOY_PRICE,
        quantity: toy,
      });
    }
    if (clothing > 0) {
      addItem({
        campaignId: "ahmed-giyim",
        title: "Yetim Sevindir - Giyim Paketi (Ahmed)",
        amount: CLOTHING_PRICE,
        quantity: clothing,
      });
    }

    setTimeout(() => {
      setIsAdding(false);
      setShowConfetti(false);
      setFood(0);
      setStationery(0);
      setToy(0);
      setClothing(0);
    }, 2000);
  };

  const hasFood = food > 0;
  const hasStationery = stationery > 0;
  const hasToy = toy > 0;
  const hasClothing = clothing > 0;

  const donationItems = [
    {
      type: "food" as const,
      emoji: "🍜",
      title: "Gıda Paketi",
      price: FOOD_PRICE,
      count: food,
      setCount: setFood,
    },
    {
      type: "stationery" as const,
      emoji: "🎒",
      title: "Eğitim Paketi",
      price: STATIONERY_PRICE,
      count: stationery,
      setCount: setStationery,
    },
    {
      type: "toy" as const,
      emoji: "🧸",
      title: "Oyuncak Paketi",
      price: TOY_PRICE,
      count: toy,
      setCount: setToy,
    },
    {
      type: "clothing" as const,
      emoji: "👕",
      title: "Giyim Paketi",
      price: CLOTHING_PRICE,
      count: clothing,
      setCount: setClothing,
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-surface-container-low overflow-hidden relative">
      <div className="absolute inset-0 opacity-5 pointer-events-none islamic-pattern" />

      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden flex justify-center">
          {Array.from({ length: 40 }).map((_, idx) => (
            <div
              key={idx}
              className="absolute w-3 h-3 rounded-full animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                backgroundColor: ["#CC0000", "#991B1B", "#C9A84C", "#4CAF50", "#2196F3"][
                  Math.floor(Math.random() * 5)
                ],
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-container-max mx-auto px-margin-desktop relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 text-secondary text-label-sm uppercase tracking-widest font-semibold">
            <span className="material-symbols-outlined text-[18px]">child_care</span>
            Etkileşimli Yetim Bağışı
          </span>
          <h2 className="text-headline-xl text-on-surface mt-3 leading-tight">
            Merhaba, Ben Ahmed!
          </h2>
          <p className="text-body-md text-on-surface-variant/70 mt-3">
            İhtiyaç sahibi yetim çocuklarımızın eğitim, gıda ve giyim masraflarını karşılayarak
            onların yüzünde bir tebessüm oluşturabilirsiniz.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Cards */}
          <div className="lg:col-span-4 space-y-4">
            {donationItems.slice(0, 2).map((item) => (
              <div
                key={item.type}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 bg-white",
                  item.count > 0
                    ? "border-primary/30 shadow-md scale-[1.02]"
                    : "border-outline-variant/15 hover:border-primary/20 hover:shadow-sm"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-[28px] shrink-0 transition-all duration-300",
                  item.count > 0 ? "bg-primary/10" : "bg-surface-container-low"
                )}>
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-headline-md text-on-surface text-[17px]">{item.title}</h4>
                  <p className="text-label-sm font-bold mt-1 text-primary">
                    {formatPrice(item.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleDecrement(item.type)}
                      className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center hover:bg-outline-variant/30 text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-8 text-center text-label-md font-bold">{item.count}</span>
                    <button
                      onClick={() => handleIncrement(item.type)}
                      className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Center SVG Character */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center relative py-4">
            {/* Animated Glow Backdrop */}
            <div className={cn(
              "absolute w-56 h-56 rounded-full filter blur-3xl opacity-30 transition-all duration-1000 animate-pulse",
              happinessLevel === 0 && "bg-[#9aa0a6] scale-75",
              happinessLevel === 1 && "bg-[#FFEB3B] scale-90",
              happinessLevel === 2 && "bg-[#FF9800] scale-100",
              happinessLevel === 3 && "bg-[#E91E63] scale-110",
              happinessLevel === 4 && "bg-[#C9A84C] scale-125 shadow-[0_0_50px_rgba(201,168,76,0.5)]"
            )} />

            {/* Floating Particles */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="absolute animate-float-up text-[24px]"
                  style={{
                    left: `${p.x}%`,
                    bottom: "20%",
                  }}
                >
                  {p.type === "heart" && "❤️"}
                  {p.type === "star" && "⭐"}
                  {p.type === "sparkle" && "✨"}
                </div>
              ))}
            </div>

            {/* Ahmed SVG Avatar */}
            <svg
              className="w-56 h-72 drop-shadow-xl relative z-10 select-none overflow-visible"
              viewBox="0 0 240 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {hasStationery && (
                <g className="animate-fade-in" style={{ transformOrigin: "120px 180px" }}>
                  <path d="M95 145 C85 145, 80 180, 85 205" stroke="#1E88E5" strokeWidth="12" strokeLinecap="round" fill="none" />
                  <path d="M145 145 C155 145, 160 180, 155 205" stroke="#1E88E5" strokeWidth="12" strokeLinecap="round" fill="none" />
                  <rect x="80" y="150" width="80" height="90" rx="20" fill="#1565C0" />
                  <rect x="92" y="165" width="56" height="55" rx="10" fill="#1E88E5" />
                  <path d="M120 135 L120 150" stroke="#0D47A1" strokeWidth="8" strokeLinecap="round" />
                </g>
              )}

              <rect x="100" y="240" width="16" height="40" fill="#8d6e63" />
              <rect x="124" y="240" width="16" height="40" fill="#8d6e63" />

              {hasClothing ? (
                <g className="animate-fade-in">
                  <rect x="94" y="274" width="24" height="14" rx="4" fill="#CC0000" />
                  <path d="M94 282 L118 282" stroke="white" strokeWidth="2" />
                  <circle cx="106" cy="278" r="1.5" fill="white" />
                  <rect x="122" y="274" width="24" height="14" rx="4" fill="#CC0000" />
                  <path d="M122 282 L146 282" stroke="white" strokeWidth="2" />
                  <circle cx="134" cy="278" r="1.5" fill="white" />
                </g>
              ) : (
                <g>
                  <ellipse cx="108" cy="280" rx="10" ry="6" fill="#f5cba7" />
                  <circle cx="100" cy="279" r="2.5" fill="#f5cba7" />
                  <circle cx="104" cy="278" r="2" fill="#f5cba7" />
                  <circle cx="108" cy="278" r="2" fill="#f5cba7" />
                  <ellipse cx="132" cy="280" rx="10" ry="6" fill="#f5cba7" />
                  <circle cx="140" cy="279" r="2.5" fill="#f5cba7" />
                  <circle cx="136" cy="278" r="2" fill="#f5cba7" />
                  <circle cx="132" cy="278" r="2" fill="#f5cba7" />
                </g>
              )}

              {hasClothing ? (
                <g className="animate-fade-in">
                  <path d="M85 155 L65 200" stroke="#CC0000" strokeWidth="20" strokeLinecap="round" />
                  <path d="M155 155 L175 200" stroke="#CC0000" strokeWidth="20" strokeLinecap="round" />
                  <rect x="80" y="150" width="80" height="95" rx="15" fill="#CC0000" />
                  <path d="M80 150 C80 125, 160 125, 160 150" fill="none" stroke="#991B1B" strokeWidth="12" />
                  <path
                    d="M120 185 C120 185, 112 177, 112 172 C112 168, 116 165, 120 169 C124 165, 128 168, 128 172 C128 177, 120 185, 120 185 Z"
                    fill="#C9A84C"
                  />
                  <line x1="112" y1="160" x2="112" y2="175" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="128" y1="160" x2="128" y2="175" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              ) : (
                <g>
                  <path d="M85 155 L70 185" stroke="#81C784" strokeWidth="16" strokeLinecap="round" />
                  <path d="M155 155 L170 185" stroke="#81C784" strokeWidth="16" strokeLinecap="round" />
                  <rect x="82" y="150" width="76" height="90" rx="8" fill="#81C784" />
                  <path d="M102 150 C102 158, 138 158, 138 150" stroke="#66BB6A" strokeWidth="4" fill="none" />
                </g>
              )}

              {hasFood ? (
                <g className="animate-fade-in">
                  <path d="M80 185 L65 210" stroke={hasClothing ? "#CC0000" : "#81C784"} strokeWidth="16" strokeLinecap="round" />
                  <circle cx="58" cy="215" r="9" fill="#f5cba7" />
                  <path d="M40 215 C40 230, 76 230, 76 215 Z" fill="#FFB74D" />
                  <rect x="42" y="211" width="32" height="4" fill="#FFA726" />
                  <line x1="44" y1="214" x2="72" y2="214" stroke="#D32F2F" strokeWidth="3" />
                  <path
                    className="animate-steam"
                    d="M48 205 Q52 197 48 190 T52 175"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    style={{ opacity: 0.6 }}
                  />
                  <path
                    className="animate-steam"
                    d="M60 205 Q64 195 60 187 T64 170"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    style={{ opacity: 0.6, animationDelay: "0.4s" }}
                  />
                  <path
                    className="animate-steam"
                    d="M68 207 Q72 199 68 191 T72 178"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    style={{ opacity: 0.6, animationDelay: "0.8s" }}
                  />
                </g>
              ) : (
                <g>
                  <circle cx="62" cy="202" r="8" fill="#f5cba7" />
                </g>
              )}

              <g>
                <circle cx="178" cy="202" r="8" fill="#f5cba7" />
              </g>

              <g style={{ transformOrigin: "120px 105px" }}>
                <rect x="110" y="132" width="20" height="20" fill="#f5cba7" />
                <circle cx="80" cy="110" r="10" fill="#f5cba7" />
                <circle cx="160" cy="110" r="10" fill="#f5cba7" />
                <circle cx="120" cy="105" r="42" fill="#f5cba7" />
                <path d="M76 96 C70 80, 100 60, 120 62 C140 60, 170 80, 164 96 C160 88, 150 82, 140 85 C130 80, 110 80, 100 85 C90 82, 80 88, 76 96 Z" fill="#4E342E" />
                <path d="M78 96 L78 112 L84 105 Z" fill="#4E342E" />
                <path d="M162 96 L162 112 L156 105 Z" fill="#4E342E" />

                {happinessLevel === 0 ? (
                  <g className="transition-all duration-500">
                    <path d="M94 92 C98 94, 104 94, 108 92" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M146 92 C142 94, 136 94, 132 92" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <circle cx="101" cy="98" r="3" fill="#4E342E" />
                    <circle cx="139" cy="98" r="3" fill="#4E342E" />
                    <path d="M110 124 Q120 118 130 124" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </g>
                ) : happinessLevel >= 1 && happinessLevel <= 2 ? (
                  <g className="transition-all duration-500">
                    <path d="M94 90 C98 88, 104 88, 108 90" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M146 90 C142 88, 136 88, 132 90" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <circle cx="101" cy="98" r="4.5" fill="#4E342E" />
                    <circle cx="103" cy="96" r="1.5" fill="white" />
                    <circle cx="139" cy="98" r="4.5" fill="#4E342E" />
                    <circle cx="141" cy="96" r="1.5" fill="white" />
                    <path d="M112 118 Q120 126 128 118" stroke="#4E342E" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </g>
                ) : (
                  <g className="transition-all duration-500">
                    <path d="M94 87 C98 84, 104 84, 108 87" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M146 87 C142 84, 136 84, 132 87" stroke="#4E342E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M95 99 Q101 93 107 99" stroke="#4E342E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                    <path d="M133 99 Q139 93 145 99" stroke="#4E342E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                    <circle cx="92" cy="108" r="6" fill="#E91E63" opacity="0.3" />
                    <circle cx="148" cy="108" r="6" fill="#E91E63" opacity="0.3" />
                    <path d="M110 115 C110 115, 110 132, 120 132 C130 132, 130 115, 130 115 Z" fill="#D32F2F" />
                    <path d="M115 127 C117 124, 123 124, 125 127" stroke="#FF8A80" strokeWidth="2.5" fill="none" />
                  </g>
                )}
              </g>

              {hasToy && (
                <g className="animate-bounce-slow" style={{ transformOrigin: "185px 190px" }}>
                  <rect x="180" y="165" width="30" height="28" rx="8" fill="#FF8A65" />
                  <circle cx="195" cy="150" r="14" fill="#FF8A65" />
                  <circle cx="184" cy="138" r="5" fill="#FF8A65" />
                  <circle cx="206" cy="138" r="5" fill="#FF8A65" />
                  <ellipse cx="195" cy="154" rx="5" ry="3.5" fill="#FFCC80" />
                  <circle cx="195" cy="152" r="1.5" fill="#4E342E" />
                  <circle cx="190" cy="148" r="1.5" fill="#4E342E" />
                  <circle cx="200" cy="148" r="1.5" fill="#4E342E" />
                  <path d="M195 190 Q205 210 184 204" stroke="#B0BEC5" strokeWidth="1.5" fill="none" />
                </g>
              )}
            </svg>

            {/* Status Card */}
            <div className="mt-6 bg-white px-6 py-3 rounded-xl border border-outline-variant/15 text-center shadow-sm relative z-10 w-full max-w-[220px]">
              <span className="text-label-sm font-semibold text-on-surface-variant/70 block uppercase tracking-wide">
                Ahmed'in Durumu
              </span>
              <span className={cn(
                "text-lg font-bold block mt-1 transition-all duration-500",
                happinessLevel === 0 && "text-on-surface-variant",
                happinessLevel === 1 && "text-primary",
                happinessLevel === 2 && "text-[#FF9800]",
                happinessLevel === 3 && "text-[#E91E63]",
                happinessLevel === 4 && "text-[#C9A84C]"
              )}>
                {happinessLevel === 0 && "Mahzun 😔"}
                {happinessLevel === 1 && "Biraz Umutlu 🙂"}
                {happinessLevel === 2 && "Mutlu 😊"}
                {happinessLevel === 3 && "Çok Mutlu 🥳"}
                {happinessLevel === 4 && "Tarifsiz Sevinç! 🎉"}
              </span>
            </div>
          </div>

          {/* Right Cards */}
          <div className="lg:col-span-4 space-y-4">
            {donationItems.slice(2).map((item) => (
              <div
                key={item.type}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 bg-white",
                  item.count > 0
                    ? "border-primary/30 shadow-md scale-[1.02]"
                    : "border-outline-variant/15 hover:border-primary/20 hover:shadow-sm"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-[28px] shrink-0 transition-all duration-300",
                  item.count > 0 ? "bg-primary/10" : "bg-surface-container-low"
                )}>
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-headline-md text-on-surface text-[17px]">{item.title}</h4>
                  <p className="text-label-sm font-bold mt-1 text-primary">
                    {formatPrice(item.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleDecrement(item.type)}
                      className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center hover:bg-outline-variant/30 text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-8 text-center text-label-md font-bold">{item.count}</span>
                    <button
                      onClick={() => handleIncrement(item.type)}
                      className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center hover:bg-opacity-90 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Total & Add to Cart Panel */}
        <div className="mt-14 max-w-lg mx-auto bg-white border border-outline-variant/15 rounded-2xl p-7 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-primary">
            <span className="material-symbols-outlined text-[100px]">volunteer_activism</span>
          </div>
          <div className="relative z-10">
            <p className="text-on-surface-variant/70 text-label-sm font-medium uppercase tracking-wide">
              Toplanan Sevgi Yardımı
            </p>
            <h3 className="text-3xl text-primary font-bold mt-2">
              {formatPrice(totalTry)}
            </h3>

            <button
              onClick={handleAddToCart}
              disabled={totalItems === 0 || isAdding}
              className={cn(
                "w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 mt-6 transition-all duration-300 text-label-md",
                totalItems > 0
                  ? "bg-secondary text-white hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                  : "bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed border border-outline-variant/10 shadow-none"
              )}
            >
              {isAdding ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  Ekleniyor...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">volunteer_activism</span>
                  Sepete Ekle
                </>
              )}
            </button>
            <p className="text-[11px] text-on-surface-variant/50 mt-3 italic">
              * Yardımlarınız doğrudan Ahmed gibi yüzbinlerce yetim kardeşimizin ihtiyaçlarına ulaştırılır.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(-120px) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes steam {
          0% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            stroke-dashoffset: -30;
            opacity: 0;
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        .animate-float-up {
          animation: floatUp 1.5s ease-out forwards;
        }
        .animate-steam {
          stroke-dasharray: 10, 20;
          animation: steam 2s linear infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-bounce-slow {
          animation: bounceSlow 3s ease-in-out infinite;
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </section>
  );
}
