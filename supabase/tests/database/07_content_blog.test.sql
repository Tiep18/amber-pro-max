begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

select has_table('public', 'blog_posts', 'blog posts table exists');
select has_table('public', 'blog_post_translations', 'blog translations table exists');
select has_table('public', 'blog_categories', 'blog categories table exists');
select has_table('public', 'blog_tags', 'blog tags table exists');
select has_table('public', 'blog_related_products', 'blog related products table exists');
select has_function(
  'public',
  'blog_publish_issues',
  array['uuid'],
  'blog publish issue function exists'
);
select has_function(
  'public',
  'publish_blog_post',
  array['uuid', 'timestamp with time zone'],
  'blog publish function exists'
);

insert into public.blog_posts (id)
values ('70000000-0000-0000-0000-000000000001');

select results_eq(
  $$select issue_code
    from public.blog_publish_issues(
      '70000000-0000-0000-0000-000000000001'
    )
    order by issue_code, locale nulls first$$,
  $$values
    ('missing_category'::text),
    ('missing_translation'::text),
    ('missing_translation'::text)$$,
  'draft blog post reports missing category and bilingual translations'
);

insert into public.blog_categories (id)
values ('71000000-0000-0000-0000-000000000001');

insert into public.blog_category_translations (
  category_id,
  locale,
  slug,
  name
)
values
  ('71000000-0000-0000-0000-000000000001', 'vi', 'huong-dan', 'Huong dan'),
  ('71000000-0000-0000-0000-000000000001', 'en', 'guides', 'Guides');

update public.blog_posts
set category_id = '71000000-0000-0000-0000-000000000001'
where id = '70000000-0000-0000-0000-000000000001';

insert into public.blog_post_translations (
  post_id,
  locale,
  slug,
  title,
  description,
  body,
  social_image_bucket,
  social_image_path
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    'vi',
    'moc-gau-nho',
    'Moc gau nho',
    'Huong dan moc gau nho.',
    'Noi dung.',
    'blog-media',
    'blog/moc-gau-nho.jpg'
  ),
  (
    '70000000-0000-0000-0000-000000000001',
    'en',
    'crochet-small-bear',
    'Crochet a small bear',
    'Guide to crochet a small bear.',
    'Body.',
    'blog-media',
    'blog/crochet-small-bear.jpg'
  );

select is_empty(
  $$select *
    from public.blog_publish_issues(
      '70000000-0000-0000-0000-000000000001'
    )$$,
  'complete bilingual categorized blog post has no publish issues'
);

select results_eq(
  $$select published
    from public.publish_blog_post(
      '70000000-0000-0000-0000-000000000001',
      now() - interval '1 hour'
    )$$,
  $$values (true)$$,
  'publish function publishes a complete blog post'
);

select is(
  (
    select count(*)::integer
    from public.list_published_blog_posts('en')
    where slug = 'crochet-small-bear'
  ),
  1,
  'published posts with published_at <= now appear in public projections'
);

update public.blog_posts
set published_at = now() + interval '1 day'
where id = '70000000-0000-0000-0000-000000000001';

select is(
  (
    select count(*)::integer
    from public.list_published_blog_posts('en')
    where slug = 'crochet-small-bear'
  ),
  0,
  'future scheduled posts do not appear in public projections'
);

select lives_ok(
  $$insert into public.blog_tags default values$$,
  'tags are optional supporting taxonomy'
);

insert into public.products (id, product_type)
values ('72000000-0000-0000-0000-000000000001', 'pdf_pattern');

select lives_ok(
  $$insert into public.blog_related_products (
      post_id,
      product_id,
      display_order
    ) values (
      '70000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      0
    )$$,
  'blog posts can link optional related products'
);

select is_empty(
  $$select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'blog_categories',
        'blog_category_translations',
        'blog_tags',
        'blog_tag_translations',
        'blog_posts',
        'blog_post_translations',
        'blog_post_tags',
        'blog_related_products'
      ])
      and not c.relrowsecurity$$,
  'all blog base tables enable row level security'
);

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
    '00000000-0000-0000-0000-0000000007c1',
    'authenticated',
    'authenticated',
    'blog-customer@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-0000000007ad',
    'authenticated',
    'authenticated',
    'blog-admin@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  ('00000000-0000-0000-0000-0000000007c1', 'blog-customer@example.test', 'vi'),
  ('00000000-0000-0000-0000-0000000007ad', 'blog-admin@example.test', 'en');

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '00000000-0000-0000-0000-0000000007ad',
  'admin',
  '00000000-0000-0000-0000-0000000007ad',
  'blog test admin'
);

set local role anon;

select throws_ok(
  $$select * from public.blog_posts$$,
  '42501',
  null,
  'anonymous users cannot inspect blog base rows'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000007c1',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.blog_posts),
  0,
  'customers cannot inspect blog base rows'
);

select throws_ok(
  $$insert into public.blog_posts default values$$,
  '42501',
  null,
  'customers cannot mutate blog rows'
);

select throws_ok(
  $$select * from public.blog_publish_issues(
      '70000000-0000-0000-0000-000000000001'
    )$$,
  'P0002',
  null,
  'customers cannot inspect blog publish issues through hidden base rows'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-0000000007ad',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::integer
    from public.blog_posts
    where id = '70000000-0000-0000-0000-000000000001'
  ),
  1,
  'database-owned admins can inspect blog base rows'
);

select lives_ok(
  $$insert into public.blog_posts (id)
    values ('70000000-0000-0000-0000-000000000099')$$,
  'database-owned admins can mutate blog rows'
);

select isnt_empty(
  $$select * from public.blog_publish_issues(
      '70000000-0000-0000-0000-000000000099'
    )$$,
  'database-owned admins can inspect blog publish issues'
);

select is(
  (
    select proconfig::text
    from pg_proc
    where oid = 'public.publish_blog_post(uuid,timestamp with time zone)'::regprocedure
  ),
  '{"search_path=public, private, pg_temp"}',
  'publish function fixes search_path'
);

select finish();

rollback;
