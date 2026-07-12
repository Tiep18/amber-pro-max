begin;

create extension if not exists pgtap with schema extensions;

select plan(53);

-- D-03 / SHIP-07: defaults are explicit and the migration never nominates one.
select has_table('public', 'shipping_store_defaults', 'shipping store defaults exist');
select is(
  (select count(*)::integer from public.shipping_store_defaults),
  0,
  'no existing profile is selected as default'
);
select has_index('public', 'shipping_store_defaults', 'shipping_store_defaults_one_active_idx', 'only one active store default is indexed');
select has_function('public', 'admin_set_shipping_store_default', array['uuid'], 'atomic default replacement RPC exists');

-- D-02 / D-04 / SHIP-08: deterministic fixtures represent legacy exact rows.
insert into public.shipping_profiles (id, name, description, active)
values
  ('08010000-0000-0000-0000-000000000001', 'Phase 8 US exact', 'compatibility fixture', true),
  ('08010000-0000-0000-0000-000000000002', 'Phase 8 VN exact', 'compatibility fixture', true),
  ('08010000-0000-0000-0000-000000000003', 'Phase 8 inactive', 'default rejection fixture', false);

insert into public.shipping_rules (
  id,
  profile_id,
  country_code,
  currency_code,
  first_item_fee_minor,
  additional_item_fee_minor,
  active
)
values
  ('08011000-0000-0000-0000-000000000001', '08010000-0000-0000-0000-000000000001', 'US', 'USD', 1200, 350, true),
  ('08011000-0000-0000-0000-000000000002', '08010000-0000-0000-0000-000000000002', 'VN', 'VND', 45000, 12000, false);

create temporary table phase8_exact_snapshot as
select id, profile_id, country_code, currency_code, first_item_fee_minor, additional_item_fee_minor, active
from public.shipping_rules
where id in (
  '08011000-0000-0000-0000-000000000001',
  '08011000-0000-0000-0000-000000000002'
)
order by id;

select has_column('public', 'shipping_rules', 'match_kind', 'shipping rules expose an explicit match kind');
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.shipping_rules'::regclass and conname = 'shipping_rules_match_kind_check'),
  'rule match kind is constrained'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.shipping_rules'::regclass and conname = 'shipping_rules_destination_shape_check'),
  'exact and fallback shapes are unambiguous'
);
select has_index('public', 'shipping_rules', 'shipping_rules_exact_unique_idx', 'exact rules remain unique by profile/country/currency');
select has_index('public', 'shipping_rules', 'shipping_rules_fallback_unique_idx', 'fallback rules are unique by profile/currency');
select has_index('public', 'shipping_rules', 'shipping_rules_active_resolution_idx', 'active resolution lookup is indexed');

select is(
  (select count(*)::integer from public.shipping_rules where match_kind = 'fallback'),
  0,
  'migration synthesizes no fallback rules'
);
select results_eq(
  $$select id, profile_id, country_code, currency_code, first_item_fee_minor, additional_item_fee_minor, active
    from public.shipping_rules
    where id in ('08011000-0000-0000-0000-000000000001', '08011000-0000-0000-0000-000000000002')
    order by id$$,
  $$select id, profile_id, country_code, currency_code, first_item_fee_minor, additional_item_fee_minor, active
    from phase8_exact_snapshot order by id$$,
  'existing exact IDs, profiles, countries, currencies, integer fees, and active flags remain byte-for-byte equal'
);

