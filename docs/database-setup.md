# Mizan Dernegi Database Setup

## Mimari Not

- Uygulama `Supabase Postgres + Supabase Storage + Payload CMS` ile calisiyor.
- `Payload` collection tablolarini manuel SQL ile kurmuyoruz.
- Dogru `PAYLOAD_DATABASE_URI` verildiginde Payload kendi tablo/sema yapisini ilk calismada olusturacak.
- Manuel SQL sadece `storage bucket` hazirligi icin gerekli.

## Adim 1 - Supabase SQL Editor

`supabase/01_storage_setup.sql` dosyasini calistir:

```sql
begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'receipts',
    'receipts',
    false,
    10485760,
    array['application/pdf']
  ),
  (
    'proof-assets',
    'proof-assets',
    false,
    524288000,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
```

## Adim 2 - Bucket dogrulama

`supabase/02_storage_verify.sql` dosyasini calistir:

```sql
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('receipts', 'proof-assets')
order by id;
```

Beklenen sonuc:

- `receipts`
- `proof-assets`
- ikisi de `public = false`

## Adim 3 - .env degerleri

Asagidaki alanlari doldur:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

PAYLOAD_SECRET=LONG_RANDOM_SECRET
PAYLOAD_DATABASE_URI=postgresql://postgres.PROJECT_REF:DB_PASSWORD@YOUR_POOLER_HOST:6543/postgres?sslmode=require

IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
IYZICO_WEBHOOK_SECRET=

RESEND_API_KEY=
FROM_EMAIL=noreply@mizandernegi.org

NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Adim 4 - Degerleri nereden alacaksin

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase Dashboard -> Project Settings -> API -> Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase Dashboard -> Project Settings -> API -> anon public key
- `SUPABASE_SERVICE_ROLE_KEY`
  - Supabase Dashboard -> Project Settings -> API -> service_role key
- `PAYLOAD_DATABASE_URI`
  - Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI
  - Pooler URI tercih et: `6543`
  - Sifreyi kendi database sifren ile degistir
  - `db.PROJECT_REF.supabase.co:5432` yerine mumkunse `pooler.supabase.com:6543` kullan
  - Bazi Windows/ag ortamlari direct IPv6 hostu duzgun cozemeyebiliyor
- `PAYLOAD_SECRET`
  - Rastgele uzun bir secret uret

## Adim 5 - Postgres baglanti testi

```bash
npm run db:check
```

Bu komut:

- Postgres'e baglanir
- `public` schema'daki mevcut tablolari listeler

## Adim 6 - Payload tablolarini olusturma

Env degerleri girildikten sonra:

```bash
npm run dev
```

Ilk baglantida Payload, collection tablolarini Postgres tarafinda olusturur.

Olusmasi beklenen ana koleksiyonlar:

- `users`
- `campaigns`
- `categories`
- `news`
- `pages`
- `donation_intents`
- `payment_sessions`
- `payment_events`
- `donations`
- `refund_requests`
- `field_tasks`
- `proof_submissions`
- `proof_assets`
- `donor_reports`
- `audit_logs`

## Adim 7 - Ilk admin kullanicisi

Eger `users` koleksiyonunda hic kullanici yoksa:

- `http://localhost:3000/yonetim`

adresine git.

Payload sana otomatik olarak ilk admin kullanicisini olusturma ekranini gosterir.

## Adim 8 - Kontrol

Uygulama acildiktan sonra:

- `/yonetim`
- `/operasyon`

rotalari acilmali.

Ilk teknik panel:

- `Payload admin`: `/yonetim`
- `Operasyon dashboard`: `/operasyon`

Eger Postgres baglantisi hatasi alirsan ilk kontrol edilecek alan `PAYLOAD_DATABASE_URI` olacak.
