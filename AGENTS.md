# AGENTS.md — Subagent Stratejisi

Proje 5 ana faza bölünmüştür.

## Faz 0: Proje İskeleti (Setup)
- `next-create` ile projeyi başlat, Tailwind yapılandır
- Klasör yapısını oluştur (app/, components/, lib/)
- `.env.example`, `tsconfig`, `package.json` ayarları

## Faz 1: Tasarım Sistemi & Layout
- `tailwind.config.ts` — renkler, tipografi, spacing (DESIGN.md'den)
- `globals.css` — CSS değişkenleri, scrollbar, animasyonlar
- Bileşenler — `Header.tsx`, `Footer.tsx`
- `layout.tsx` — root layout, font yükleme, metadata

## Faz 2: Sayfa Bileşenleri (Paralel — 6 subagent)
Her subagent bir sayfayı tasarım kodundan Next.js component'ine dönüştürür:
- **Agent A:** `/` Anasayfa
- **Agent B:** `/bagis` — CampaignGrid, CategoryFilter, CartSidebar
- **Agent C:** `/odeme` — CheckoutForm, PaymentMethods, OrderSummary
- **Agent D:** `/haberler` — NewsHero, FilterBar, NewsGrid, Sidebar
- **Agent E:** `/hakkimizda` — AboutHero, MissionStatement, Timeline
- **Agent F:** `/kurban` — CountdownBanner, Hero, PackageCards, HowItWorks

Ek olarak: `/iletisim`, `/bagis/[slug]`, `/haberler/[slug]`

## Faz 3: Payload CMS & Veritabanı
- Payload collections (campaigns, news, categories, pages, donations)
- Supabase şema migration
- API route handlers

## Faz 4: Ödeme & Entegrasyonlar
- iyzico entegrasyonu (3D Secure)
- Sepet sistemi (localStorage + context)
- E-posta şablonları (Resend)
- PDF makbuz oluşturma
- i18n yapılandırması (next-intl)

## Faz 5: Admin & Son Dokunuşlar
- NextAuth.js + Payload admin
- SEO (sitemap, robots, meta tags)
- Instagram widget
- Deployment (Vercel)
