begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_function(
  'public',
  'list_catalog_products',
  array['text', 'text', 'text', 'text', 'text', 'uuid', 'uuid', 'text'],
  'market-filtered catalog listing RPC exists'
);
select has_function(
  'public',
  'list_catalog_facets',
  array['text', 'text'],
  'market-filtered catalog facets RPC exists'
);
select has_function(
  'public',
  'get_catalog_product_by_slug',
  array['text', 'text', 'text'],
  'catalog detail RPC exists'
);
select has_function(
  'public',
  'get_catalog_category_by_slug',
  array['text', 'text', 'text'],
  'catalog category RPC exists'
);
select has_function(
  'public',
  'get_catalog_collection_by_slug',
  array['text', 'text', 'text'],
  'catalog collection RPC exists'
);

delete from public.products
where id in (
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000003'
);
delete from public.categories where id = '51000000-0000-0000-0000-000000000001';
delete from public.collections where id = '52000000-0000-0000-0000-000000000001';

insert into public.categories (id)
values ('41000000-0000-0000-0000-000000000001');

insert into public.category_translations (
  category_id,
  locale,
  slug,
  name,
  description,
  seo_title,
  seo_description,
  social_image_bucket,
  social_image_path
)
values
  (
    '41000000-0000-0000-0000-000000000001',
    'vi',
    'gau-bong',
    'Gau bong',
    'Danh muc gau bong.',
    'Gau bong handmade',
    'Mua gau bong handmade.',
    'product-media',
    'categories/gau-bong.jpg'
  ),
  (
    '41000000-0000-0000-0000-000000000001',
    'en',
    'stuffed-animals',
    'Stuffed animals',
    'Stuffed animals category.',
    'Stuffed animals',
    'Shop handmade stuffed animals.',
    'product-media',
    'categories/stuffed-animals.jpg'
  );

insert into public.techniques (id)
values ('42000000-0000-0000-0000-000000000001');

insert into public.technique_translations (technique_id, locale, name, description)
values
  ('42000000-0000-0000-0000-000000000001', 'vi', 'Moc amigurumi', ''),
  ('42000000-0000-0000-0000-000000000001', 'en', 'Amigurumi', '');

insert into public.tags (id)
values ('43000000-0000-0000-0000-000000000001');

insert into public.tag_translations (tag_id, locale, name)
values
  ('43000000-0000-0000-0000-000000000001', 'vi', 'Qua tang'),
  ('43000000-0000-0000-0000-000000000001', 'en', 'Gift');

insert into public.collections (id)
values ('44000000-0000-0000-0000-000000000001');

insert into public.collection_translations (
  collection_id,
  locale,
  slug,
  name,
  description,
  seo_title,
  seo_description,
  social_image_bucket,
  social_image_path
)
values
  (
    '44000000-0000-0000-0000-000000000001',
    'vi',
    'qua-tang',
    'Qua tang',
    'Bo suu tap qua tang.',
    'Qua tang handmade',
    'Goi y qua tang handmade.',
    'product-media',
    'collections/qua-tang.jpg'
  ),
  (
    '44000000-0000-0000-0000-000000000001',
    'en',
    'gifts',
    'Gifts',
    'Gift collection.',
    'Handmade gifts',
    'Gift-ready handmade crochet.',
    'product-media',
    'collections/gifts.jpg'
  );

insert into public.products (id, product_type, status, published_at)
values
  ('40000000-0000-0000-0000-000000000001', 'pdf_pattern', 'published', '2026-01-01T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000002', 'physical_finished', 'published', '2026-01-02T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000003', 'physical_finished', 'published', '2026-01-03T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000004', 'pdf_pattern', 'published', '2026-01-04T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000005', 'pdf_pattern', 'draft', null);

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
values
  (
    '40000000-0000-0000-0000-000000000001',
    'vi',
    'mau-gau-vn',
    'Mau gau Viet Nam',
    'Mau PDF chi ban tai Viet Nam.',
    'Mau gau Viet Nam',
    'Tai mau gau PDF.',
    'product-media',
    'products/vn-pattern-social.jpg'
  ),
  (
    '40000000-0000-0000-0000-000000000001',
    'en',
    'vn-bear-pattern',
    'VN bear pattern',
    'Vietnam-only PDF pattern.',
    'VN bear pattern',
    'Download the VN bear pattern.',
    'product-media',
    'products/vn-pattern-social-en.jpg'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'vi',
    'gau-quoc-te',
    'Gau quoc te',
    'Gau chi ban quoc te.',
    'Gau quoc te',
    'Gau handmade cho khach quoc te.',
    'product-media',
    'products/intl-bear-social-vi.jpg'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'en',
    'intl-bear',
    'International bear',
    'International-only handmade bear.',
    'International bear',
    'Shop the international handmade bear.',
    'product-media',
    'products/intl-bear-social.jpg'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'vi',
    'gau-ca-hai',
    'Gau ca hai thi truong',
    'Gau ban ca hai thi truong.',
    'Gau ca hai thi truong',
    'Gau handmade ban ca hai thi truong.',
    'product-media',
    'products/both-bear-social-vi.jpg'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'en',
    'both-market-bear',
    'Both-market bear',
    'Bear sold in both markets.',
    'Both-market bear',
    'Shop the bear in your market.',
    'product-media',
    'products/both-bear-social.jpg'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'vi',
    'mau-tat-offer',
    'Mau tat offer',
    'Mau khong co offer dang bat.',
    'Mau tat offer',
    'Mau khong duoc hien tren listing.',
    'product-media',
    'products/disabled-social-vi.jpg'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'en',
    'disabled-offer-pattern',
    'Disabled offer pattern',
    'Pattern with disabled offer.',
    'Disabled offer pattern',
    'Hidden from public listing.',
    'product-media',
    'products/disabled-social.jpg'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    'en',
    'draft-pattern',
    'Draft pattern',
    'Draft content.',
    'Draft pattern',
    'Draft content.',
    'product-media',
    'products/draft-social.jpg'
  );

