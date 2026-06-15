begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

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
    '00000000-0000-0000-0000-0000000003c1',
    'authenticated',
    'authenticated',
    'catalog-storage-customer@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-0000000003ad',
    'authenticated',
    'authenticated',
    'catalog-storage-admin@example.test',
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
    '00000000-0000-0000-0000-0000000003c1',
    'catalog-storage-customer@example.test',
    'vi'
  ),
  (
    '00000000-0000-0000-0000-0000000003ad',
    'catalog-storage-admin@example.test',
    'en'
  );

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '00000000-0000-0000-0000-0000000003ad',
  'admin',
  '00000000-0000-0000-0000-0000000003ad',
  'catalog storage test admin'
);

select ok(
  exists (
    select 1
    from storage.buckets as bucket
    where id = 'product-media'
      and name = 'product-media'
      and to_jsonb(bucket)->>'public' = 'true'
  ),
  'product-media bucket is public'
);

select ok(
  exists (
    select 1
    from storage.buckets as bucket
    where id = 'pattern-pdfs'
      and name = 'pattern-pdfs'
      and to_jsonb(bucket)->>'public' = 'false'
  ),
  'pattern-pdfs bucket is private'
);

select is(
  (
    select (to_jsonb(bucket)->>'file_size_limit')::integer
    from storage.buckets as bucket
    where id = 'product-media'
  ),
  10485760,
  'product-media bucket caps image uploads at 10 MiB'
);

select is(
  (
    select (to_jsonb(bucket)->>'file_size_limit')::integer
    from storage.buckets as bucket
    where id = 'pattern-pdfs'
  ),
  52428800,
  'pattern-pdfs bucket caps PDF uploads at 50 MiB'
);

select set_eq(
  $$select jsonb_array_elements_text(to_jsonb(bucket)->'allowed_mime_types')
    from storage.buckets as bucket
    where id = 'product-media'$$,
  $$values
      ('image/jpeg'),
      ('image/png'),
      ('image/webp'),
      ('image/gif')$$,
  'product-media bucket only allows safe raster image MIME types'
);

select set_eq(
  $$select jsonb_array_elements_text(to_jsonb(bucket)->'allowed_mime_types')
    from storage.buckets as bucket
    where id = 'pattern-pdfs'$$,
  $$values ('application/pdf')$$,
  'pattern-pdfs bucket only allows PDF files'
);

set local role anon;

select lives_ok(
  $$select id
    from storage.objects
    where bucket_id = 'product-media'$$,
  'anonymous users can read public product media object metadata'
);

select is_empty(
  $$select id
    from storage.objects
    where bucket_id = 'pattern-pdfs'$$,
  'anonymous users cannot read private PDF object metadata'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata)
    values ('product-media', 'products/anon/image.png', null, '{}'::jsonb)$$,
  '42501',
  null,
  'anonymous users cannot upload product media'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata)
    values ('pattern-pdfs', 'patterns/anon/pattern.pdf', null, '{}'::jsonb)$$,
  '42501',
  null,
  'anonymous users cannot upload pattern PDFs'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000003c1',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select id
    from storage.objects
    where bucket_id = 'product-media'$$,
  'customers can read public product media object metadata'
);

select is_empty(
  $$select id
    from storage.objects
    where bucket_id = 'pattern-pdfs'$$,
  'customers cannot read private PDF object metadata'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'product-media',
      'products/customer/image.png',
      '00000000-0000-0000-0000-0000000003c1',
      '{"mimetype":"image/png","size":128}'::jsonb
    )$$,
  '42501',
  null,
  'customers cannot upload product media'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'pattern-pdfs',
      'patterns/customer/pattern.pdf',
      '00000000-0000-0000-0000-0000000003c1',
      '{"mimetype":"application/pdf","size":128}'::jsonb
    )$$,
  '42501',
  null,
  'customers cannot upload pattern PDFs'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000003ad',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'product-media',
      'products/admin/image.png',
      '00000000-0000-0000-0000-0000000003ad',
      '{"mimetype":"image/png","size":128}'::jsonb
    )$$,
  'admins can upload product media'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'pattern-pdfs',
      'patterns/admin/pattern.pdf',
      '00000000-0000-0000-0000-0000000003ad',
      '{"mimetype":"application/pdf","size":128}'::jsonb
    )$$,
  'admins can upload pattern PDFs'
);

select throws_ok(
  $$delete from storage.objects
    where bucket_id = 'product-media'
      and name = 'products/admin/image.png'$$,
  '42501',
  null,
  'direct SQL delete for product media is blocked; admins must use Storage API'
);

select throws_ok(
  $$delete from storage.objects
    where bucket_id = 'pattern-pdfs'
      and name = 'patterns/admin/pattern.pdf'$$,
  '42501',
  null,
  'direct SQL delete for pattern PDFs is blocked; admins must use Storage API'
);

select finish();

rollback;
