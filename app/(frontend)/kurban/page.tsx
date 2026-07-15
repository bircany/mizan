"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const TARGET_DATE = new Date("2027-06-01T00:00:00").getTime();

interface PackageItem {
  id: string;
  title: string;
  region: string;
  regionLabel: string;
  regionEmoji: string;
  price: number;
  description: string;
  image: string;
  badge: string;
  maxQty: number;
  popular: boolean;
}

const packages: PackageItem[] = [
  {
    id: "buyukbas-afrika",
    title: "Büyükbaş Hisse",
    region: "afrika",
    regionLabel: "Afrika",
    regionEmoji: "\u{1F30D}",
    price: 2850,
    description:
      "Somali, Çad, Mali gibi ihtiyaç sahibi Afrika ülkelerinde kesilip dağıtılacaktır.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCw1W0pOyWZo5YUAL1TCjQBXVVutojQBP3KV0x_Upza2X6K4fzFJwFSWPVR8gCL0MREjLwtCVoxlW0UHYOF_EU6wJYNC5c74GGLgK5z8gBZkbU3R84j0spgR8QsLaLFV7aTEgUOhVRr3iTK6VhFgaNOEqwQc1x6iPFyVVB3swvFPzv06Ba1iDM3tV2iDCmO6_Batsi71rOomnBnTg2EQeo3rqQLNTfYbzMYNUvZjv0nTEGNmw2L9CsDtGroESmJHm3qdwvDiCCISvoa",
    badge: "Afrika B.",
    maxQty: 7,
    popular: false,
  },
  {
    id: "kucukbas-afrika",
    title: "Küçükbaş",
    region: "afrika",
    regionLabel: "Afrika",
    regionEmoji: "\u{1F30D}",
    price: 3200,
    description:
      "Nijer, Kenya, Sudan gibi ülkelerde bir ailenin et ihtiyacını karşılayacaktır.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCTNZuHvESfzWAOd31vWpUqPvUTRvlhTbAswRuu3-r3otmJMW_b8rYhB87GlmzWNYyqB8HnY_zb9PCxKteOID505MG38sTiSnR9TN92zL9n2eGuWZ9d-ocrdT3DsZkJllxTeuLNpZndwmzsVdN0Z1A0xC5zWMoJDBBhAPft1l_wd5tJaqDRkvgr-XAQROhigBplrWz6VSS4Pw-yPS7mXEDXQsdKhrD8jAyhobOELECzpYyQqt5dXFtgO9rNq_6lxcXCs_5yGE_maLTs",
    badge: "Afrika K.",
    maxQty: 10,
    popular: true,
  },
  {
    id: "buyukbas-turkiye",
    title: "Büyükbaş Hisse",
    region: "yurt-ici",
    regionLabel: "Yurt İçi",
    regionEmoji: "\u{1F1F7}\u{1F1F9}",
    price: 11500,
    description:
      "Türkiye genelindeki ihtiyaç sahibi ailelere, yetimhanelere ve medreselere ulaştırılacaktır.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBpT8i68f94S0DQZ3XaW1_kriZUqUh4JBvnOx4jc8UCJxGJKvAktZJweVjxti42BNdmmMn0gi-YiFxfm0d8d2zdciv54lBS_cYmumZ3r8BbJIdj4Is8AfZ5vb6dtA6rSd1S4ab0j7msBu_5wQAwHelpHy0w2gC3bpBS7JJ8zg1NZgn0_k_u8UgTKsvH9D2hdnC2WQMqK6gp4SaZTMBScSU2K6Hp3QLWn8tCineXfdYxReAYLL8ORSG5GGNWkhQiCxAigNqZrDqfJM2q",
    badge: "Türkiye",
    maxQty: 7,
    popular: false,
  },
];

const regions = [
  { key: "tumu", label: "Tümü" },
  { key: "yurt-ici", label: "Yurt İçi" },
  { key: "afrika", label: "Afrika" },
  { key: "suriye", label: "Suriye" },
  { key: "yemen", label: "Yemen" },
];

