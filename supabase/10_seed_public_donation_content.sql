BEGIN;

WITH seed(slug, icon, color) AS (
  VALUES
    ('kurban', 'restaurant', '#AC780F'),
    ('mescid', 'mosque', '#4E6B4E'),
    ('medrese', 'school', '#4E6B4E'),
    ('yetim', 'child_care', '#4E6B4E'),
    ('su-kuyusu', 'water_full', '#4E6B4E'),
    ('acil-yardim', 'emergency_home', '#AC780F')
)
INSERT INTO public.categories (slug, icon, color)
SELECT slug, icon, color
FROM seed
ON CONFLICT (slug) DO UPDATE
SET icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    updated_at = now();

WITH seed(slug, name) AS (
  VALUES
    ('kurban', 'Kurban'),
    ('mescid', 'Mescid'),
    ('medrese', 'Medrese'),
    ('yetim', 'Yetim'),
    ('su-kuyusu', 'Su Kuyusu'),
    ('acil-yardim', 'Acil Yardım')
)
UPDATE public.categories_locales AS locales
SET name = seed.name
FROM seed
JOIN public.categories AS category ON category.slug = seed.slug
WHERE locales._parent_id = category.id
  AND locales._locale = 'tr';

WITH seed(slug, name) AS (
  VALUES
    ('kurban', 'Kurban'),
    ('mescid', 'Mescid'),
    ('medrese', 'Medrese'),
    ('yetim', 'Yetim'),
    ('su-kuyusu', 'Su Kuyusu'),
    ('acil-yardim', 'Acil Yardım')
)
INSERT INTO public.categories_locales (name, _locale, _parent_id)
SELECT seed.name, 'tr', category.id
FROM seed
JOIN public.categories AS category ON category.slug = seed.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories_locales AS locales
  WHERE locales._parent_id = category.id
    AND locales._locale = 'tr'
);

WITH seed(code, slug, category_slug, target_amount, collected_amount, donor_count, currency) AS (
  VALUES
    ('su-kuyusu', 'su-kuyusu', 'su-kuyusu', 45000, 32400, 1248, 'TRY'),
    ('yetim', 'yetim', 'yetim', 25000, 11250, 856, 'TRY'),
    ('kurban-2024', 'kurban-2024', 'kurban', 120000, 81600, 2100, 'TRY'),
    ('mescid', 'mescid', 'mescid', 80000, 24000, 340, 'TRY')
)
INSERT INTO public.campaigns (
  target_amount,
  collected_amount,
  code,
  category_id,
  currency,
  reporting_mode,
  is_donation_open,
  slug,
  donor_count
)
SELECT
  seed.target_amount,
  seed.collected_amount,
  seed.code,
  category.id,
  seed.currency::public.enum_campaigns_currency,
  'pool'::public.enum_campaigns_reporting_mode,
  true,
  seed.slug,
  seed.donor_count
FROM seed
JOIN public.categories AS category ON category.slug = seed.category_slug
ON CONFLICT (code) DO UPDATE
SET target_amount = EXCLUDED.target_amount,
    collected_amount = EXCLUDED.collected_amount,
    category_id = EXCLUDED.category_id,
    currency = EXCLUDED.currency,
    is_donation_open = EXCLUDED.is_donation_open,
    slug = EXCLUDED.slug,
    donor_count = EXCLUDED.donor_count,
    updated_at = now();

WITH seed(slug, title) AS (
  VALUES
    ('su-kuyusu', 'Mizan Su Kuyuları Projesi'),
    ('yetim', 'Bir Yetim Gülsün Dünya Gülsün'),
    ('kurban-2024', '2024 Kurban Bağışı'),
    ('mescid', 'Mescid Projeleri')
)
UPDATE public.campaigns_locales AS locales
SET title = seed.title
FROM seed
JOIN public.campaigns AS campaign ON campaign.slug = seed.slug
WHERE locales._parent_id = campaign.id
  AND locales._locale = 'tr';

WITH seed(slug, title) AS (
  VALUES
    ('su-kuyusu', 'Mizan Su Kuyuları Projesi'),
    ('yetim', 'Bir Yetim Gülsün Dünya Gülsün'),
    ('kurban-2024', '2024 Kurban Bağışı'),
    ('mescid', 'Mescid Projeleri')
)
INSERT INTO public.campaigns_locales (title, _locale, _parent_id)
SELECT seed.title, 'tr', campaign.id
FROM seed
JOIN public.campaigns AS campaign ON campaign.slug = seed.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.campaigns_locales AS locales
  WHERE locales._parent_id = campaign.id
    AND locales._locale = 'tr'
);

COMMIT;
