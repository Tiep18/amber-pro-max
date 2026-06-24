begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select has_table('public', 'launch_settings', 'launch settings table exists');
select col_is_pk('public', 'launch_settings', 'singleton_id', 'launch settings use singleton primary key');
select has_column('public', 'launch_settings', 'enabled_country_codes', 'enabled countries column exists');
select has_column('public', 'launch_settings', 'tax_stance', 'tax stance column exists');
select has_column('public', 'launch_settings', 'monitoring_ready', 'monitoring readiness column exists');
select has_column('public', 'launch_settings', 'redaction_ready', 'redaction readiness column exists');
select has_function('public', 'list_published_required_policy_links', array['text'], 'published policy links projection exists');

select is(
  (select count(*)::integer from public.launch_settings),
  1,
  'launch settings seed one singleton row'
);

select is(
  (
    select monitoring_ready or redaction_ready or cardinality(enabled_country_codes) > 0
    from public.launch_settings
  ),
  false,
  'default launch settings fail closed'
);

select isnt(
  has_table_privilege('anon', 'public.launch_settings', 'select'),
  true,
  'anonymous users cannot select launch settings'
);

select ok(
  has_table_privilege('authenticated', 'public.launch_settings', 'update'),
  'authenticated role has launch settings grant gated by RLS'
);

select ok(
  has_function_privilege('anon', 'public.list_published_required_policy_links(text)', 'execute'),
  'anonymous users can execute safe published policy link projection'
);

select * from finish();

rollback;
