"use client"

import { useState } from "react"
import Image from "next/image"

const categories = ["Tümü", "Afet Yardımı", "Kurban", "Afrika", "Duyuru"]

const recentPosts = [
  {
    title: "Erzak Dağıtımları Kapsamında Yeni Bölgelere Ulaştık",
    date: "15 Mayıs 2024",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA037tcTRdmCAd-5RKNTIqPGl0oBfmmScPCPBD3FxPwmYt-n5nG9G94qvmIsGQezL8ojoql-8aGnf6l8RfKQFyhqVZfD4K85-cGF0AbKCJs6Sbfy1ci9cSVc8mieqUy-5RcabxSLtS3Do78rSHTv47jujsqCL5SrlwFvwVH80b536nkJXFM5aViLYWNB4vEz-tQHIXdnooat2dD7Jz7qggDsRNHdhR6xry6F_rGiJ5LlYuBZkj_1A99M7-hZTE8SN05rGruNykOrocc",
  },
  {
    title: "Su Kuyusu Bağışlarınız İçin Teşekkür Ederiz",
    date: "12 Mayıs 2024",
    icon: "water_drop",
  },
  {
    title: "Yetim Sponsorluk Sistemi Yenilendi",
    date: "08 Mayıs 2024",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBj8q8EkFFWUEwWzVBH61cwkIMctnLSpRpzvZJQvhp5Uk7ecUcHFw9sVRes9uzzzMe32ajczIufMWkIbkgkzw6hI6DfvkjHaQXNmEiIO3aFGhBdiPAvX1H19q2hj-O5Z0YfwYrbsTYCQ6eKz2GPWyZr17xoBr4bJ9mRbj4R994dTBvkTd1N5oH5LsR1DtacuvyoA2vjF3D8ftxHIndDOVVBHq6nJfbj7C8jvKGSu4zqj-gFpilB8MmcRCmMugszijTCewOEnJhVX_Uj",
  },
]

const categoriesWithCount = [
  { name: "Afet Yardımı", count: 24 },
  { name: "Afrika Projeleri", count: 56 },
  { name: "Kurban", count: 18 },
  { name: "Mescid / Medrese", count: 12 },
  { name: "Etkinlikler & Duyurular", count: 45 },
]

const instagramImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDd0CqeMdI-zXKG-wTVPTnPeOlnZlHVgsHMmN-mE7BIAlBK671JN5Haf9exKTCD-Ykao1k2Kx9IqPMutmKWygUO8e9rPcVTDgOEwjPa4nj3bSeHi6baVLAhq1Vxd1eToBihlO_JzUHVH_kJKzVFQ0LD3qvPbLfp7cAYYvoy9io-Ddm68Sdn-QniC-QoSd9M8WanyLQxI5iHv9XCWQE4YkQ-ksePhbqQ6SnR12oLO3iglxkNmgpjt7AlOxYlBfVsfoJ3ZlR5woJS_WRB",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAACocoz3I9QfitUWtZqmUH2hWUgOggmF8W4a--FHZsXLtXPK1O3NUcv-U6_mhms1vQi_58WE2ehLnvJasSzhKahc3C3qzhdw0cYrKqIkAwFkDkBGE-r3ImvIVSQZkm_Io8nd1rFx0DMUc7CLKxcm6tpwfdWyBlxajfF-RwElQj1jWV4MEZ7sGSbdEu5nFAuvwaqvTXeoPonRT9Zs4lBFw486yCuP1A0ArP2bJR7p2tjdMMWT_Ix8nw8-oTIqM7wnwDUcsiRh98xL7N",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA1K74JQJB3IyYZisopesRmQHDRKNck-33zXZYe3Hvj5K-GjX73Nvf3RKXE7k6gSeg97KYeHMeR2uYgY5aoYzey_T3rJIVKUKqnrnAUZ7FSiwErtHgbOjjRzhKiABwuqcnFmxKa7Eys-mmTIv7u2F1BHu5pu5r69xb2e0Z3kbHVj7tZDicnjMp-ELZCMSMV4QsOLFfBCUNKkHWmLkvjzp0QJLJ-3MYpAHaPKVpHd5TxF3kkMYqx0e_wG-TmFQVXA55S9y9qt5fR3thO",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAtndC7rRxAJllVlHOwVle4iwlTyyQKvKwhz7WQZtLE8GyDMLkrCn1tp-xXUWQlkoJShKrOl04XkldDFzfNGLMLNbS8Qxkg--zvX7ESeRXvcCIRdq65nMw353DaiTGeH0fzy-z3BBQM8j56RapNeIfjuOQP7RB-WcAPmHERS7zf8twhJKTLwMQKYf6i93afOtlSl8qOw447ZFlhAMDq4bIKv6BpM0kB0M1TzunQoCCY3JKsJ6Z2SANqaXaAO53Z_sY2YYK0bCZ1K_jA",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDc10qNrDMVVcrfBpClUgplExFl36tcOSDHVoLczwWcwMBYSDY9zxr8kdOB8CdvBEjsebMFYoN0SRD16r54tKUzcOOwekr9u1wmR8P1_P6kXAY0swiEBPSnmyNioscNQLd7Le0piIgoRJK-qvKYA0bT9DfHJYllDzyApPMqoXOOXPV5drqfGDOG2LtKX6bB9yDnXZslwH8zZGReU1Yr_Fqg0AqB0KwokXBQOK4zy41FJeI4ZQfM38ubpFqvcQsNmCVr1key5wdpkJwU",
]

