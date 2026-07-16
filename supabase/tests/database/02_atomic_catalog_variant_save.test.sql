begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select has_function(
  'public',
  'admin_save_catalog_variant',
  array['jsonb'],
  'atomic admin catalog variant save RPC exists'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.admin_save_catalog_variant(jsonb)'::regprocedure),
  true,
  'catalog variant save RPC owns its transaction and authorization boundary'
);

select is(
  (select proconfig::text from pg_proc where oid = 'public.admin_save_catalog_variant(jsonb)'::regprocedure),
  '{"search_path=public, private, pg_temp"}',
  'catalog variant save RPC fixes search_path'
);

select function_privs_are(
  'public', 'admin_save_catalog_variant', array['jsonb'], 'authenticated', array['EXECUTE'],
  'authenticated role can invoke the admin-checked variant save RPC'
);

select function_privs_are(
  'public', 'admin_save_catalog_variant', array['jsonb'], 'anon', array[]::text[],
  'anonymous role cannot invoke the variant save RPC'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '02100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'variant-customer@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '02100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'variant-admin@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  ('02100000-0000-4000-8000-000000000001', 'variant-customer@example.test', 'en'),
  ('02100000-0000-4000-8000-000000000002', 'variant-admin@example.test', 'en');

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '02100000-0000-4000-8000-000000000002',
  'admin',
  '02100000-0000-4000-8000-000000000002',
  'atomic variant test admin'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '02100000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$select public.admin_save_catalog_variant('{}'::jsonb)$$,
  '42501',
  'admin access required',
  'non-admin users cannot invoke the variant save RPC'
);

reset role;

insert into public.products (id, product_type)
values
  ('02100000-0000-4000-8000-000000000010', 'physical_finished'),
  ('02100000-0000-4000-8000-000000000011', 'physical_finished'),
  ('02100000-0000-4000-8000-000000000012', 'physical_finished'),
  ('02100000-0000-4000-8000-000000000013', 'physical_finished');

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
    '02100000-0000-4000-8000-000000000012', 'vi',
    'atomic-published-valid-vi', 'Atomic published valid', '',
    'Atomic published valid', 'Atomic published valid description',
    'product-media', 'atomic/published-valid-social-vi.webp'
  ),
  (
    '02100000-0000-4000-8000-000000000012', 'en',
    'atomic-published-valid-en', 'Atomic published valid', '',
    'Atomic published valid', 'Atomic published valid description',
    'product-media', 'atomic/published-valid-social-en.webp'
  ),
  (
    '02100000-0000-4000-8000-000000000013', 'vi',
    'atomic-published-invalid-vi', 'Atomic published invalid', '',
    'Atomic published invalid', 'Atomic published invalid description',
    'product-media', 'atomic/published-invalid-social-vi.webp'
  ),
  (
    '02100000-0000-4000-8000-000000000013', 'en',
    'atomic-published-invalid-en', 'Atomic published invalid', '',
    'Atomic published invalid', 'Atomic published invalid description',
    'product-media', 'atomic/published-invalid-social-en.webp'
  );

insert into public.product_media (
  product_id,
  bucket_id,
  object_path,
  display_order,
  is_primary
)
values
  (
    '02100000-0000-4000-8000-000000000012',
    'product-media', 'atomic/published-valid-primary.webp', 0, true
  );

insert into public.product_market_offers (
  product_id, market_code, currency_code, enabled, price_minor
)
values
  ('02100000-0000-4000-8000-000000000010', 'vn', 'VND', true, 100000),
  ('02100000-0000-4000-8000-000000000010', 'intl', 'USD', true, 700),
  ('02100000-0000-4000-8000-000000000012', 'vn', 'VND', true, 100000),
  ('02100000-0000-4000-8000-000000000013', 'vn', 'VND', true, 100000);

insert into public.product_variants (
  id, product_id, sku, attributes, display_order
)
values (
  '02100000-0000-4000-8000-000000000020',
  '02100000-0000-4000-8000-000000000010',
  'ATOMIC-OLD',
  '{"size":"old"}'::jsonb,
  1
), (
  '02100000-0000-4000-8000-000000000021',
  '02100000-0000-4000-8000-000000000011',
  'OTHER-PRODUCT-VARIANT',
  '{"size":"other"}'::jsonb,
  1
), (
  '02100000-0000-4000-8000-000000000022',
  '02100000-0000-4000-8000-000000000012',
  'PUBLISHED-EXISTING',
  '{"size":"existing"}'::jsonb,
  0
), (
  '02100000-0000-4000-8000-000000000025',
  '02100000-0000-4000-8000-000000000013',
  'PUBLISHED-INVALID-EXISTING',
  '{"size":"existing-invalid"}'::jsonb,
  0
);

insert into public.variant_market_offers (
  variant_id, market_code, enabled, currency_code, price_minor
)
values (
  '02100000-0000-4000-8000-000000000020',
  'vn',
  true,
  'VND',
  120000
);

insert into public.inventory_records (variant_id, quantity_on_hand)
values
  ('02100000-0000-4000-8000-000000000020', 4),
  ('02100000-0000-4000-8000-000000000022', 2),
  ('02100000-0000-4000-8000-000000000025', 2);

