begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_function('public', 'admin_reorder_product_media', array['uuid', 'uuid[]'], 'atomic reorder function exists');
select function_returns('public', 'admin_reorder_product_media', array['uuid', 'uuid[]'], 'void', 'reorder returns void');
select is((select prosecdef from pg_proc where oid = 'public.admin_reorder_product_media(uuid,uuid[])'::regprocedure), true, 'reorder is security definer');
select ok((select proconfig::text like '%search_path=public, private, pg_temp%' from pg_proc where oid = 'public.admin_reorder_product_media(uuid,uuid[])'::regprocedure), 'reorder fixes its search path');
select function_privs_are('public', 'admin_reorder_product_media', array['uuid', 'uuid[]'], 'anon', array[]::text[], 'anon cannot reorder');
select function_privs_are('public', 'admin_reorder_product_media', array['uuid', 'uuid[]'], 'authenticated', array['EXECUTE'], 'authenticated may invoke the guarded RPC');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'media-admin@example.test', '', now(), now(), now()),
  ('91000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'media-user@example.test', '', now(), now(), now());
insert into public.user_roles (user_id, role) values ('91000000-0000-4000-8000-000000000001', 'admin');
insert into public.products (id, product_type) values
  ('92000000-0000-4000-8000-000000000001', 'physical_finished'),
  ('92000000-0000-4000-8000-000000000002', 'physical_finished');
insert into public.product_media (id, product_id, bucket_id, object_path, display_order, is_primary) values
  ('93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'product-media', 'reorder/a.png', 0, true),
  ('93000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', 'product-media', 'reorder/b.png', 1, false),
  ('93000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000001', 'product-media', 'reorder/c.png', 2, false),
  ('93000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000002', 'product-media', 'reorder/foreign.png', 0, true);

set local role authenticated;
set local request.jwt.claim.sub = '91000000-0000-4000-8000-000000000002';
select throws_ok($$select public.admin_reorder_product_media('92000000-0000-4000-8000-000000000001', array['93000000-0000-4000-8000-000000000003']::uuid[])$$, '42501', null, 'non-admin is denied');

set local request.jwt.claim.sub = '91000000-0000-4000-8000-000000000001';
select throws_ok($$select public.admin_reorder_product_media('92000000-0000-4000-8000-000000000001', array['93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000003']::uuid[])$$, 'P2003', null, 'duplicates are rejected');
select throws_ok($$select public.admin_reorder_product_media('92000000-0000-4000-8000-000000000001', array['93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000004']::uuid[])$$, 'P2003', null, 'cross-product ids are rejected');
select results_eq($$select id from public.product_media where product_id = '92000000-0000-4000-8000-000000000001' order by display_order$$, $$values ('93000000-0000-4000-8000-000000000001'::uuid),('93000000-0000-4000-8000-000000000002'::uuid),('93000000-0000-4000-8000-000000000003'::uuid)$$, 'invalid calls leave order unchanged');
select lives_ok($$select public.admin_reorder_product_media('92000000-0000-4000-8000-000000000001', array['93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002']::uuid[])$$, 'an exact permutation succeeds');
select results_eq($$select id, display_order from public.product_media where product_id = '92000000-0000-4000-8000-000000000001' order by display_order$$, $$values ('93000000-0000-4000-8000-000000000003'::uuid,0),('93000000-0000-4000-8000-000000000001'::uuid,1),('93000000-0000-4000-8000-000000000002'::uuid,2)$$, 'valid reorder is contiguous and exact');

select finish();
rollback;
