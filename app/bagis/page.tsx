"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";

type DonationType = "single" | "regular";

type Campaign = {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  progress: number;
  target: number;
  donors: number;
  quickAmounts: number[];
};

const campaigns: Campaign[] = [
  {
    id: "su-kuyusu",
    title: "Mizan Su Kuyuları Projesi",
    description: "Temiz suya erişimi olmayan kardeşlerimiz için kalıcı çözümler üretiyoruz.",
    category: "Su Kuyusu",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnIPwrfRLrudRXSUCe8iQSWYdiYaXfJrsLQGohophjtkc06TsQ-g3bmmb9ahl7Al7KPFvEjjuY1xmh9UU69ozWwI8o8yLy6qtg3m9d2SaCVrU_uRq6caklCq1uzBKNOsO2lsShaog2w3y4Hoy2U49cd0IX_6pYDZITQTPsJpifj0I1yUma3j5oMkACRH7ycCV2e7AnegG8Du1Psks_LlaJKuGHDTCjSoVQvqiGDfRnGRWpdoFEH11mXwcAPThS6KHpdm9odU1fs6Jp",
    progress: 72,
    target: 45000,
    donors: 1248,
    quickAmounts: [100, 250, 500],
  },
  {
    id: "yetim",
    title: "Bir Yetim Gülsün Dünya Gülsün",
    description: "Yetimlerimizin barınma, gıda ve eğitim masraflarına sponsor olarak geleceklerine ışık tutun.",
    category: "Yetim",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBJC1zi1wrmC724eQykm3zfLh8PDw00MvA9z-teXi0AA1kwJCpBW8kdrgW47nm4iyYY50cNDBQNx5g1R1VGeHBstcBzuK8eyoQuNMInZ0Dvjg6lYvdmVx4iWN5RTUU8zZGlYzPTKjZxnrHi5noinWaUK6eW0TRv8vbBxzvjDlv72LflihcrEytw4RaEUb193MDAT91lg5HNUGrQIgc6q9gIVRNO3zTYwYY-WafDDCCwoovz669PVMANKBScZpMQF0nt9mLu3UzzwPud",
    progress: 45,
    target: 25000,
    donors: 856,
    quickAmounts: [250, 500, 1000],
  },
  {
    id: "kurban-2024",
    title: "2024 Kurban Bağışı",
    description: "Kurban vekaletlerinizi ihtiyaç sahiplerine ulaştırıyoruz.",
    category: "Kurban",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnIPwrfRLrudRXSUCe8iQSWYdiYaXfJrsLQGohophjtkc06TsQ-g3bmmb9ahl7Al7KPFvEjjuY1xmh9UU69ozWwI8o8yLy6qtg3m9d2SaCVrU_uRq6caklCq1uzBKNOsO2lsShaog2w3y4Hoy2U49cd0IX_6pYDZITQTPsJpifj0I1yUma3j5oMkACRH7ycCV2e7AnegG8Du1Psks_LlaJKuGHDTCjSoVQvqiGDfRnGRWpdoFEH11mXwcAPThS6KHpdm9odU1fs6Jp",
    progress: 68,
    target: 120000,
    donors: 2100,
    quickAmounts: [500, 1000, 2500],
  },
  {
    id: "mescid",
    title: "Mescid Projeleri",
    description: "Allah'ın evlerini imar ederek sevaba ortak olun.",
    category: "Mescid",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBJC1zi1wrmC724eQykm3zfLh8PDw00MvA9z-teXi0AA1kwJCpBW8kdrgW47nm4iyYY50cNDBQNx5g1R1VGeHBstcBzuK8eyoQuNMInZ0Dvjg6lYvdmVx4iWN5RTUU8zZGlYzPTKjZxnrHi5noinWaUK6eW0TRv8vbBxzvjDlv72LflihcrEytw4RaEUb193MDAT91lg5HNUGrQIgc6q9gIVRNO3zTYwYY-WafDDCCwoovz669PVMANKBScZpMQF0nt9mLu3UzzwPud",
    progress: 30,
    target: 80000,
    donors: 340,
    quickAmounts: [250, 500, 1000],
  },
];