insert into public.product_media (product_id, bucket_id, object_path, display_order, is_primary)
values
  ('40000000-0000-0000-0000-000000000001', 'product-media', 'products/vn-pattern.jpg', 0, true),
  ('40000000-0000-0000-0000-000000000002', 'product-media', 'products/intl-bear.jpg', 0, true),
  ('40000000-0000-0000-0000-000000000003', 'product-media', 'products/both-bear.jpg', 0, true),
  ('40000000-0000-0000-0000-000000000003', 'product-media', 'products/both-bear-detail.jpg', 1, false),
  ('40000000-0000-0000-0000-000000000004', 'product-media', 'products/disabled.jpg', 0, true);

insert into public.product_digital_assets (product_id, bucket_id, object_path, file_name, byte_size)
values
  ('40000000-0000-0000-0000-000000000001', 'pattern-pdfs', 'products/vn-pattern.pdf', 'vn-pattern.pdf', 1024),
  ('40000000-0000-0000-0000-000000000004', 'pattern-pdfs', 'products/disabled.pdf', 'disabled.pdf', 1024);

insert into public.product_market_offers (product_id, market_code, enabled, currency_code, price_minor)
values
  ('40000000-0000-0000-0000-000000000001', 'vn', true, 'VND', 125000),
  ('40000000-0000-0000-0000-000000000002', 'intl', true, 'USD', 2400),
  ('40000000-0000-0000-0000-000000000003', 'vn', true, 'VND', 320000),
  ('40000000-0000-0000-0000-000000000003', 'intl', true, 'USD', 2800),
  ('40000000-0000-0000-0000-000000000004', 'vn', false, 'VND', 100000);

insert into public.product_categories (product_id, category_id)
values
  ('40000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000001');

insert into public.product_techniques (product_id, technique_id)
values
  ('40000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000001');

