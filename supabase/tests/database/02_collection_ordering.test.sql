begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select has_function(
  'public',
  'admin_catalog_collection_next_orders',
  array['uuid[]'],
  'admin collection next-order aggregate exists'
);

select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.admin_catalog_collection_next_orders(uuid[])'::regprocedure
  ),
  true,
  'collection next-order aggregate owns its authorization boundary'
);

select is(
  (
    select proconfig::text
    from pg_proc
    where oid = 'public.admin_catalog_collection_next_orders(uuid[])'::regprocedure
  ),
  '{"search_path=public, private, pg_temp"}',
  'collection next-order aggregate fixes search_path'
);

select ok(
  not exists (
    select 1
    from aclexplode(
      coalesce(
        (
          select proacl
          from pg_proc
          where oid = 'public.admin_catalog_collection_next_orders(uuid[])'::regprocedure
        ),
        acldefault(
          'f',
          (
            select proowner
            from pg_proc
            where oid = 'public.admin_catalog_collection_next_orders(uuid[])'::regprocedure
          )
        )
      )
    )
    where grantee = 0 and privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute the admin collection aggregate'
);

select function_privs_are(
  'public',
  'admin_catalog_collection_next_orders',
  array['uuid[]'],
  'anon',
  array[]::text[],
  'anonymous clients cannot execute the admin collection aggregate'
);

select function_privs_are(
  'public',
  'admin_catalog_collection_next_orders',
  array['uuid[]'],
  'authenticated',
  array['EXECUTE'],
  'authenticated clients can invoke the admin-checked aggregate'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '02100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'collection-customer@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '02100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'collection-admin@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  ('02100000-0000-4000-8000-000000000001', 'collection-customer@example.test', 'en'),
  ('02100000-0000-4000-8000-000000000002', 'collection-admin@example.test', 'en');

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '02100000-0000-4000-8000-000000000002',
  'admin',
  '02100000-0000-4000-8000-000000000002',
  'collection ordering test admin'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '02100000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$select public.admin_catalog_collection_next_orders(array[]::uuid[])$$,
  '42501',
  'admin access required',
  'non-admin users cannot invoke the collection aggregate'
);

reset role;

insert into public.collections (id)
values
  ('22100000-0000-4000-8000-000000000001'),
  ('22100000-0000-4000-8000-000000000002'),
  ('22100000-0000-4000-8000-000000000003');

insert into public.products (id, product_type)
select
  md5('collection-order-product-' || value)::uuid,
  'physical_finished'
from generate_series(0, 1207) as series(value);

insert into public.collection_products (collection_id, product_id, display_order)
select
  '22100000-0000-4000-8000-000000000001',
  md5('collection-order-product-' || value)::uuid,
  value
from generate_series(0, 1204) as series(value);

insert into public.collection_products (collection_id, product_id, display_order)
values
  (
    '22100000-0000-4000-8000-000000000002',
    md5('collection-order-product-1205')::uuid,
    2
  ),
  (
    '22100000-0000-4000-8000-000000000002',
    md5('collection-order-product-1206')::uuid,
    10
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '02100000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$select public.admin_catalog_collection_next_orders(null)$$,
  '22023',
  'invalid target collection ids',
  'null request arrays fail with a stable invalid-argument error'
);

select throws_ok(
  $$select public.admin_catalog_collection_next_orders(
      array(select '22100000-0000-4000-8000-000000000001'::uuid from generate_series(1, 501))
    )$$,
  '22023',
  'invalid target collection ids',
  'oversized request arrays fail before deduplication'
);

select throws_ok(
  $$select public.admin_catalog_collection_next_orders(
      array['22100000-0000-4000-8000-000000000099'::uuid]
    )$$,
  '22023',
  'invalid target collection ids',
  'unknown collection ids reject the complete request'
);

select throws_ok(
  $$select public.admin_catalog_collection_next_orders(array[null]::uuid[])$$,
  '22023',
  'invalid target collection ids',
  'null elements reject the complete request'
);

select is_empty(
  $$select * from public.admin_catalog_collection_next_orders(array[]::uuid[])$$,
  'an explicit empty request returns no aggregate rows'
);

select results_eq(
  $$select collection_id, next_display_order
    from public.admin_catalog_collection_next_orders(
      array[
        '22100000-0000-4000-8000-000000000003'::uuid,
        '22100000-0000-4000-8000-000000000003'::uuid
      ]
    )$$,
  $$values ('22100000-0000-4000-8000-000000000003'::uuid, 0)$$,
  'duplicate empty-collection ids return one deterministic zero row'
);

select results_eq(
  $$select collection_id, next_display_order
    from public.admin_catalog_collection_next_orders(
      array[
        '22100000-0000-4000-8000-000000000002'::uuid,
        '22100000-0000-4000-8000-000000000001'::uuid,
        '22100000-0000-4000-8000-000000000003'::uuid
      ]
    )$$,
  $$values
    ('22100000-0000-4000-8000-000000000001'::uuid, 1205),
    ('22100000-0000-4000-8000-000000000002'::uuid, 11),
    ('22100000-0000-4000-8000-000000000003'::uuid, 0)$$,
  'each collection receives its independent PostgreSQL-computed next order'
);

select is(
  (
    select next_display_order
    from public.admin_catalog_collection_next_orders(
      array['22100000-0000-4000-8000-000000000001'::uuid]
    )
  ),
  1205,
  'the aggregate remains correct beyond the usual PostgREST row ceiling'
);

select is(
  (
    select next_display_order
    from public.admin_catalog_collection_next_orders(
      array['22100000-0000-4000-8000-000000000002'::uuid]
    )
  ),
  11,
  'sparse collection orders append after the maximum without compacting gaps'
);

select is(
  (
    select count(*)
    from public.collection_products
    where collection_id = '22100000-0000-4000-8000-000000000001'
  ),
  1205::bigint,
  'the aggregate does not mutate or renumber existing memberships'
);

select finish();

rollback;
