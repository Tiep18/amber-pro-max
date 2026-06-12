begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-0000000002c1',
    'authenticated',
    'authenticated',
    'catalog-customer@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-0000000002ad',
    'authenticated',
    'authenticated',
    'catalog-admin@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  (
    '00000000-0000-0000-0000-0000000002c1',
    'catalog-customer@example.test',
    'vi'
  ),
  (
    '00000000-0000-0000-0000-0000000002ad',
    'catalog-admin@example.test',
    'en'
  );

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '00000000-0000-0000-0000-0000000002ad',
  'admin',
  '00000000-0000-0000-0000-0000000002ad',
  'catalog test admin'
);

insert into public.products (id, product_type)
values ('24000000-0000-0000-0000-000000000001', 'pdf_pattern');

insert into public.product_digital_assets (
  product_id,
  bucket_id,
  object_path,
  file_name,
  byte_size
)
values (
  '24000000-0000-0000-0000-000000000001',
  'product-pdfs',
  'private/catalog-test.pdf',
  'catalog-test.pdf',
  512
);

select is_empty(
  $$select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'products',
        'product_translations',
        'categories',
        'category_translations',
        'techniques',
        'technique_translations',
        'tags',
        'tag_translations',
        'collections',
        'collection_translations',
        'product_categories',
        'product_techniques',
        'product_tags',
        'collection_products',
        'product_market_offers',
        'product_media',
        'product_digital_assets',
        'product_variants',
        'variant_market_offers',
        'inventory_records'
      ])
      and not c.relrowsecurity$$,
  'all catalog base tables enable row level security'
);

set local role anon;

select throws_ok(
  $$select * from public.products$$,
  '42501',
  null,
  'anonymous users cannot inspect catalog base tables'
);

select throws_ok(
  $$select * from public.product_digital_assets$$,
  '42501',
  null,
  'anonymous users cannot inspect private PDF metadata'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000002c1',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.products),
  0,
  'customers cannot inspect catalog base rows'
);

select is(
  (select count(*)::integer from public.product_digital_assets),
  0,
  'customers cannot inspect private PDF metadata'
);

select throws_ok(
  $$insert into public.products (product_type) values ('pdf_pattern')$$,
  '42501',
  null,
  'customers cannot mutate catalog rows'
);

select throws_ok(
  $$select * from public.catalog_publish_issues(
      '24000000-0000-0000-0000-000000000001'
    )$$,
  'P0002',
  null,
  'customers cannot inspect publish issues for hidden products'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000002ad',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.products),
  1,
  'database-owned admins can inspect catalog rows'
);

select lives_ok(
  $$insert into public.categories default values$$,
  'database-owned admins can mutate catalog rows'
);

select isnt_empty(
  $$select * from public.catalog_publish_issues(
      '24000000-0000-0000-0000-000000000001'
    )$$,
  'database-owned admins can inspect publish issues'
);

select is(
  (
    select proconfig::text
    from pg_proc
    where oid = 'public.publish_catalog_product(uuid)'::regprocedure
  ),
  '{"search_path=public, private, pg_temp"}',
  'publish function fixes search_path'
);

select finish();

rollback;
