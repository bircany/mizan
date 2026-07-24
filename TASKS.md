# TASKS.md — Mizan Derneği

## Faz 0: Proje Setup ✅
- [x] `npm init` ve package.json
- [x] Klasör yapısı (app/, components/, lib/, payload/)
- [x] Tailwind config + globals.css
- [x] tsconfig.json, next.config.ts
- [x] .env.example
- [x] npm dependencies install

## Faz 1: Tasarım Sistemi & Layout ✅
- [x] Tailwind config — renkler, tipografi, spacing
- [x] globals.css — CSS değişkenleri, utility classlar
- [x] components/Header.tsx — TopBar + Navigation
- [x] components/Footer.tsx
- [x] app/layout.tsx — root layout
- [x] lib/utils.ts — cn, formatCurrency, formatDate

## Faz 2: Sayfalar ✅
- [x] `app/page.tsx` — Anasayfa
- [x] `app/bagis/page.tsx` — Bağış listeleme
- [x] `app/odeme/page.tsx` — Ödeme sayfası
- [x] `app/haberler/page.tsx` — Haberler
- [x] `app/hakkimizda/page.tsx` — Hakkımızda
- [x] `app/kurban/page.tsx` — Kurban kampanyası
- [x] `app/iletisim/page.tsx` — İletişim
- [x] `app/bagis/[slug]/page.tsx` — Kampanya detay
- [x] `app/haberler/[slug]/page.tsx` — Haber detay

## Faz 3: CMS & Veritabanı ⏳
- [ ] Payload CMS collections
- [ ] Supabase migration
- [ ] API route handlers

## Faz 4: Entegrasyonlar ⏳
- [ ] iyzico ödeme
- [ ] Sepet sistemi (context)
- [ ] E-posta (Resend)
- [ ] PDF makbuz
- [ ] i18n (next-intl)

## Faz 5: Admin & Son İşler ⏳
- [ ] NextAuth + Payload admin
- [ ] SEO (sitemap, robots)
- [ ] Instagram widget
- [ ] Vercel deploy

## Phase 3 Baslangic Notu

Roadmap'e gore sonraki somut is paketi:

- `donations`
- `field_tasks`
- `proof_submissions`
- `proof_assets`
- `donor_reports`
- `telegram_users`
- `field_sessions`

Ilk kontrol:

1. Mevcut Payload collection'larinin bu modelle birebir eslesmesini dogrula.
2. Eksik durum gecislerini belirle.
3. Saha botu icin tek kullanimli kod akisini netlestir.