const categories = [
  { id: "all", label: "Tümü", icon: "apps" },
  { id: "Kurban", label: "Kurban", icon: "restaurant" },
  { id: "Mescid", label: "Mescid", icon: "mosque" },
  { id: "Medrese", label: "Medrese", icon: "school" },
  { id: "Yetim", label: "Yetim", icon: "child_care" },
  { id: "Su Kuyusu", label: "Su Kuyusu", icon: "water_full" },
  { id: "Acil Yardım", label: "Acil Yardım", icon: "emergency_home" },
];

const regions = [
  { label: "Afrika (Hisse: 3.250 ₺)", value: "afrika", price: 3250 },
  { label: "Türkiye (Hisse: 12.500 ₺)", value: "turkiye", price: 12500 },
  { label: "Suriye (Hisse: 8.750 ₺)", value: "suriye", price: 8750 },
  { label: "Yemen (Hisse: 7.500 ₺)", value: "yemen", price: 7500 },
];

export default function BagisPage() {
  const { items: cart, addItem, removeItem, totalAmount: cartTotal } = useCart();
  const { formatPrice } = useCurrency();
  const [donationType, setDonationType] = useState<DonationType>("single");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hisseRegion, setHisseRegion] = useState(regions[0]);
  const [hisseCount, setHisseCount] = useState(1);

  const filteredCampaigns =
    selectedCategory === "all"
      ? campaigns
      : campaigns.filter((c) => c.category === selectedCategory);

  const hisseTotal = hisseCount * hisseRegion.price;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(item: { id: string; title: string; amount: number; image?: string; type?: DonationType }) {
    addItem({
      campaignId: item.id,
      title: item.title,
      amount: item.amount,
      quantity: 1,
      image: item.image,
      isRecurring: (item.type ?? donationType) === "regular",
    });
  }

  function removeFromCart(id: string) {
    removeItem(id);
  }

  function addQurbaniToCart() {
    addItem({
      campaignId: "kurban-bagis",
      title: `Kurban Bağışı - ${hisseRegion.label.split(" (")[0]} (${hisseCount} Hisse)`,
      amount: hisseRegion.price,
      quantity: hisseCount,
      isRecurring: false,
    });
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-container-max mx-auto px-margin-desktop pt-md"
      >
        <ol className="flex items-center space-x-2 text-label-sm text-on-surface-variant">
          <li>
            <a href="/" className="hover:text-primary transition-colors">
              Anasayfa
            </a>
          </li>
          <li>
            <span className="material-symbols-outlined text-[12px]">
              chevron_right
            </span>
          </li>
          <li className="text-primary font-bold">Bağış Yap</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="relative py-xl flex flex-col items-center text-center overflow-hidden max-w-container-max mx-auto px-margin-desktop">
        <div className="absolute inset-0 islamic-pattern -z-10" />
        <div className="mb-sm text-secondary-fixed-dim">
          <span
            className="material-symbols-outlined text-4xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            balance
          </span>
        </div>
        <h1 className="font-display-lg text-display-lg text-primary max-w-2xl mb-md">
          Hayır Yolculuğunuza Başlayın
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-xl mb-lg">
          Yardımlarınızla mazlumların yüzünde bir tebessüm, geleceğine bir umut
          olun. Mizan ile emanetleriniz tam yerinde.
        </p>
        {/* Donation Type Toggle */}
        <div className="bg-surface-container-low p-1.5 rounded-xl flex items-center shadow-sm">
          <button
            onClick={() => setDonationType("single")}
            className={cn(
              "px-8 py-2.5 rounded-lg transition-all font-bold",
              donationType === "single"
                ? "bg-surface shadow-sm text-primary"
                : "text-on-surface-variant font-medium hover:bg-surface-variant/50"
            )}
          >
            Tek Seferlik
          </button>
          <button
            onClick={() => setDonationType("regular")}
            className={cn(
              "px-8 py-2.5 rounded-lg transition-all flex items-center gap-2",
              donationType === "regular"
                ? "bg-surface shadow-sm text-primary font-bold"
                : "text-on-surface-variant font-medium hover:bg-surface-variant/50"
            )}
          >
            Düzenli Bağış
            <span className="bg-secondary text-on-secondary text-[10px] px-2 py-0.5 rounded-full">
              Bereketli
            </span>
          </button>
        </div>
      </section>

      {/* Category Filter */}
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="flex overflow-x-auto gap-sm py-md no-scrollbar sticky top-[72px] bg-surface z-40">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full font-label-md whitespace-nowrap transition-all",
                selectedCategory === cat.id
                  ? "bg-primary text-white"
                  : "bg-white border border-outline-variant text-on-surface hover:border-primary hover:text-primary"
              )}
            >
              <span className="material-symbols-outlined text-[20px]">
                {cat.icon}
              </span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content + Sidebar */}
      <div className="max-w-container-max mx-auto px-margin-desktop pb-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Content */}
          <div className="lg:col-span-8 space-y-md">
            {/* Qurbani Special Box */}
            <div className="bg-primary-container text-on-primary-container p-lg rounded-xl overflow-hidden relative shadow-lg">
              <div className="absolute top-0 right-0 p-lg opacity-10">
                <span className="material-symbols-outlined text-[160px]">
                  restaurant
                </span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-sm">
                  <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-sm uppercase tracking-wider">
                    Öne Çıkan Kampanya
                  </span>
                </div>
                <h2 className="font-headline-xl text-headline-xl mb-sm">
                  2024 Kurban Bağışı
                </h2>
                <p className="font-body-md opacity-90 mb-md max-w-md">
                  Kurban vekaletlerinizi dünyanın dört bir yanındaki ihtiyaç
                  sahiplerine ulaştırıyoruz. İslami usullere uygun kesim ve
                  video bilgilendirme.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md bg-white/10 p-md rounded-lg backdrop-blur-sm border border-white/20">
                  <div>
                    <label className="block text-label-sm mb-xs opacity-80">
                      Bölge Seçin
                    </label>
                    <select
                      value={hisseRegion.value}
                      onChange={(e) => {
                        const region = regions.find(
                          (r) => r.value === e.target.value
                        );
                        if (region) setHisseRegion(region);
                      }}
                      className="w-full bg-white text-on-surface rounded-lg border-none py-2 px-3 focus:ring-2 focus:ring-secondary"
                    >
                      {regions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-sm mb-xs opacity-80">
                      Hisse Sayısı
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setHisseCount(Math.max(1, hisseCount - 1))
                        }
                        className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          remove
                        </span>
                      </button>
                      <input
                        className="w-16 bg-white text-on-surface text-center rounded-lg border-none py-2 focus:ring-2 focus:ring-secondary"
                        type="number"
                        min={1}
                        value={hisseCount}
                        onChange={(e) =>
                          setHisseCount(Math.max(1, parseInt(e.target.value) || 1))
                        }
                      />
                      <button
                        onClick={() => setHisseCount(hisseCount + 1)}
                        className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-md flex items-center justify-between flex-wrap gap-4">
                  <div className="text-headline-md font-bold">
                    Toplam: {formatPrice(hisseTotal)}
                  </div>
                  <button
                    onClick={addQurbaniToCart}
                    className="bg-secondary text-on-secondary px-8 py-3 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all"
                  >
                    Sepete Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bento-card bg-white rounded-xl shadow-sm border border-surface-container flex flex-col h-full"
                >
                  <div className="relative aspect-video">
                    <img
                      src={campaign.image}
                      alt={campaign.title}
                      className="w-full h-full object-cover rounded-t-xl"
                    />
                    <span className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-label-sm">
                      {campaign.category}
                    </span>
                  </div>
                  <div className="p-md flex flex-col flex-grow">
                    <h3 className="font-headline-md text-on-surface line-clamp-2 mb-xs">
                      {campaign.title}
                    </h3>
                    <p className="text-label-md text-on-surface-variant line-clamp-2 mb-md">
                      {campaign.description}
                    </p>
                    <div className="mt-auto space-y-md">
                      <div className="space-y-xs">
                        <div className="flex justify-between text-label-sm font-bold">
                          <span className="text-primary">
                            %{campaign.progress} Tamamlandı
                          </span>
                          <span className="text-on-surface-variant">
                            Hedef: {formatPrice(campaign.target)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full progress-bar-fill"
                            style={{ width: `${campaign.progress}%` }}
                          />
                        </div>
                        <div className="text-label-sm text-on-surface-variant italic">
                          {campaign.donors.toLocaleString("tr-TR")} kişi
                          bağışladı
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-xs">
                        {campaign.quickAmounts.map((amount) => (
                          <button
                            key={amount}
                            onClick={() =>
                              addToCart({
                                id: campaign.id,
                                title: campaign.title,
                                amount,
                                image: campaign.image,
                              })
                            }
                            className="py-2 border border-outline-variant rounded hover:border-primary hover:bg-primary/5 transition-all font-label-md"
                          >
                            {formatPrice(amount)}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          addToCart({
                            id: campaign.id,
                            title: campaign.title,
                            amount: campaign.quickAmounts[1],
                            image: campaign.image,
                          })
                        }
                        className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-95 transition-all"
                      >
                        Bağış Yap
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-[140px] space-y-md">
              {/* Cart */}
              <div className="bg-white rounded-xl shadow-sm border border-surface-container overflow-hidden">
                <div className="bg-surface-container-low px-md py-4 border-b border-surface-container flex justify-between items-center">
                  <h4 className="font-headline-md text-primary text-[20px] flex items-center gap-2">
                    <span className="material-symbols-outlined">
                      shopping_cart
                    </span>
                    Sepetiniz
                  </h4>
                  <span className="text-label-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {cartCount} Ürün
                  </span>
                </div>
                <div className="p-md space-y-md">
                  {cart.length === 0 ? (
                    <p className="text-label-md text-on-surface-variant text-center py-4">
                      Sepetiniz boş
                    </p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.campaignId}>
                        <div className="flex gap-sm">
                          <div className="w-16 h-16 rounded bg-surface-container overflow-hidden flex-shrink-0">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-grow">
                            <div className="flex justify-between items-start">
                              <h5 className="text-label-md font-bold text-on-surface leading-tight">
                                {item.title}
                              </h5>
                              <button
                                onClick={() => removeFromCart(item.campaignId)}
                                className="text-on-surface-variant hover:text-error transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  close
                                </span>
                              </button>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <div className="text-primary font-bold">
                                {formatPrice(item.amount * item.quantity)}
                              </div>
                              {item.isRecurring && (
                                <div className="flex items-center gap-1">
                                  <span className="text-label-sm text-on-surface-variant">
                                    Düzenli
                                  </span>
                                  <span className="material-symbols-outlined text-[14px] text-primary">
                                    sync
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <hr className="border-surface-container mt-md" />
                      </div>
                    ))
                  )}
                  {/* Summary */}
                  <div className="space-y-sm pt-2">
                    <div className="flex justify-between text-label-md">
                      <span className="text-on-surface-variant">
                        Ara Toplam
                      </span>
                      <span className="text-on-surface font-semibold">
                        {formatPrice(cartTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-headline-md font-bold text-primary">
                      <span>Toplam</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                  </div>
                  <a
                    href="/odeme"
                    className="w-full bg-secondary-container text-on-secondary-container py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-secondary-fixed transition-all group"
                  >
                    Ödemeye Geç
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-surface-container-lowest p-md rounded-xl border border-surface-container space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[28px]">
                    lock
                  </span>
                  <div>
                    <div className="text-label-md font-bold">
                      256-bit SSL Koruma
                    </div>
                    <div className="text-label-sm text-on-surface-variant leading-tight">
                      Bilgileriniz uçtan uca şifrelenir.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[28px]">
                    verified_user
                  </span>
                  <div>
                    <div className="text-label-md font-bold">
                      Yasal Dernek Statüsü
                    </div>
                    <div className="text-label-sm text-on-surface-variant leading-tight">
                      T.C. İçişleri Bakanlığı denetimindedir.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[28px]">
                    visibility
                  </span>
                  <div>
                    <div className="text-label-md font-bold">
                      Şeffaf Yönetim
                    </div>
                    <div className="text-label-sm text-on-surface-variant leading-tight">
                      Bağışlarınızın takibini anlık yapın.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
