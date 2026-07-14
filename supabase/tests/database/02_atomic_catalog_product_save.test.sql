begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select has_function(
  'public',
  'admin_save_catalog_product',
  array['jsonb'],
  'atomic admin catalog product save RPC exists'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.admin_save_catalog_product(jsonb)'::regprocedure),
  true,
  'catalog product save RPC owns its transaction and authorization boundary'
);

select is(
  (select proconfig::text from pg_proc where oid = 'public.admin_save_catalog_product(jsonb)'::regprocedure),
  '{"search_path=public, private, pg_temp"}',
  'catalog product save RPC fixes search_path'
);

select function_privs_are(
  'public',
  'admin_save_catalog_product',
  array['jsonb'],
  'authenticated',
  array['EXECUTE'],
  'authenticated role can invoke the admin-checked save RPC'
);

select function_privs_are(
  'public',
  'admin_save_catalog_product',
  array['jsonb'],
  'anon',
  array[]::text[],
  'anonymous role cannot invoke the save RPC'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '02000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'catalog-customer@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '02000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'catalog-admin@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  ('02000000-0000-4000-8000-000000000001', 'catalog-customer@example.test', 'en'),
  ('02000000-0000-4000-8000-000000000002', 'catalog-admin@example.test', 'en');

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '02000000-0000-4000-8000-000000000002',
  'admin',
  '02000000-0000-4000-8000-000000000002',
  'atomic catalog test admin'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '02000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$select public.admin_save_catalog_product('{}'::jsonb)$$,
  '42501',
  'admin access required',
  'non-admin users cannot invoke the catalog save RPC'
);

reset role;

insert into public.products (id, product_type)
values
  ('02000000-0000-4000-8000-000000000010', 'pdf_pattern'),
  ('02000000-0000-4000-8000-000000000011', 'physical_finished');

insert into public.product_translations (
  product_id, locale, slug, title, description, specifications
)
values
  (
    '02000000-0000-4000-8000-000000000010', 'vi', 'atomic-old-vi',
    'Old VI title', 'Old VI description', '{"version":"old"}'::jsonb
  ),
  (
    '02000000-0000-4000-8000-000000000010', 'en', 'atomic-old-en',
    'Old EN title', 'Old EN description', '{"version":"old"}'::jsonb
  );

insert into public.product_market_offers (
  product_id, market_code, currency_code, enabled, price_minor
)
values
  ('02000000-0000-4000-8000-000000000010', 'vn', 'VND', true, 100000),
  ('02000000-0000-4000-8000-000000000010', 'intl', 'USD', false, null);

insert into public.categories (id)
values ('02000000-0000-4000-8000-000000000020');

insert into public.product_categories (product_id, category_id)
values (
  '02000000-0000-4000-8000-000000000010',
  '02000000-0000-4000-8000-000000000020'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '02000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $call$
    select public.admin_save_catalog_product(
      '{
        "product_id":"02000000-0000-4000-8000-000000000010",
        "product_type":"physical_finished",
        "translations":[
          {"locale":"vi","slug":"atomic-new-vi","title":"New VI title","description":"New","specifications":{},"seo_title":null,"seo_description":null},
          {"locale":"en","slug":"atomic-new-en","title":"New EN title","description":"New","specifications":{},"seo_title":null,"seo_description":null}
        ],
        "offers":[
          {"market_code":"vn","currency_code":"VND","enabled":true,"price_minor":200000},
          {"market_code":"intl","currency_code":"USD","enabled":true,"price_minor":900}
        ],
        "category_ids":["02000000-0000-4000-8000-000000000099"],
        "technique_ids":[],
        "tag_ids":[],
        "collections":[]
      }'::jsonb
    )
  $call$,
  '23503',
  null,
  'a late relation failure aborts the complete catalog aggregate save'
);

select is(
  (select product_type from public.products where id = '02000000-0000-4000-8000-000000000010'),
  'pdf_pattern',
  'late failure rolls back the base product update'
);

select is(
  (select title from public.product_translations where product_id = '02000000-0000-4000-8000-000000000010' and locale = 'en'),
  'Old EN title',
  'late failure rolls back translation upserts'
);

select is(
  (select price_minor from public.product_market_offers where product_id = '02000000-0000-4000-8000-000000000010' and market_code = 'vn'),
  100000::bigint,
  'late failure rolls back market offer upserts'
);

select is(
  (
    select category_id
    from public.product_categories
    where product_id = '02000000-0000-4000-8000-000000000010'
  ),
  '02000000-0000-4000-8000-000000000020'::uuid,
  'late failure rolls back relation deletes'
);

select lives_ok(
  $call$
    select public.admin_save_catalog_product(
      '{
        "product_id":"02000000-0000-4000-8000-000000000010",
        "product_type":"pdf_pattern",
        "translations":[
          {"locale":"vi","slug":"atomic-saved-vi","title":"Saved VI title","description":"Saved","specifications":{},"seo_title":null,"seo_description":null},
          {"locale":"en","slug":"atomic-saved-en","title":"Saved EN title","description":"Saved","specifications":{},"seo_title":null,"seo_description":null}
        ],
        "offers":[
          {"market_code":"vn","currency_code":"VND","enabled":true,"price_minor":250000},
          {"market_code":"intl","currency_code":"USD","enabled":false,"price_minor":null}
        ],
        "category_ids":[],
        "technique_ids":[],
        "tag_ids":[],
        "collections":[]
      }'::jsonb
    )
  $call$,
  'valid aggregate save commits through one RPC'
);

select is(
  (select title from public.product_translations where product_id = '02000000-0000-4000-8000-000000000010' and locale = 'en'),
  'Saved EN title',
  'successful aggregate save commits child rows'
);

select is(
  (select count(*) from public.product_categories where product_id = '02000000-0000-4000-8000-000000000010'),
  0::bigint,
  'successful aggregate save replaces relation membership'
);

select finish();

rollback;
