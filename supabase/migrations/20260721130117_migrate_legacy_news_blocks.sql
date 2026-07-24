begin;

with extracted as (
  select
    locale_row.id,
    string_agg(trim(both '"' from text_value::text), ' ' order by text_value::text) as plain_text
  from public.news_locales locale_row
  cross join lateral jsonb_path_query(locale_row.content, '$.**.text') as text_value
  where locale_row.content is not null
  group by locale_row.id
)
update public.news_locales locale_row
set content_blocks = jsonb_build_array(jsonb_build_object(
  'id', 'legacy-' || locale_row.id::text,
  'type', 'paragraph',
  'text', extracted.plain_text
))
from extracted
where locale_row.id = extracted.id
  and extracted.plain_text <> ''
  and (locale_row.content_blocks is null or locale_row.content_blocks = '[]'::jsonb);

commit;