select lives_ok(
  $$insert into public.shipping_rules (
      id, profile_id, match_kind, country_code, currency_code,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08011000-0000-0000-0000-000000000003',
      '08010000-0000-0000-0000-000000000001',
      'fallback', null, 'USD', 1800, 500
    )$$,
  'one explicit fallback per profile and currency is accepted'
);
select throws_ok(
  $$insert into public.shipping_rules (
      id, profile_id, match_kind, country_code, currency_code,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08011000-0000-0000-0000-000000000004',
      '08010000-0000-0000-0000-000000000001',
      'fallback', null, 'USD', 1900, 600
    )$$,
  '23505', null,
  'a second fallback for one profile and currency is rejected'
);
select throws_ok(
  $$insert into public.shipping_rules (
      profile_id, match_kind, country_code, currency_code,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08010000-0000-0000-0000-000000000001',
      'fallback', 'CA', 'VND', 1, 1
    )$$,
  '23514', null,
  'fallback rules cannot carry a country code'
);
select throws_ok(
  $$insert into public.shipping_rules (
      profile_id, match_kind, country_code, currency_code,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08010000-0000-0000-0000-000000000001',
      'exact_country', null, 'VND', 1, 1
    )$$,
  '23514', null,
  'exact rules require a country code'
);
select throws_ok(
  $$insert into public.shipping_rules (
      profile_id, match_kind, country_code, currency_code,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08010000-0000-0000-0000-000000000001',
      'exact_country', 'usa', 'VND', 1, 1
    )$$,
  '23514', null,
  'exact country codes must be normalized uppercase two-letter values'
);

select lives_ok(
  $$insert into public.shipping_store_defaults (shipping_profile_id, active)
    values ('08010000-0000-0000-0000-000000000001', true)$$,
  'one explicitly selected active default is accepted'
);
select throws_ok(
  $$insert into public.shipping_store_defaults (shipping_profile_id, active)
    values ('08010000-0000-0000-0000-000000000002', true)$$,
  '23505', null,
  'a second active default is rejected'
);
select throws_ok(
  $$insert into public.shipping_store_defaults (shipping_profile_id, active)
    values ('08010000-0000-0000-0000-000000000003', true)$$,
  '23514', null,
  'an inactive profile cannot become the active default'
);

-- D-05 / D-06 / SHIP-10: normalized generic region adjustments.
select has_table('public', 'shipping_region_adjustments', 'shipping region adjustments exist');
select col_is_fk('public', 'shipping_region_adjustments', 'shipping_rule_id', 'region adjustment references its parent rule');
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.shipping_region_adjustments'::regclass and conname = 'shipping_region_adjustments_country_code_check'),
  'region countries are normalized'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.shipping_region_adjustments'::regclass and conname = 'shipping_region_adjustments_region_code_check'),
  'region codes are normalized'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.shipping_region_adjustments'::regclass and conname = 'shipping_region_adjustments_mode_check'),
  'region mode is surcharge or replace'
);
select has_index('public', 'shipping_region_adjustments', 'shipping_region_adjustments_one_active_idx', 'active region membership is unique');
select lives_ok(
  $$insert into public.shipping_region_adjustments (
      id, shipping_rule_id, country_code, region_code, mode,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08012000-0000-0000-0000-000000000001',
      '08011000-0000-0000-0000-000000000001',
      'US', 'AK', 'surcharge', 500, 200
    )$$,
  'a normalized surcharge is accepted'
);
select throws_ok(
  $$insert into public.shipping_region_adjustments (
      shipping_rule_id, country_code, region_code, mode,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08011000-0000-0000-0000-000000000001',
      'us', 'AK', 'surcharge', 1, 1
    )$$,
  '23514', null,
  'lowercase region country is rejected'
);
select throws_ok(
  $$insert into public.shipping_region_adjustments (
      shipping_rule_id, country_code, region_code, mode,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08011000-0000-0000-0000-000000000001',
      'US', 'alaska', 'surcharge', 1, 1
    )$$,
  '23514', null,
  'malformed region code is rejected'
);
select throws_ok(
  $$insert into public.shipping_region_adjustments (
      shipping_rule_id, country_code, region_code, mode,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08011000-0000-0000-0000-000000000001',
      'US', 'HI', 'discount', 1, 1
    )$$,
  '23514', null,
  'unknown region mode is rejected'
);
select throws_ok(
  $$insert into public.shipping_region_adjustments (
      shipping_rule_id, country_code, region_code, mode,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08011000-0000-0000-0000-000000000001',
      'US', 'HI', 'replace', -1, 1
    )$$,
  '23514', null,
  'negative region amounts are rejected'
);
select throws_ok(
  $$insert into public.shipping_region_adjustments (
      shipping_rule_id, country_code, region_code, mode,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08011000-0000-0000-0000-000000000001',
      'US', 'AK', 'replace', 2000, 700
    )$$,
  '23505', null,
  'duplicate active adjustment membership is rejected'
);
select throws_ok(
  $$insert into public.shipping_region_adjustments (
      shipping_rule_id, country_code, region_code, mode,
      first_item_fee_minor, additional_item_fee_minor
    ) values (
      '08011000-0000-0000-0000-000000000001',
      'CA', 'BC', 'replace', 2000, 700
    )$$,
  '23514', null,
  'an exact rule cannot own an adjustment for another country'
);

