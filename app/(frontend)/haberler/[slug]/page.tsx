import Link from "next/link";
import Image from "next/image";

const newsArticle = {
  slug: "tanzanya-50-su-kuyusu",
  title: "Tanzanya'da 50 Yeni Su Kuyusu Açılışı Gerçekleştirdik",
  date: "15 Mayıs 2024",
  category: "Projeler",
  image:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCVJVkUWx8VQk_xoUARGbGhjVP7xB3iY0rpvWPTzb17PI5JeFriU37Nm9rvx8m1n-9w_nTz7fOxEGR7LjJtc4dO57FUiymDTARhXH6CvMx3YxuDd0yFYJ5Sf5bDoZb5WgZCdoyLYbnOS3Ay1p8Z9PChSl-_TZmiHoEmzJF4ri0gN1UxSjx6qB5-gJt4V9vwmW_kJKFFHlUxaw3TXUjQe9rUsV8bRHr3yT2Xor-pYWrGn-pho7JiC9JOMejNRo0l013t4JO9z5_wopQ4",
  content: `
    <p>Kuraklıkla mücadele eden Afrika bölgelerinde sürdürdüğümüz "Bir Damla Umut" projesi kapsamında Tanzanya'nın kırsal kesimlerinde bağışçılarımızın destekleriyle 50 yeni su kuyusunu daha bölge halkının hizmetine sunduk.</p>
    <p>Proje kapsamında açılan kuyular, her biri günde ortalama 5.000 litre temiz su sağlayarak yaklaşık 25.000 kişinin temiz içme suyuna erişimini mümkün kılmaktadır. Bölge halkı daha önce kilometrelerce yürüyerek ulaştıkları su kaynaklarına artık köylerinin hemen yanı başında ulaşabilmektedir.</p>
    <p>Mizan Derneği olarak su kuyusu projelerimizde öncelikli hedefimiz, sürdürülebilir su kaynakları oluşturmak ve bölge halkının kendi su ihtiyacını karşılayabileceği altyapıyı kurmaktır. Bu amaçla açtığımız kuyuların bakım ve onarımı için yerel ekipler eğitilmekte ve yedek parça temini sağlanmaktadır.</p>
    <p>Tanzanya'nın Dodoma, Morogoro ve Iringa bölgelerinde açılan kuyular, özellikle kadınların ve çocukların su taşıma yükünü hafifletmiş, kız çocuklarının okula gitme oranlarında gözle görülür bir artış sağlanmıştır. Temiz suya erişim, bölgedeki su kaynaklı hastalıkların da önemli ölçüde azalmasına vesile olmuştur.</p>
    <p>Bağışçılarımıza teşekkür eder, hayırlarının kabul olmasını dileriz. Yeni projelerimizle ilgili gelişmeleri sizlerle paylaşmaya devam edeceğiz.</p>
  `,
};

const relatedNews = [
  {
    title: "Erzak Dağıtımları Kapsamında Yeni Bölgelere Ulaştık",
    date: "10 Mayıs 2024",
    slug: "erzak-dagitimlari",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAOGzrVfXOW5xT5DwmakWnAm7m9Fb-Q69AEIT7Oq51Fe3D4g1RlAig7jfj5QENaoEmbGMkwtCwPpX5-kXY766NsqZmDJsoBwDIxGujlaWqqlp7jOXchjL3vqAjF5KDRRFK_sPgVcseCXo7VupXnnwVkb77IqptrZUuvWNkLipWZS2_iQJrlkY3NFLunCfJsVqSwoeH7CrozsTEm3UNT0dnzCegBXL0wDMbSW-yRwgW2UR-j5J5HNIOGrad_jZaSsLWhfrHDVkxnH8zW",
  },
  {
    title: "Su Kuyusu Bağışlarınız İçin Teşekkür Ederiz",
    date: "12 Mayıs 2024",
    slug: "su-kuyusu-tesekkur",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA037tcTRdmCAd-5RKNTIqPGl0oBfmmScPCPBD3FxPwmYt-n5nG9G94qvmIsGQezL8ojoql-8aGnf6l8RfKQFyhqVZfD4K85-cGF0AbKCJs6Sbfy1ci9cSVc8mieqUy-5RcabxSLtS3Do78rSHTv47jujsqCL5SrlwFvwVH80b536nkJXFM5aViLYWNB4vEz-tQHIXdnooat2dD7Jz7qggDsRNHdhR6xry6F_rGiJ5LlYuBZkj_1A99M7-hZTE8SN05rGruNykOrocc",
  },
  {
    title: "Ramazan Kampanyası Raporumuz Yayınlandı",
    date: "08 Mayıs 2024",
    slug: "ramazan-kampanyasi-raporu",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA8uizivtpax4te4k0-GpSZc1_FKNKOhrrJJBrVABPCeIqo_J_KFsQfQ6IEByLHXLlziaGoOH8BmcLdOyITXJuu_mJEorhfwDz41B_Hw5D6-t0JXlwvcOxzfmhwtTm7Ub7hk6Z1HPNSC8UdHbQsuU7fA0nV2d6jPhCdOrLDC23kzzPDsRcGgbRyRRnDo5JAJHbYcUjntbbf9Ci6EcjSeuA_X8JzkATi2A_BZa2lqsDNTkJLxCetY51ixGi90kBfJBD5fYrOXu6fbFwO",
  },
];

type Props = {
  params: { slug: string };
};

export default function NewsDetailPage({ params }: Props) {
  const article = newsArticle;

  return (
    <>
      <section className="relative h-[320px] md:h-[400px] overflow-hidden">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-container-max mx-auto px-margin-desktop pb-lg">
          <span className="bg-primary text-white px-4 py-1.5 rounded-full text-label-sm font-bold inline-block mb-sm">
            {article.category}
          </span>
          <h1 className="text-display-lg-mobile md:text-display-lg text-white max-w-3xl">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 mt-md text-white/80 text-label-md">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              {article.date}
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-lg">
            <Link
              href="/haberler"
              className="inline-flex items-center gap-2 text-primary font-label-md font-bold hover:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Geri Dön
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-label-sm text-on-surface-variant">Paylaş:</span>
              <button className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all">
                <span className="material-symbols-outlined text-[18px]">share</span>
              </button>
              <button className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all">
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>
          </div>

          <article
            className="prose prose-lg max-w-none text-body-md text-on-surface-variant leading-relaxed space-y-md"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          <hr className="border-surface-container my-xl" />

          <div className="flex items-center justify-between">
            <Link
              href="/haberler"
              className="inline-flex items-center gap-2 text-primary font-label-md font-bold hover:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Geri Dön
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-label-sm text-on-surface-variant">Paylaş:</span>
              <button className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all">
                <span className="material-symbols-outlined text-[18px]">share</span>
              </button>
              <button className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all">
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low py-xl">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <h2 className="font-headline-xl text-headline-xl text-primary mb-lg">İlgili Haberler</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {relatedNews.map((item) => (
              <Link
                key={item.slug}
                href={`/haberler/${item.slug}`}
                className="bg-surface rounded-xl overflow-hidden shadow-soft hover:shadow-ambient transition-shadow group"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-md">
                  <span className="text-label-sm text-on-surface-variant flex items-center gap-1 mb-xs">
                    <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                    {item.date}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