const totalPages = 12

export default function HaberlerPage() {
  const [activeCategory, setActiveCategory] = useState("Tümü")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <>
      <section className="relative h-[200px] bg-gradient-to-r from-primary to-primary-container flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <div className="relative z-10 text-center px-margin-mobile">
          <h1 className="text-display-lg-mobile md:text-display-lg text-white mb-2">
            Haberler & Etkinlikler
          </h1>
          <div className="w-16 h-1 bg-gold mx-auto rounded-full" />
        </div>
      </section>

      <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-lg grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <div className="lg:col-span-8 space-y-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low p-4 rounded-xl shadow-soft">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-label-sm shadow-sm transition-all ${
                    activeCategory === cat
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface text-on-surface-variant border border-outline-variant hover:border-primary hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Haberlerde ara..."
                className="w-full pl-10 pr-4 py-2 rounded-full border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow text-body-md"
              />
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-sm">
                search
              </span>
            </div>
          </div>

          <article className="bg-surface rounded-xl overflow-hidden shadow-soft flex flex-col md:flex-row group cursor-pointer transition-shadow hover:shadow-ambient">
            <div className="md:w-1/2 relative overflow-hidden h-64 md:h-auto">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVJVkUWx8VQk_xoUARGbGhjVP7xB3iY0rpvWPTzb17PI5JeFriU37Nm9rvx8m1n-9w_nTz7fOxEGR7LjJtc4dO57FUiymDTARhXH6CvMx3YxuDd0yFYJ5Sf5bDoZb5WgZCdoyLYbnOS3Ay1p8Z9PChSl-_TZmiHoEmzJF4ri0gN1UxSjx6qB5-gJt4V9vwmW_kJKFFHlUxaw3TXUjQe9rUsV8bRHr3yT2Xor-pYWrGn-pho7JiC9JOMejNRo0l013t4JO9z5_wopQ4"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-label-sm shadow-md">
                Projeler
              </div>
            </div>
            <div className="md:w-1/2 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-outline mb-3 text-label-sm">
                  <span className="material-symbols-outlined text-[16px]">
                    calendar_month
                  </span>
                  <span>15 Mayıs 2024</span>
                </div>
                <h2 className="text-headline-xl text-on-surface mb-3 group-hover:text-primary transition-colors">
                  Tanzanya&apos;da 50 Yeni Su Kuyusu Açılışı Gerçekleştirdik
                </h2>
                <p className="text-body-md text-on-surface-variant line-clamp-3 mb-6">
                  Kuraklıkla mücadele eden Afrika bölgelerinde sürdürdüğümüz
                  &quot;Bir Damla Umut&quot; projesi kapsamında Tanzanya&apos;nın
                  kırsal kesimlerinde bağışçılarımızın destekleriyle 50 yeni su
                  kuyusunu daha bölge halkının hizmetine sunduk.
                </p>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-primary text-label-md font-semibold hover:text-primary-container transition-colors"
                >
                  Devamını Oku{" "}
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </a>
                <button
                  aria-label="Paylaş"
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    share
                  </span>
                </button>
              </div>
            </div>
          </article>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {[
              {
                category: "Afet Yardımı",
                categoryBg: "bg-secondary text-white",
                date: "10 Mayıs 2024",
                title:
                  "Deprem Bölgesine Acil Gıda ve Çadır Sevkiyatı Sürüyor",
                excerpt:
                  "Bölgedeki ekiplerimiz koordinesinde kurulan çadır kentlerde sıcak yemek dağıtımı ve temel ihtiyaç malzemeleri temini aralıksız devam ediyor.",
                image:
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuAOGzrVfXOW5xT5DwmakWnAm7m9Fb-Q69AEIT7Oq51Fe3D4g1RlAig7jfj5QENaoEmbGMkwtCwPpX5-kXY766NsqZmDJsoBwDIxGujlaWqqlp7jOXchjL3vqAjF5KDRRFK_sPgVcseCXo7VupXnnwVkb77IqptrZUuvWNkLipWZS2_iQJrlkY3NFLunCfJsVqSwoeH7CrozsTEm3UNT0dnzCegBXL0wDMbSW-yRwgW2UR-j5J5HNIOGrad_jZaSsLWhfrHDVkxnH8zW",
              },
              {
                category: "Etkinlik",
                categoryBg: "bg-tertiary-container text-white",
                date: "05 Mayıs 2024",
                title:
                  "&quot;Geleceğe Miras&quot; Gençlik Buluşması Düzenlendi",
                excerpt:
                  "Yüzlerce gencin katılımıyla gerçekleşen sempozyumda sivil toplum bilinci, gönüllülük ve uluslararası yardım organizasyonlarının önemi konuşuldu.",
                image:
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuCkvS7eRqH2SahYjvvMpANfNrcDvWQWGdjBtfiN3LT9OSg9pdDBp6M9cwKtKJTLYRNmkB16ZJlt2Ecu_0F4LPH_QgD34Tug_CPMrs0y-Mr5A14lhW1sLwNXDlkwVv3oa4LxuWcAxn6f0MjMqO2aZ2k-quTzBYHtfWTLLRGzOJ9DUydfBqWK-yTYagcdHTWyFw38ij4EhgE8I5ZWfVhlgTM84dqKJMt6AVysKRWCqi8GJi27VGlKx3dCgF990WWm8EpFe4fGOVO-tp8Z",
              },
              {
                category: "Duyuru",
                categoryBg: "bg-primary text-white",
                date: "28 Nisan 2024",
                title: "Ramazan Kampanyası Raporumuz Yayınlandı",
                excerpt:
                  "Bağışçılarımızın destekleriyle 25 farklı ülkede gerçekleştirdiğimiz iftar ve kumanya dağıtımlarının detaylı faaliyet raporuna ulaşabilirsiniz.",
                image:
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuA8uizivtpax4te4k0-GpSZc1_FKNKOhrrJJBrVABPCeIqo_J_KFsQfQ6IEByLHXLlziaGoOH8BmcLdOyITXJuu_mJEorhfwDz41B_Hw5D6-t0JXlwvcOxzfmhwtTm7Ub7hk6Z1HPNSC8UdHbQsuU7fA0nV2d6jPhCdOrLDC23kzzPDsRcGgbRyRRnDo5JAJHbYcUjntbbf9Ci6EcjSeuA_X8JzkATi2A_BZa2lqsDNTkJLxCetY51ixGi90kBfJBD5fYrOXu6fbFwO",
              },
              {
                category: "Mescid / Medrese",
                categoryBg: "bg-surface text-on-surface border border-outline-variant",
                date: "20 Nisan 2024",
                title:
                  "Mali&apos;de Yeni Bir İlim Yuvası: Şehitler Medresesi İnşaatı Başladı",
                excerpt:
                  "Bölgedeki çocukların temel dini ve fenni eğitimlerini alabilmeleri amacıyla planlanan 250 öğrenci kapasiteli medresemizin temelleri dualarla atıldı.",
                icon: "mosque",
              },
            ].map((item, i) => (
              <article
                key={i}
                className="bg-surface rounded-xl overflow-hidden shadow-soft flex flex-col group cursor-pointer transition-shadow hover:shadow-ambient"
              >
                <div className="relative h-48 overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline-variant text-6xl">
                        {item.icon}
                      </span>
                    </div>
                  )}
                  <div
                    className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-label-sm shadow-md ${item.categoryBg}`}
                  >
                    {item.category}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 text-outline mb-2 text-label-sm">
                    <span className="material-symbols-outlined text-[14px]">
                      calendar_month
                    </span>
                    <span>{item.date}</span>
                  </div>
                  <h3
                    className="text-headline-md text-on-surface mb-2 group-hover:text-primary transition-colors line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: item.title }}
                  />
                  <p className="text-body-md text-on-surface-variant line-clamp-3 mb-4 flex-grow">
                    {item.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-surface-variant">
                    <a
                      href="#"
                      className="text-primary text-label-sm font-semibold group-hover:underline"
                    >
                      Devamını Oku
                    </a>
                    <button
                      aria-label="Paylaş"
                      className="text-outline hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        share
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex justify-center items-center gap-2 pt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {[1, 2, 3, null, 12].map((page, idx) =>
              page === null ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="text-on-surface-variant px-2"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-full text-label-md flex items-center justify-center transition-colors ${
                    currentPage === page
                      ? "bg-primary text-white shadow-sm"
                      : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-surface rounded-xl p-6 shadow-soft">
            <h3 className="text-headline-md text-on-surface mb-4 flex items-center gap-2 border-b border-surface-variant pb-2">
              <span className="material-symbols-outlined text-primary">
                history
              </span>
              Son Haberler
            </h3>
            <ul className="space-y-4">
              {recentPosts.map((post, i) => (
                <li key={i} className="group">
                  <a href="#" className="flex gap-3 items-start">
                    <div className="relative w-16 h-16 rounded bg-surface-container overflow-hidden flex-shrink-0">
                      {post.image ? (
                        <Image
                          src={post.image}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-container text-on-primary-fixed">
                          <span className="material-symbols-outlined">
                            {post.icon}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-label-md text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h4>
                      <span className="text-[11px] text-outline mt-1 block">
                        {post.date}
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface rounded-xl p-6 shadow-soft">
            <h3 className="text-headline-md text-on-surface mb-4 flex items-center gap-2 border-b border-surface-variant pb-2">
              <span className="material-symbols-outlined text-primary">
                category
              </span>
              Kategoriler
            </h3>
            <ul className="space-y-2 text-body-md">
              {categoriesWithCount.map((cat) => (
                <li key={cat.name}>
                  <a
                    href="#"
                    className="flex justify-between items-center text-on-surface-variant hover:text-primary transition-colors py-1 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      {cat.name}
                    </span>
                    <span className="bg-surface-container-highest px-2 py-0.5 rounded-full text-xs font-medium">
                      {cat.count}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-primary-container text-on-primary-fixed rounded-xl p-6 shadow-soft relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10">
              <span className="material-symbols-outlined text-[120px]">
                mail
              </span>
            </div>
            <h3 className="text-headline-md mb-2 relative z-10">
              Bültene Abone Olun
            </h3>
            <p className="text-body-md text-primary-fixed mb-4 relative z-10">
              Faaliyetlerimizden ve acil yardım çağrılarından ilk siz haberdar
              olun.
            </p>
            <form className="relative z-10 flex flex-col gap-3">
              <input
                type="email"
                placeholder="E-posta adresiniz"
                className="w-full px-4 py-2 rounded-lg bg-surface text-on-surface border-none focus:ring-2 focus:ring-secondary text-body-md"
              />
              <button
                type="submit"
                className="w-full bg-secondary text-white py-2 rounded-lg text-label-md font-semibold hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-colors"
              >
                Kayıt Ol
              </button>
            </form>
          </div>

          <div className="bg-surface rounded-xl p-6 shadow-soft">
            <h3 className="text-headline-md text-on-surface mb-4 flex items-center justify-between border-b border-surface-variant pb-2">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  photo_camera
                </span>
                Instagram
              </span>
              <a
                href="#"
                className="text-xs text-primary hover:underline"
              >
                @mizandernegi
              </a>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                ...instagramImages.slice(0, 2),
                null,
                ...instagramImages.slice(2),
              ].map((item, i) =>
                item === null ? (
                  <div
                    key={i}
                    className="aspect-square bg-surface-container rounded overflow-hidden flex items-center justify-center bg-primary-container text-white cursor-pointer hover:bg-primary transition-colors"
                  >
                    <span className="material-symbols-outlined">
                      play_circle
                    </span>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="relative aspect-square bg-surface-container rounded overflow-hidden"
                  >
                    <Image
                      src={item}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 33vw, 20vw"
                      className="object-cover hover:scale-110 transition-transform cursor-pointer"
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
