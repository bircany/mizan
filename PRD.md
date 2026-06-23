# Mizan Derneği Web Sitesi — PRD

## Proje Özeti
Elbistan merkezli Mizan İnsani Yardım Derneği için kurumsal web sitesi. 
Kullanıcılar kampanyaları görüntüleyebilir, bağış yapabilir (iyzico 3D Secure), 
haberleri takip edebilir ve dernek hakkında bilgi alabilir.

## Hedef Kitle
- Bireysel bağışçılar (Türkiye ağırlıklı)
- Kurumsal ortaklar
- Gönüllüler
- Medrese öğrenci ve velileri

## Teknoloji Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **CMS:** Payload CMS v3 (headless)
- **Database:** PostgreSQL (Supabase)
- **Auth:** NextAuth.js (admin panel)
- **Ödeme:** iyzico (3D Secure)
- **E-posta:** Resend (bağış makbuzları)
- **Deploy:** Vercel
- **i18n:** next-intl (TR/EN/AR)

## Sayfalar
| # | Route | Açıklama | Tasarım |
|---|-------|----------|---------|
| 1 | `/` | Anasayfa — hero slider, hızlı bağış tabları, kampanya kartları, etki istatistikleri, haberler, hikayeler, mobil app CTA | ✅ |
| 2 | `/bagis` | Bağış listeleme — kategori filtreleri, kampanya kartları, sepet sidebar | ✅ |
| 3 | `/bagis/[slug]` | Kampanya detay sayfası | ✅ |
| 4 | `/odeme` | Ödeme/checkout — bağışçı formu, kart girişi, banka havalesi, dijital cüzdan | ✅ |
| 5 | `/haberler` | Haberler — featured haber, grid, filtreler, sidebar (son haberler, kategoriler, IG feed) | ✅ |
| 6 | `/haberler/[slug]` | Haber detay | ✅ |
| 7 | `/hakkimizda` | Hakkımızda — hero, misyon, timeline | ✅ |
| 8 | `/kurban` | Kurban kampanyası — countdown, bölge seçimi, paket kartları, nasıl işler | ✅ |
| 9 | `/iletisim` | İletişim sayfası | ✅ |
| 10 | `/admin` | Payload CMS admin panel | Auto-generated |

## Veritabanı Şeması

**donations:** id, donor_name, email, phone, campaign_id, amount, currency, status, receipt_number, created_at
**campaigns:** id, title_tr, title_en, description_tr, description_en, target_amount, collected_amount, image_url, category, is_active, slug
**news:** id, title_tr, title_en, content_tr, content_en, image, category, published_at, slug, author
**categories:** id, name_tr, name_en, icon, color, slug
**pages:** id, title, content, slug, published

## Temel Özellikler
- [x] Sepet sistemi (localStorage, çoklu kampanya)
- [x] iyzico 3D Secure entegrasyonu
- [x] PDF bağış makbuzu (otomatik)
- [x] E-posta onayı (Resend)
- [x] Bağış ilerleme takibi (canlı)
- [x] Çoklu para birimi (TRY/USD/EUR)
- [x] TR/EN/AR dil desteği (next-intl)
- [x] SEO (sitemap, robots, OpenGraph)
- [x] Instagram feed widget
- [x] Admin dashboard (Payload CMS)
- [x] Responsive tasarım (mobile-first)
- [x] Karanlık mod desteği

## Tasarım Sistemi
- **Primary:** `#005243` / Primary Container: `#1B6B5A`
- **Secondary:** `#755B00` / Accent Gold: `#C9A84C`
- **Background:** `#FAFAF8` / Surface: `#FFFFFF`
- **Font:** Inter (display-lg 48px → label-sm 12px)
- **Grid:** 12-column desktop, 4-column mobile
- **Spacing:** 8px baseline (xs:4, sm:12, md:24, lg:48, xl:80)
- **Container max:** 1200px
- **Border radius:** sm:4px, DEFAULT:8px, lg:16px, xl:24px
- **Shadows:** soft (0,4,20,rgba(0,0,0,0.04)), ambient (0,8,30,rgba(27,107,90,0.08))