-- T-08-01 / T-08-02: private configuration, fixed paths, and least privilege.
select policies_are('public', 'shipping_store_defaults', array['shipping store defaults are admin managed'], 'defaults expose only the admin policy');
select policies_are('public', 'shipping_region_adjustments', array['shipping region adjustments are admin managed'], 'regions expose only the admin policy');
select table_privs_are('public', 'shipping_store_defaults', 'anon', array[]::text[], 'anon has no defaults table grants');
select table_privs_are('public', 'shipping_region_adjustments', 'anon', array[]::text[], 'anon has no region table grants');
select table_privs_are('public', 'shipping_store_defaults', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'authenticated access is RLS constrained');
select table_privs_are('public', 'shipping_region_adjustments', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'authenticated region access is RLS constrained');
select table_privs_are('public', 'shipping_store_defaults', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'service role default grants are explicit');
select table_privs_are('public', 'shipping_region_adjustments', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'service role region grants are explicit');
select function_privs_are('public', 'admin_set_shipping_store_default', array['uuid'], 'anon', array[]::text[], 'anon cannot replace the default');
select function_privs_are('public', 'admin_set_shipping_store_default', array['uuid'], 'authenticated', array['EXECUTE'], 'authenticated may call the admin-checked default RPC');
select function_privs_are('public', 'get_checkout_shipping_quote_v2', array['jsonb', 'text', 'text', 'text'], 'anon', array['EXECUTE'], 'anon may call only the constrained quote wrapper');
select function_privs_are('public', 'get_checkout_shipping_quote_v2', array['jsonb', 'text', 'text', 'text'], 'authenticated', array['EXECUTE'], 'authenticated may call only the constrained quote wrapper');
select is(
  (select proconfig::text from pg_proc where oid = 'public.admin_set_shipping_store_default(uuid)'::regprocedure),
  '{"search_path=public, private, pg_temp"}',
  'default replacement fixes search_path'
);
select is(
  (select proconfig::text from pg_proc where oid = 'public.get_checkout_shipping_quote_v2(jsonb,text,text,text)'::regprocedure),
  '{"search_path=public, pg_temp"}',
  'quote wrapper fixes search_path'
);
select results_eq(
  $$select status, code
    from jsonb_to_record(public.get_checkout_shipping_quote_v2('[]'::jsonb, 'US', 'USD', 'CA'))
      as r(status text, code text)$$,
  $$values ('error'::text, 'invalid_lines'::text)$$,
  'quote wrapper rejects empty line intent after Plan 08-02 installs the resolver'
);

set local role anon;
select throws_ok(
  $$select * from public.shipping_store_defaults$$,
  '42501', null,
  'anon cannot directly read shipping defaults'
);
select throws_ok(
  $$select * from public.shipping_region_adjustments$$,
  '42501', null,
  'anon cannot directly read region configuration'
);
select lives_ok(
  $$select public.get_checkout_shipping_quote_v2('[]'::jsonb, 'US', 'USD', null)$$,
  'anon can invoke only the constrained fail-closed quote wrapper'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '08010000-0000-0000-0000-000000000099', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*)::integer from public.shipping_store_defaults),
  0,
  'non-admin authenticated callers cannot directly read shipping defaults'
);
select throws_ok(
  $$select public.admin_set_shipping_store_default('08010000-0000-0000-0000-000000000002')$$,
  '42501', null,
  'non-admin authenticated callers cannot replace the store default'
);
reset role;

select * from finish();

rollback;
