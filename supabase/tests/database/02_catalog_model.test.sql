begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

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

select has_table('public', 'product_variants', 'product variants table exists');
select has_table('public', 'variant_market_offers', 'variant market overrides table exists');
select has_table('public', 'inventory_records', 'inventory ownership table exists');
select has_function(
  'public',
  'catalog_publish_issues',
  array['uuid'],
  'catalog publish issue function exists'
);
select has_function(
  'public',
  'publish_catalog_product',
  array['uuid'],
  'atomic catalog publish function exists'
);

select throws_ok(
  $$insert into public.product_variants (product_id, sku, attributes)
    values (
      '20000000-0000-0000-0000-000000000001',
      'DIGITAL-SKU',
      '{"size":"small"}'::jsonb
    )$$,
  '23514',
  null,
  'digital products cannot own variants'
);

select lives_ok(
  $$insert into public.product_variants (id, product_id, sku, attributes)
    values (
      '23000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      'PHYSICAL-SMALL',
      '{"size":"small","color":"brown"}'::jsonb
    )$$,
  'physical products accept explicit variants'
);

select throws_ok(
  $$insert into public.product_variants (product_id, sku, attributes)
    values (
      '20000000-0000-0000-0000-000000000002',
      'PHYSICAL-SMALL',
      '{"size":"large"}'::jsonb
    )$$,
  '23505',
  null,
  'variant SKUs are globally unique'
);

select throws_ok(
  $$insert into public.product_variants (product_id, sku, attributes)
    values (
      '20000000-0000-0000-0000-000000000002',
      'PHYSICAL-EMPTY',
      '{}'::jsonb
    )$$,
  '23514',
  null,
  'variant attributes must be a non-empty object'
);

select lives_ok(
  $$insert into public.variant_market_offers (
      variant_id, market_code, enabled, currency_code, price_minor
    ) values (
      '23000000-0000-0000-0000-000000000001',
      'intl',
      true,
      'USD',
      1200
    )$$,
  'variants accept optional market price overrides'
);

select throws_ok(
  $$insert into public.variant_market_offers (
      variant_id, market_code, enabled, currency_code, price_minor
    ) values (
      '23000000-0000-0000-0000-000000000001',
      'vn',
      true,
      'USD',
      1200
    )$$,
  '23514',
  null,
  'variant overrides enforce market currency'
);

select lives_ok(
  $$insert into public.inventory_records (variant_id, quantity_on_hand)
    values ('23000000-0000-0000-0000-000000000001', 3)$$,
  'variant products store inventory on the variant'
);

select throws_ok(
  $$insert into public.inventory_records (product_id, quantity_on_hand)
    values ('20000000-0000-0000-0000-000000000002', 3)$$,
  '23514',
  null,
  'a product with variants cannot also own product-level inventory'
);

insert into public.products (id, product_type)
values ('20000000-0000-0000-0000-000000000003', 'physical_finished');

insert into public.inventory_records (product_id, quantity_on_hand)
values ('20000000-0000-0000-0000-000000000003', 1);

select throws_ok(
  $$insert into public.product_variants (product_id, sku, attributes)
    values (
      '20000000-0000-0000-0000-000000000003',
      'LATE-VARIANT',
      '{"size":"medium"}'::jsonb
    )$$,
  '23514',
  null,
  'a product with product-level inventory cannot add variants'
);

select throws_ok(
  $$insert into public.inventory_records (product_id, quantity_on_hand)
    values ('20000000-0000-0000-0000-000000000001', 1)$$,
  '23514',
  null,
  'digital products cannot own inventory'
);

select results_eq(
  $$select issue_code
    from public.catalog_publish_issues(
      '20000000-0000-0000-0000-000000000001'
    )
    order by issue_code$$,
  $$values
    ('missing_primary_image'::text),
    ('missing_private_pdf'::text),
    ('missing_seo_description'::text),
    ('missing_seo_title'::text),
    ('missing_social_image'::text),
    ('missing_translation'::text)$$,
  'publish issues enumerate missing bilingual, image, SEO, and PDF data'
);

insert into public.product_translations (
  product_id,
  locale,
  slug,
  title,
  description,
  seo_title,
  seo_description,
  social_image_bucket,
  social_image_path
)
values (
  '20000000-0000-0000-0000-000000000001',
  'en',
  'crochet-bear',
  'Crochet bear',
  'Crochet bear pattern.',
  'Crochet bear pattern',
  'Download the crochet bear PDF pattern.',
  'product-images',
  'products/bear/social-en.jpg'
);

update public.product_translations
set
  seo_title = 'Mau gau bong',
  seo_description = 'Tai mau moc gau bong PDF.',
  social_image_bucket = 'product-images',
  social_image_path = 'products/bear/social-vi.jpg'
where product_id = '20000000-0000-0000-0000-000000000001'
  and locale = 'vi';

insert into public.product_media (
  product_id,
  bucket_id,
  object_path,
  display_order,
  is_primary
)
values (
  '20000000-0000-0000-0000-000000000001',
  'product-images',
  'products/bear/primary.jpg',
  0,
  true
);

insert into public.product_digital_assets (
  product_id,
  bucket_id,
  object_path,
  file_name,
  byte_size
)
values (
  '20000000-0000-0000-0000-000000000001',
  'product-pdfs',
  'products/bear/pattern.pdf',
  'pattern.pdf',
  1024
);

select is_empty(
  $$select *
    from public.catalog_publish_issues(
      '20000000-0000-0000-0000-000000000001'
    )$$,
  'a complete bilingual PDF product has no publish issues'
);

select results_eq(
  $$select published
    from public.publish_catalog_product(
      '20000000-0000-0000-0000-000000000001'
    )$$,
  $$values (true)$$,
  'the publish function atomically publishes a complete product'
);

select is(
  (
    select status
    from public.products
    where id = '20000000-0000-0000-0000-000000000001'
  ),
  'published',
  'publishing updates the product status'
);

select finish();

rollback;