export default function KurbanPage() {
  const [countdown, setCountdown] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [activeRegion, setActiveRegion] = useState("tumu");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const distance = TARGET_DATE - now;
      if (distance > 0) {
        setCountdown({
          days: String(
            Math.floor(distance / (1000 * 60 * 60 * 24))
          ).padStart(2, "0"),
          hours: String(
            Math.floor(
              (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            )
          ).padStart(2, "0"),
          minutes: String(
            Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
          ).padStart(2, "0"),
        });
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const getQty = (id: string) => quantities[id] ?? 1;

  const setQty = (id: string, qty: number) =>
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.min(qty, packages.find((p) => p.id === id)?.maxQty ?? 99)),
    }));

  const filteredPackages =
    activeRegion === "tumu"
      ? packages
      : packages.filter((p) => p.region === activeRegion);

  const handleAddToCart = (id: string) => {
    const qty = getQty(id);
    setCartCount((prev) => prev + qty);
    setQty(id, 1);
  };

  return (
    <>
      <div className="bg-secondary-container text-on-secondary-container py-sm px-margin-mobile md:px-margin-desktop shadow-sm z-50 relative">
        <div className="max-w-container-max mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <span className="font-headline-md text-headline-xl-mobile md:text-headline-md font-semibold">
            Kurban Bayramı&apos;na Son
          </span>
          <div className="flex gap-2 font-headline-xl text-headline-xl-mobile md:text-headline-xl font-bold">
            <div className="flex flex-col items-center">
              <span className="bg-surface/50 rounded px-2 py-1">
                {countdown.days}
              </span>
              <span className="text-xs font-label-sm mt-1 uppercase">Gün</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-surface/50 rounded px-2 py-1">
                {countdown.hours}
              </span>
              <span className="text-xs font-label-sm mt-1 uppercase">Saat</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-surface/50 rounded px-2 py-1">
                {countdown.minutes}
              </span>
              <span className="text-xs font-label-sm mt-1 uppercase">
                Dakika
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="relative w-full h-[819px] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            alt="Hero Background"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0JoVqg0L9aWeOAn4wWfnUGdAageJj50GpxWf6Kg718CMJMN0V_c7Clds2Hu7Z5VE2c54rVDV_yUbCCRO-TVjWj5WidELEuSE5bnpVGVZdA7jHYVFdNlLIPyQ2naxFSoJ3tLg9b9WOJV6SBzdHM_8PY4dTilcHkMs71cyVaBal6Fp6KdqsgBDkspMCzPEcWw2fu8CUXtyqS24HtEBLbSQ8bjWxni0-kINVW9R9ZsP7WKOuMFMAExsaxrAuRgYiw-YnqROlta9oH0LG"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/60 to-transparent mix-blend-multiply" />
          <div className="absolute inset-0 bg-on-background/20" />
        </div>
        <div className="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-white">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-secondary-container/90 text-on-secondary-container px-4 py-1.5 rounded-full font-label-sm text-label-sm font-bold tracking-wide uppercase backdrop-blur-sm">
              <span className="material-symbols-outlined text-sm filled">
                volunteer_activism
              </span>
              2024 Kurban Organizasyonu
            </div>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg font-bold leading-tight drop-shadow-md">
              İyilik Sınır Tanımaz
            </h1>
            <p className="font-body-lg text-body-lg text-surface-container-low max-w-xl drop-shadow">
              Bu Kurban Bayramı&apos;nda emanetlerinizi ihtiyaç sahiplerine
              güvenle ulaştırıyoruz. Mizan Derneği güvencesiyle vekaletlerinizi
              verin, sevinciniz sınırları aşsın.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <a
                className="bg-secondary text-on-secondary px-8 py-3 rounded-lg font-label-md text-label-md font-bold hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all shadow-md flex items-center gap-2"
                href="#donate"
              >
                Hemen Kurban Al
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </a>
              <a
                className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-3 rounded-lg font-label-md text-label-md font-medium hover:bg-white/20 transition-all"
                href="#how-it-works"
              >
                Süreç Nasıl İşliyor?
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="h-xl" />

      <section
        className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop scroll-mt-24"
        id="donate"
      >
        <div className="text-center mb-12">
          <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl font-bold text-on-surface mb-4">
            Kurban Bağış Paketleri
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
            Dünyanın farklı bölgelerindeki kardeşlerimiz için kurban bağışınızı
            seçin. Her hisse, bir tebessüm demek.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {regions.map((region) => (
            <button
              key={region.key}
              onClick={() => setActiveRegion(region.key)}
              className={`px-6 py-2 rounded-full font-label-md text-label-md font-semibold shadow-sm transition-all ${
                activeRegion === region.key
                  ? "bg-primary text-on-primary"
                  : "bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              {region.label}
            </button>
          ))}
        </div>

        {filteredPackages.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">
              search
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Bu bölge için henüz paket bulunmamaktadır.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(27,107,90,0.08)] transition-all duration-300 overflow-hidden flex flex-col border ${
                  pkg.popular
                    ? "border-secondary relative"
                    : "border-surface-container-highest"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute top-0 right-0 bg-secondary text-on-secondary px-3 py-1 rounded-bl-lg font-label-sm text-label-sm font-bold z-10 shadow-sm">
                    En Çok Tercih Edilen
                  </div>
                )}
                <div className="h-48 bg-surface-variant relative">
                  <Image
                    alt={pkg.title}
                    src={pkg.image}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-on-surface flex items-center gap-1 shadow-sm">
                    <span className="text-base">{pkg.regionEmoji}</span>{" "}
                    {pkg.regionLabel}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                      {pkg.title}
                    </h3>
                    <span className="font-label-sm text-label-sm bg-primary/10 text-primary px-2 py-1 rounded">
                      {pkg.badge}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-6 flex-grow">
                    {pkg.description}
                  </p>
                  <div className="mb-6 pb-6 border-b border-surface-container-highest">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {pkg.price.toLocaleString("tr-TR")} ₺
                    </div>
                    <div className="text-xs text-outline font-medium">
                      {pkg.id === "kucukbas-afrika"
                        ? "1 Adet Bedeli"
                        : "1 Hisse Bedeli"}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden h-10 w-32">
                      <button
                        aria-label="Decrease"
                        onClick={() => setQty(pkg.id, getQty(pkg.id) - 1)}
                        className="w-10 h-full flex items-center justify-center bg-surface hover:bg-surface-variant text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          remove
                        </span>
                      </button>
                      <input
                        aria-label="Quantity"
                        className="w-full h-full border-0 text-center font-bold text-on-surface focus:ring-0 p-0"
                        type="number"
                        min={1}
                        max={pkg.maxQty}
                        value={getQty(pkg.id)}
                        onChange={(e) =>
                          setQty(pkg.id, Number(e.target.value))
                        }
                      />
                      <button
                        aria-label="Increase"
                        onClick={() => setQty(pkg.id, getQty(pkg.id) + 1)}
                        className="w-10 h-full flex items-center justify-center bg-surface hover:bg-surface-variant text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">
                          add
                        </span>
                      </button>
                    </div>
                    <span className="text-sm font-medium text-on-surface-variant">
                      Adet
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddToCart(pkg.id)}
                    className={`w-full py-3 rounded-lg font-label-md text-label-md font-semibold transition-colors flex items-center justify-center gap-2 ${
                      pkg.popular
                        ? "bg-secondary text-on-secondary hover:bg-secondary-fixed hover:text-on-secondary-fixed"
                        : "bg-primary text-on-primary hover:bg-on-primary-fixed-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      shopping_cart
                    </span>
                    Sepete Ekle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <a
            className="inline-flex items-center gap-2 text-primary font-label-md font-semibold hover:underline"
            href="#"
          >
            Tüm Paketleri Gör
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </a>
        </div>
      </section>

      <div className="h-lg" />

      <section
        className="bg-surface-container-low py-xl border-y border-surface-container-highest"
        id="how-it-works"
      >
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center mb-16">
            <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl font-bold text-on-surface mb-4">
              Süreç Nasıl İşliyor?
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
              Bağışınızın ilk anından, emanetinizin ihtiyaç sahibine ulaştığı
              ana kadar her aşamada şeffaflık ilkemizdir.
            </p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-12 right-12 h-0.5 bg-outline-variant/30 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
              <div className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center shadow-sm border-2 border-primary text-primary mb-6 transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-3xl">
                    touch_app
                  </span>
                </div>
                <h4 className="text-lg font-bold text-on-surface mb-2">
                  1. Seçim Yapın
                </h4>
                <p className="text-sm text-on-surface-variant">
                  Bağış yapmak istediğiniz bölgeyi ve kurban türünü seçerek
                  sepetinize ekleyin.
                </p>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center shadow-sm border-2 border-outline-variant text-on-surface-variant mb-6 transition-transform group-hover:scale-110 group-hover:border-primary group-hover:text-primary">
                  <span className="material-symbols-outlined text-3xl">
                    payments
                  </span>
                </div>
                <h4 className="text-lg font-bold text-on-surface mb-2">
                  2. Güvenli Ödeme
                </h4>
                <p className="text-sm text-on-surface-variant">
                  3D Secure güvencesiyle ödemenizi tamamlayın.
                </p>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center shadow-sm border-2 border-outline-variant text-on-surface-variant mb-6 transition-transform group-hover:scale-110 group-hover:border-primary group-hover:text-primary">
                  <span className="material-symbols-outlined text-3xl">
                    cut
                  </span>
                </div>
                <h4 className="text-lg font-bold text-on-surface mb-2">
                  3. İslami Kesim
                </h4>
                <p className="text-sm text-on-surface-variant">
                  Kurbanlarınız bayramın 1. ve 2. günü İslami usullere uygun
                  olarak kesilir.
                </p>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center shadow-sm border-2 border-outline-variant text-on-surface-variant mb-6 transition-transform group-hover:scale-110 group-hover:border-primary group-hover:text-primary">
                  <span className="material-symbols-outlined text-3xl">
                    volunteer_activism
                  </span>
                </div>
                <h4 className="text-lg font-bold text-on-surface mb-2">
                  4. Dağıtım
                </h4>
                <p className="text-sm text-on-surface-variant">
                  Kesilen etler, önceden tespit edilen gerçek ihtiyaç
                  sahiplerine dağıtılır.
                </p>
              </div>
              <div className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center shadow-sm border-2 border-secondary text-secondary mb-6 transition-transform group-hover:scale-110 group-hover:bg-secondary group-hover:text-on-secondary">
                  <span className="material-symbols-outlined text-3xl">
                    video_camera_front
                  </span>
                </div>
                <h4 className="text-lg font-bold text-on-surface mb-2">
                  5. Video &amp; Bilgi
                </h4>
                <p className="text-sm text-on-surface-variant">
                  Kesim videolarınız ve bilgilendirme mesajınız telefonunuza
                  gönderilir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