insert into public.product_tags (product_id, tag_id)
values
  ('40000000-0000-0000-0000-000000000002', '43000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '43000000-0000-0000-0000-000000000001');

insert into public.collection_products (collection_id, product_id, display_order)
values
  ('44000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 1),
  ('44000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 2),
  ('44000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 3);

insert into public.inventory_records (product_id, quantity_on_hand)
values ('40000000-0000-0000-0000-000000000002', 0);

insert into public.product_variants (id, product_id, sku, attributes, display_order)
values
  (
    '45000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    'BOTH-SMALL',
    '{"size":"small"}'::jsonb,
    1
  ),
  (
    '45000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    'BOTH-LARGE',
    '{"size":"large"}'::jsonb,
    2
  );

insert into public.inventory_records (variant_id, quantity_on_hand)
values
  ('45000000-0000-0000-0000-000000000001', 4),
  ('45000000-0000-0000-0000-000000000002', 0);

insert into public.variant_market_offers (variant_id, market_code, enabled, currency_code, price_minor)
values
  ('45000000-0000-0000-0000-000000000001', 'intl', true, 'USD', 3100),
  ('45000000-0000-0000-0000-000000000002', 'intl', false, 'USD', 3300),
  ('45000000-0000-0000-0000-000000000002', 'vn', true, 'VND', 360000);

select results_eq(
  $$select slug, currency_code, price_minor
    from public.list_catalog_products('vi', 'vn', null, null, null, null, null, 'newest')
    order by slug$$,
  $$values
    ('gau-ca-hai'::text, 'VND'::text, 320000::bigint),
    ('mau-gau-vn'::text, 'VND'::text, 125000::bigint)$$,
  'VN listing exposes only published enabled VN offers in VND'
);

select results_eq(
  $$select slug, currency_code, price_minor
    from public.list_catalog_products('en', 'intl', null, null, null, null, null, 'newest')
    order by slug$$,
  $$values
    ('both-market-bear'::text, 'USD'::text, 2800::bigint),
    ('intl-bear'::text, 'USD'::text, 2400::bigint)$$,
  'international listing exposes only published enabled international offers in USD'
);

select is_empty(
  $$select 1
    from public.list_catalog_products('en', 'intl', null, null, null, null, null, 'newest')
    where slug in ('vn-bear-pattern', 'disabled-offer-pattern', 'draft-pattern')$$,
  'listing hides other-market, disabled, and draft products'
);

select results_eq(
  $$select slug
    from public.list_catalog_products(
      'vi',
      'vn',
      'gau',
      'physical_finished',
      'gau-bong',
      '42000000-0000-0000-0000-000000000001',
      null,
      'title'
    )$$,
  $$values ('gau-ca-hai'::text)$$,
  'search, type, category, and technique filters compose'
);

select results_eq(
  $$select slug
    from public.list_catalog_products(
      'en',
      'intl',
      null,
      null,
      null,
      null,
      '43000000-0000-0000-0000-000000000001',
      'title'
    )
    order by slug$$,
  $$values ('both-market-bear'::text), ('intl-bear'::text)$$,
  'tag filters compose with active market eligibility'
);

select results_eq(
  $$select slug
    from public.list_catalog_products('vi', 'vn', null, null, null, null, null, 'collection:qua-tang')$$,
  $$values ('gau-ca-hai'::text), ('mau-gau-vn'::text)$$,
  'collection browsing preserves manual order while filtering active market'
);

select results_eq(
  $$select facet_type, slug, label, product_count
    from public.list_catalog_facets('en', 'intl')
    where facet_type in ('category', 'collection')
    order by facet_type, slug$$,
  $$values
    ('category'::text, 'stuffed-animals'::text, 'Stuffed animals'::text, 2::bigint),
    ('collection'::text, 'gifts'::text, 'Gifts'::text, 2::bigint)$$,
  'facets count only active-market eligible products'
);

select results_eq(
  $$select available, currency_code, price_minor, other_market_code
    from public.get_catalog_product_by_slug('en', 'intl', 'vn-bear-pattern')$$,
  $$values (false, null::text, null::bigint, 'vn'::text)$$,
  'direct detail returns localized unavailable content without wrong-market price'
);

select isnt_empty(
  $$select 1
    from public.get_catalog_product_by_slug('en', 'intl', 'vn-bear-pattern')
    where title = 'VN bear pattern'
      and description = 'Vietnam-only PDF pattern.'$$,
  'unavailable detail still returns localized public content'
);

select is(
  (
    select variants
    from public.get_catalog_product_by_slug('en', 'intl', 'both-market-bear')
  ),
  '[{"sku": "BOTH-SMALL", "stock": true, "enabled": true, "variant_id": "45000000-0000-0000-0000-000000000001", "attributes": {"size": "small"}, "price_minor": 3100, "currency_code": "USD", "display_order": 1}, {"sku": "BOTH-LARGE", "stock": false, "enabled": false, "variant_id": "45000000-0000-0000-0000-000000000002", "attributes": {"size": "large"}, "price_minor": null, "currency_code": null, "display_order": 2}]'::jsonb,
  'variant projection uses override, disabled state, and stock boolean without exact inventory'
);

select is(
  (
    select media_images
    from public.get_catalog_product_by_slug('en', 'intl', 'both-market-bear')
  ),
  '[{"alt": "", "bucket_id": "product-media", "is_primary": true, "object_path": "products/both-bear.jpg", "display_order": 0}, {"alt": "", "bucket_id": "product-media", "is_primary": false, "object_path": "products/both-bear-detail.jpg", "display_order": 1}]'::jsonb,
  'detail projection includes all product media for gallery thumbnails'
);

select isnt(
  (
    select variants::text
    from public.get_catalog_product_by_slug('en', 'intl', 'both-market-bear')
  ),
  '%quantity_on_hand%',
  'variant projection omits exact inventory field names'
);

select is(
  (
    select private.is_admin()
  ),
  false,
  'query test role is not treated as admin'
);

set local role anon;

select isnt_empty(
  $$select 1
    from public.list_catalog_products('en', 'intl', null, null, null, null, null, 'newest')
    where slug = 'both-market-bear'
      and currency_code = 'USD'$$,
  'anon can execute the market-safe listing RPC'
);

select throws_ok(
  $$select 1
    from public.products
    where id = '40000000-0000-0000-0000-000000000003'$$,
  '42501',
  'permission denied for table products',
  'anon still cannot read private base catalog tables'
);

select throws_ok(
  $$select * from public.list_catalog_products('en', 'usd', null, null, null, null, null, 'newest')$$,
  '22023',
  'invalid market code',
  'invalid market inputs are rejected before query execution'
);

select finish();

rollback;
