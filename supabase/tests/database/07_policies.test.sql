begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select has_table('public', 'policy_pages', 'policy pages table exists');
select has_table('public', 'policy_page_translations', 'policy translations table exists');
select has_function('public', 'policy_publish_issues', array['uuid'], 'policy publish issues function exists');
select has_function('public', 'publish_policy_page', array['uuid'], 'policy publish function exists');
select has_function('public', 'get_published_policy_page_by_slug', array['text', 'text'], 'public policy projection function exists');

insert into public.policy_pages (id, policy_kind)
values ('78000000-0000-0000-0000-000000000001', 'privacy');

select results_eq(
  $$select issue_code
    from public.policy_publish_issues('78000000-0000-0000-0000-000000000001')
    order by issue_code, locale$$,
  $$values ('missing_translation'::text), ('missing_translation'::text)$$,
  'draft policy reports missing bilingual translations'
);

insert into public.policy_page_translations (
  policy_id,
  locale,
  slug,
  title,
  summary,
  body,
  seo_title,
  seo_description,
  social_image_bucket,
  social_image_path
)
values
  (
    '78000000-0000-0000-0000-000000000001',
    'vi',
    'chinh-sach-rieng-tu',
    'Chinh sach rieng tu',
    'Tom tat chinh sach rieng tu.',
    'Noi dung chinh sach rieng tu.',
    'Chinh sach rieng tu',
    'Thong tin ve quyen rieng tu.',
    'policy-media',
    'policy/privacy-vi.jpg'
  ),
  (
    '78000000-0000-0000-0000-000000000001',
    'en',
    'privacy-policy',
    'Privacy policy',
    'Privacy policy summary.',
    'Privacy policy body.',
    'Privacy policy',
    'How customer privacy is handled.',
    'policy-media',
    'policy/privacy-en.jpg'
  );

select is_empty(
  $$select * from public.policy_publish_issues('78000000-0000-0000-0000-000000000001')$$,
  'complete bilingual policy has no publish issues'
);

select is_empty(
  $$select *
    from public.get_published_policy_page_by_slug('en', 'privacy-policy')$$,
  'draft policy is excluded from public projection'
);

update public.policy_pages
set status = 'published',
    published_at = now()
where id = '78000000-0000-0000-0000-000000000001';

select is(
  (
    select status
    from public.policy_pages
    where id = '78000000-0000-0000-0000-000000000001'
  ),
  'published',
  'complete policy can enter published state'
);

select is(
  (
    select title
    from public.get_published_policy_page_by_slug('en', 'privacy-policy')
  ),
  'Privacy policy',
  'published policy appears in public projection'
);

select is(
  (
    select localized_slugs->>'vi'
    from public.get_published_policy_page_by_slug('en', 'privacy-policy')
  ),
  'chinh-sach-rieng-tu',
  'public projection includes localized slugs'
);

update public.policy_pages
set status = 'draft',
    published_at = null
where id = '78000000-0000-0000-0000-000000000001';

select is_empty(
  $$select *
    from public.get_published_policy_page_by_slug('en', 'privacy-policy')$$,
  'unpublished policy is excluded from public projection'
);

select isnt(
  has_table_privilege('anon', 'public.policy_pages', 'select'),
  true,
  'anonymous users cannot select policy base table'
);

select ok(
  has_function_privilege('anon', 'public.get_published_policy_page_by_slug(text,text)', 'execute'),
  'anonymous users can execute safe public policy projection'
);

select isnt(
  has_table_privilege('anon', 'public.policy_page_translations', 'select'),
  true,
  'anonymous users cannot select policy translation base table'
);

select ok(
  has_table_privilege('service_role', 'public.policy_pages', 'insert'),
  'service role can seed policy fixtures'
);

select * from finish();

rollback;