update public.products
set status = 'published', published_at = now()
where id in (
  '02100000-0000-4000-8000-000000000012',
  '02100000-0000-4000-8000-000000000013'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '02100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $call$
    select public.admin_save_catalog_variant(
      '{
        "product_id":"02100000-0000-4000-8000-000000000010",
        "variant_id":"02100000-0000-4000-8000-000000000021",
        "sku":"ILLEGAL-REPARENT",
        "attributes":{"size":"wrong-owner"},
        "display_order":9,
        "media_id":null,
        "quantity_on_hand":1,
        "overrides":[]
      }'::jsonb
    )
  $call$,
  'P2003',
  'variant belongs to another product',
  'an existing variant ID cannot be re-parented to another product'
);

select is(
  (select sku from public.product_variants where id = '02100000-0000-4000-8000-000000000021'),
  'OTHER-PRODUCT-VARIANT',
  'owner mismatch leaves the existing variant aggregate unchanged'
);

select throws_ok(
  $call$
    select public.admin_save_catalog_variant(
      '{
        "product_id":"02100000-0000-4000-8000-000000000010",
        "variant_id":"02100000-0000-4000-8000-000000000020",
        "sku":"ATOMIC-FAILED",
        "attributes":{"size":"failed"},
        "display_order":2,
        "media_id":null,
        "quantity_on_hand":-1,
        "overrides":[
          {"market_code":"vn","enabled":true,"currency_code":"VND","price_minor":150000},
          {"market_code":"intl","enabled":true,"currency_code":"USD","price_minor":900}
        ]
      }'::jsonb
    )
  $call$,
  '23514',
  null,
  'a late inventory failure aborts the complete variant aggregate save'
);

select is(
  (select sku from public.product_variants where id = '02100000-0000-4000-8000-000000000020'),
  'ATOMIC-OLD',
  'late failure rolls back the base variant update'
);

select is(
  (select price_minor from public.variant_market_offers where variant_id = '02100000-0000-4000-8000-000000000020' and market_code = 'vn'),
  120000::bigint,
  'late failure rolls back the existing override replacement'
);

select is(
  (select count(*) from public.variant_market_offers where variant_id = '02100000-0000-4000-8000-000000000020' and market_code = 'intl'),
  0::bigint,
  'late failure rolls back a newly inserted override'
);

select is(
  (select quantity_on_hand from public.inventory_records where variant_id = '02100000-0000-4000-8000-000000000020'),
  4,
  'late failure preserves prior inventory'
);

select lives_ok(
  $call$
    select public.admin_save_catalog_variant(
      '{
        "product_id":"02100000-0000-4000-8000-000000000010",
        "variant_id":"02100000-0000-4000-8000-000000000020",
        "sku":"ATOMIC-SAVED",
        "attributes":{"size":"saved"},
        "display_order":3,
        "media_id":null,
        "quantity_on_hand":8,
        "overrides":[
          {"market_code":"intl","enabled":false,"currency_code":"USD","price_minor":950}
        ]
      }'::jsonb
    )
  $call$,
  'valid variant aggregate save commits through one RPC'
);

select is(
  (select sku from public.product_variants where id = '02100000-0000-4000-8000-000000000020'),
  'ATOMIC-SAVED',
  'successful aggregate save commits the base variant'
);

select is(
  (select count(*) from public.variant_market_offers where variant_id = '02100000-0000-4000-8000-000000000020' and market_code = 'vn'),
  0::bigint,
  'missing override removes the explicit row so pricing inherits from the parent'
);

select is(
  (select enabled from public.variant_market_offers where variant_id = '02100000-0000-4000-8000-000000000020' and market_code = 'intl'),
  false,
  'explicit disabled override remains explicit and disabled'
);

select is(
  (select quantity_on_hand from public.inventory_records where variant_id = '02100000-0000-4000-8000-000000000020'),
  8,
  'successful aggregate save commits inventory'
);

select lives_ok(
  $call$
    select public.admin_save_catalog_variant(
      '{
        "product_id":"02100000-0000-4000-8000-000000000012",
        "variant_id":"02100000-0000-4000-8000-000000000023",
        "sku":"PUBLISHED-NEW-VALID",
        "attributes":{"size":"new-valid"},
        "display_order":1,
        "media_id":null,
        "quantity_on_hand":5,
        "overrides":[]
      }'::jsonb
    )
  $call$,
  'a complete new variant can be added to a published product'
);

select is(
  (
    select status from public.products
    where id = '02100000-0000-4000-8000-000000000012'
  ),
  'published',
  'a valid final variant aggregate preserves the published product status'
);

select is(
  (
    select status from public.products
    where id = '02100000-0000-4000-8000-000000000013'
  ),
  'published',
  'the invalid fixture enters the aggregate RPC as a published product'
);

select lives_ok(
  $call$
    select public.admin_save_catalog_variant(
      '{
        "product_id":"02100000-0000-4000-8000-000000000013",
        "variant_id":"02100000-0000-4000-8000-000000000025",
        "sku":"PUBLISHED-INVALID-UPDATED",
        "attributes":{"size":"updated-invalid"},
        "display_order":0,
        "media_id":null,
        "quantity_on_hand":5,
        "overrides":[]
      }'::jsonb
    )
  $call$,
  'an aggregate save against an invalid published catalog state completes safely'
);

select is(
  (
    select status from public.products
    where id = '02100000-0000-4000-8000-000000000013'
  ),
  'draft',
  'an invalid final variant aggregate remains safely demoted'
);

select ok(
  exists (
    select 1
    from public.catalog_publish_issues('02100000-0000-4000-8000-000000000013')
    where issue_code = 'missing_primary_image'
  ),
  'the invalid final aggregate reports its remaining publish issue'
);

select finish();

rollback;
