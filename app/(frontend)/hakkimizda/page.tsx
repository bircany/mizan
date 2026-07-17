import Image from "next/image";

export default function HakkimizdaPage() {
  return (
    <>
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1920&q=80"
            alt="Cami silueti"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/50" />
        </div>
        <div className="relative z-10 text-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto text-white">
          <h1 className="font-display-lg-mobile md:font-display-lg mb-sm">
            Mizan: Adalet ve Denge
          </h1>
          <p className="font-body-lg text-surface-container-high mb-lg max-w-2xl mx-auto">
            Toplumsal dayanışma ve yardımlaşma ruhunu, adalet ve denge terazisinde insanlığa ulaştırıyoruz.
          </p>
          <div className="font-serif text-5xl md:text-7xl text-secondary-fixed opacity-90 mt-md">
            الميزان
          </div>
        </div>
      </section>

      <section className="bg-primary-container text-on-primary-container py-xl px-margin-mobile md:px-margin-desktop text-center">
        <div className="max-w-3xl mx-auto">
          <span className="material-symbols-outlined text-secondary-fixed mb-sm text-4xl block">
            balance
          </span>
          <blockquote className="font-headline-md text-headline-md font-medium italic mb-md">
            &ldquo;Göğü O yükseltti, dengeyi (mizanı) O koydu. Sakın dengeyi bozmayın.&rdquo;
          </blockquote>
          <cite className="font-label-md text-label-md text-primary-fixed-dim block uppercase tracking-widest">
            (Rahmân Suresi, 7-8)
          </cite>
          <p className="font-body-lg mt-lg text-on-primary-container/80">
            Misyonumuz, yeryüzündeki iyilik mizanını korumak; kriz bölgelerinden eğitime, acil yardımdan sürdürülebilir kalkınmaya kadar her alanda adaleti ve dengeyi tesis etmektir.
          </p>
        </div>
      </section>

      <section className="py-xl px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="text-center mb-xl">
          <h2 className="font-headline-xl text-headline-xl text-primary mb-sm">
            Hikayemiz
          </h2>
          <div className="w-16 h-1 bg-secondary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl items-center mb-xl">
          <div className="order-2 md:order-1">
            <Image
              src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80"
              alt="Deprem yardım çalışmaları"
              width={800}
              height={500}
              className="rounded-xl shadow-md w-full h-[400px] object-cover"
            />
          </div>
          <div className="order-1 md:order-2">
            <div className="flex items-center gap-sm mb-sm text-secondary">
              <span className="material-symbols-outlined">history</span>
              <span className="font-label-md text-label-md font-bold">
                2023
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md">
              Kuruluş ve İlk Adımlar
            </h3>
            <p className="font-body-md text-on-surface-variant mb-md">
              Mizan Derneği, büyük yıkımların yaşandığı bir dönemde, yaraları sarmak ve toplumsal dayanışmayı yeniden inşa etmek amacıyla kuruldu. İlk büyük sınavımızı deprem bölgelerinde acil yardım ve kurtarma çalışmalarıyla verdik.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl items-center">
          <div>
            <div className="flex items-center gap-sm mb-sm text-secondary">
              <span className="material-symbols-outlined">public</span>
              <span className="font-label-md text-label-md font-bold">
                Günümüz
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md">
              Küresel İyilik Ağı
            </h3>
            <p className="font-body-md text-on-surface-variant mb-md">
              Bugün, sadece kriz anlarında değil, Afrika&apos;da su kuyuları açarak, kurban organizasyonları düzenleyerek ve medrese projeleriyle eğitime destek vererek iyilik ağımızı küresel çapta genişletiyoruz.
            </p>
          </div>
          <div>
            <Image
              src="https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&q=80"
              alt="Su kuyusu projesi"
              width={800}
              height={500}
              className="rounded-xl shadow-md w-full h-[400px] object-cover"
            />
          </div>
        </div>
      </section>
    </>
  );
}
