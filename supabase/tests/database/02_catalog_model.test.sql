begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_table('public', 'products', 'products table exists');
select has_table('public', 'product_translations', 'product translations table exists');
select has_table('public', 'product_market_offers', 'product market offers table exists');
select has_table('public', 'categories', 'categories table exists');
select has_table('public', 'collections', 'collections table exists');
select has_table('public', 'product_media', 'product media table exists');
select has_table('public', 'product_digital_assets', 'private PDF metadata table exists');

insert into public.products (id, product_type)
values
  ('20000000-0000-0000-0000-000000000001', 'pdf_pattern'),
  ('20000000-0000-0000-0000-000000000002', 'physical_finished');

select throws_ok(
  $$insert into public.products (product_type) values ('unsupported')$$,
  '23514',
  null,
  'product type is restricted to supported commercial forms'
);

select throws_ok(
  $$insert into public.products (product_type, status) values ('pdf_pattern', 'pending')$$,
  '23514',
  null,
  'product status is restricted to draft, published, or archived'
);

insert into public.product_translations (
  product_id,
  locale,
  slug,
  title,
  description
)
values (
  '20000000-0000-0000-0000-000000000001',
  'vi',
  'gau-bong-len',
  'Gau bong len',
  'Mau moc gau bong.'
);

select throws_ok(
  $$insert into public.product_translations (
      product_id, locale, slug, title, description
    ) values (
      '20000000-0000-0000-0000-000000000002',
      'vi',
      'gau-bong-len',
      'Gau bong thanh pham',
      'Gau bong da moc san.'
    )$$,
  '23505',
  null,
  'product slugs are unique within a locale'
);

select lives_ok(
  $$insert into public.product_market_offers (
      product_id, market_code, enabled, currency_code, price_minor
    ) values
      ('20000000-0000-0000-0000-000000000001', 'vn', true, 'VND', 120000),
      ('20000000-0000-0000-0000-000000000001', 'intl', true, 'USD', 700)$$,
  'enabled offers accept explicit integer prices in the market currency'
);

select throws_ok(
  $$insert into public.product_market_offers (
      product_id, market_code, enabled, currency_code, price_minor
    ) values (
      '20000000-0000-0000-0000-000000000002',
      'vn',
      true,
      'USD',
      1000
    )$$,
  '23514',
  null,
  'Vietnam offers reject non-VND currency'
);

select throws_ok(
  $$insert into public.product_market_offers (
      product_id, market_code, enabled, currency_code, price_minor
    ) values (
      '20000000-0000-0000-0000-000000000002',
      'intl',
      true,
      'VND',
      1000
    )$$,
  '23514',
  null,
  'international offers reject non-USD currency'
);

insert into public.categories (id)
values ('21000000-0000-0000-0000-000000000001');

insert into public.collections (id)
values ('22000000-0000-0000-0000-000000000001');

select throws_ok(
  $$insert into public.product_categories (product_id, category_id)
    values (
      '20000000-0000-0000-0000-000000000001',
      '21000000-0000-0000-0000-000000000099'
    )$$,
  '23503',
  null,
  'category membership rejects unknown category ownership'
);

insert into public.collection_products (collection_id, product_id, display_order)
values (
  '22000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  1
);

select throws_ok(
  $$insert into public.collection_products (
      collection_id, product_id, display_order
    ) values (
      '22000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      1
    )$$,
  '23505',
  null,
  'curated collection order is explicit and unique within a collection'
);

select finish();

rollback;
