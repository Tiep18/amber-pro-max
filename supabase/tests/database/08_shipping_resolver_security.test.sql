begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

select has_function(
  'private',
  'resolve_checkout_shipping_allocations_v2',
  array['jsonb', 'text', 'text', 'text'],
  'private canonical shipping resolver exists'
);

insert into public.shipping_profiles (id, name, active)
values
  ('08020000-0000-0000-0000-000000000001', 'Variant exact', true),
  ('08020000-0000-0000-0000-000000000002', 'Variant fallback', true),
  ('08020000-0000-0000-0000-000000000003', 'Product exact', true),
  ('08020000-0000-0000-0000-000000000004', 'Product fallback', true),
  ('08020000-0000-0000-0000-000000000005', 'Store default', true),
  ('08020000-0000-0000-0000-000000000006', 'Inactive profile', false);

insert into public.shipping_rules (
  id, profile_id, match_kind, country_code, currency_code,
  first_item_fee_minor, additional_item_fee_minor, active
)
values
  ('08021000-0000-0000-0000-000000000001', '08020000-0000-0000-0000-000000000001', 'fallback', null, 'USD', 9100, 910, true),
  ('08021000-0000-0000-0000-000000000002', '08020000-0000-0000-0000-000000000001', 'exact_country', 'US', 'USD', 1100, 110, true),
  ('08021000-0000-0000-0000-000000000003', '08020000-0000-0000-0000-000000000002', 'fallback', null, 'USD', 1200, 120, true),
  ('08021000-0000-0000-0000-000000000004', '08020000-0000-0000-0000-000000000003', 'fallback', null, 'USD', 9300, 930, true),
  ('08021000-0000-0000-0000-000000000005', '08020000-0000-0000-0000-000000000003', 'exact_country', 'US', 'USD', 1300, 130, true),
  ('08021000-0000-0000-0000-000000000006', '08020000-0000-0000-0000-000000000004', 'fallback', null, 'USD', 1400, 140, true),
  ('08021000-0000-0000-0000-000000000007', '08020000-0000-0000-0000-000000000005', 'fallback', null, 'USD', 1600, 160, true),
  ('08021000-0000-0000-0000-000000000008', '08020000-0000-0000-0000-000000000005', 'exact_country', 'US', 'USD', 1500, 150, true),
  ('08021000-0000-0000-0000-000000000009', '08020000-0000-0000-0000-000000000003', 'exact_country', 'US', 'VND', 999, 99, true),
  ('08021000-0000-0000-0000-000000000010', '08020000-0000-0000-0000-000000000003', 'exact_country', 'CA', 'USD', 1, 1, false),
  ('08021000-0000-0000-0000-000000000011', '08020000-0000-0000-0000-000000000006', 'exact_country', 'US', 'USD', 1, 1, true);

insert into public.shipping_region_adjustments (
  id, shipping_rule_id, country_code, region_code, mode,
  first_item_fee_minor, additional_item_fee_minor, active
)
values
  ('08022000-0000-0000-0000-000000000001', '08021000-0000-0000-0000-000000000005', 'US', 'CA', 'surcharge', 300, 30, true),
  ('08022000-0000-0000-0000-000000000002', '08021000-0000-0000-0000-000000000005', 'US', 'TX', 'replace', 700, 70, true),
  ('08022000-0000-0000-0000-000000000003', '08021000-0000-0000-0000-000000000005', 'US', 'AK', 'replace', 2, 2, false);

insert into public.products (id, product_type)
values
  ('08023000-0000-0000-0000-000000000001', 'physical_finished'),
  ('08023000-0000-0000-0000-000000000002', 'physical_finished'),
  ('08023000-0000-0000-0000-000000000003', 'physical_finished'),
  ('08023000-0000-0000-0000-000000000004', 'physical_finished');

insert into public.product_variants (id, product_id, sku, attributes)
values
  ('08024000-0000-0000-0000-000000000001', '08023000-0000-0000-0000-000000000001', 'P08-V-EXACT', '{"size":"exact"}'),
  ('08024000-0000-0000-0000-000000000002', '08023000-0000-0000-0000-000000000001', 'P08-V-FALLBACK', '{"size":"fallback"}');

insert into public.variant_shipping_profiles (variant_id, profile_id)
values
  ('08024000-0000-0000-0000-000000000001', '08020000-0000-0000-0000-000000000001'),
  ('08024000-0000-0000-0000-000000000002', '08020000-0000-0000-0000-000000000002');

insert into public.product_shipping_profiles (product_id, profile_id)
values
  ('08023000-0000-0000-0000-000000000002', '08020000-0000-0000-0000-000000000003'),
  ('08023000-0000-0000-0000-000000000003', '08020000-0000-0000-0000-000000000004');

insert into public.shipping_store_defaults (shipping_profile_id, active)
values ('08020000-0000-0000-0000-000000000005', true);

-- D-01..D-04 / SHIP-09: each branch wins with exact before fallback.
select is(
  public.get_checkout_shipping_quote_v2(
    '[{"lineId":"variant-exact","productId":"08023000-0000-0000-0000-000000000001","variantId":"08024000-0000-0000-0000-000000000001","quantity":1}]',
    'US', 'USD', null
  ) #>> '{allocations,0,source}',
  'variant',
  'variant exact wins before every lower source'
);
select is(
  public.get_checkout_shipping_quote_v2(
    '[{"lineId":"variant-fallback","productId":"08023000-0000-0000-0000-000000000001","variantId":"08024000-0000-0000-0000-000000000002","quantity":1}]',
    'US', 'USD', null
  ) #>> '{allocations,0,ruleMatchKind}',
  'fallback',
  'variant fallback wins before product and default sources'
);
select is(
  public.get_checkout_shipping_quote_v2(
    '[{"lineId":"product-exact","productId":"08023000-0000-0000-0000-000000000002","variantId":null,"quantity":1}]',
    'US', 'USD', null
  ) #>> '{allocations,0,shippingRuleId}',
  '08021000-0000-0000-0000-000000000005',
  'product exact wins before product fallback and default sources'
);
select is(
  public.get_checkout_shipping_quote_v2(
    '[{"lineId":"product-fallback","productId":"08023000-0000-0000-0000-000000000003","variantId":null,"quantity":1}]',
    'US', 'USD', null
  ) #>> '{allocations,0,ruleMatchKind}',
  'fallback',
  'product fallback wins before default sources'
);
select is(
  public.get_checkout_shipping_quote_v2(
    '[{"lineId":"default-exact","productId":"08023000-0000-0000-0000-000000000004","variantId":null,"quantity":1}]',
    'US', 'USD', null
  ) #>> '{allocations,0,shippingRuleId}',
  '08021000-0000-0000-0000-000000000008',
  'store-default exact wins before its fallback'
);
select is(
  public.get_checkout_shipping_quote_v2(
    '[{"lineId":"default-fallback","productId":"08023000-0000-0000-0000-000000000004","variantId":null,"quantity":1}]',
    'CA', 'USD', null
  ) #>> '{allocations,0,shippingRuleId}',
  '08021000-0000-0000-0000-000000000007',
  'store-default fallback is the final eligible branch'
);

select is(
  (public.get_checkout_shipping_quote_v2(
    '[{"lineId":"ca","productId":"08023000-0000-0000-0000-000000000002","variantId":null,"quantity":1}]',
    'US', 'USD', ' ca '
  ) #>> '{allocations,0,finalFirstItemFeeMinor}')::integer,
  1600,
  'normalized CA surcharge adds to the first-item fee'
);
select is(
  (public.get_checkout_shipping_quote_v2(
    '[{"lineId":"ca","productId":"08023000-0000-0000-0000-000000000002","variantId":null,"quantity":1}]',
    'US', 'USD', 'CA'
  ) #>> '{allocations,0,finalAdditionalItemFeeMinor}')::integer,
  160,
  'normalized CA surcharge adds to the additional-item fee'
);
select results_eq(
  $$select
      (quote #>> '{allocations,0,finalFirstItemFeeMinor}')::integer,
      (quote #>> '{allocations,0,finalAdditionalItemFeeMinor}')::integer
    from (select public.get_checkout_shipping_quote_v2(
      '[{"lineId":"tx","productId":"08023000-0000-0000-0000-000000000002","variantId":null,"quantity":1}]',
      'US', 'USD', 'TX'
    ) quote) q$$,
  $$values (700, 70)$$,
  'TX replacement substitutes both base fees'
);
select is(
  public.get_checkout_shipping_quote_v2(
    '[{"lineId":"ak","productId":"08023000-0000-0000-0000-000000000002","variantId":null,"quantity":1}]',
    'US', 'USD', 'AK'
  ) #>> '{allocations,0,regionAdjustmentId}',
  null,
  'inactive or nonmatching adjustments leave the base rule unchanged'
);

update public.shipping_store_defaults set active = false where active;
update public.shipping_rules set active = false where profile_id = '08020000-0000-0000-0000-000000000003';
select is(
  public.get_checkout_shipping_quote_v2(
    '[{"lineId":"unsupported-z","productId":"08023000-0000-0000-0000-000000000002","variantId":null,"quantity":1}]',
    'CA', 'USD', null
  ) ->> 'status',
  'error',
  'unsupported physical lines fail closed'
);
update public.shipping_store_defaults set active = true where shipping_profile_id = '08020000-0000-0000-0000-000000000005';
update public.shipping_rules set active = true where profile_id = '08020000-0000-0000-0000-000000000003' and id <> '08021000-0000-0000-0000-000000000010';
select is(
  public.get_checkout_shipping_quote_v2('[]', 'US', 'USD', null) ->> 'code',
  'invalid_lines',
  'empty line intent receives an allowlisted validation code'
);
select is(
  public.get_checkout_shipping_quote_v2('[{"lineId":"x","productId":"bad","quantity":1}]', 'US', 'USD', null) ->> 'code',
  'invalid_lines',
  'malformed line intent receives an allowlisted validation code'
);
select is(
  public.get_checkout_shipping_quote_v2('[{"lineId":"x","productId":"08023000-0000-0000-0000-000000000004","quantity":1,"firstItemFeeMinor":0,"profileId":"forged"}]', 'USA', 'USD', null) ->> 'code',
  'invalid_country',
  'malformed destination returns no SQL details or trusted browser fee fields'
);

-- T-08-02-PRIV: metadata and actual invocation prove wrapper-only browser access.
select ok(
  not exists (
    select 1
    from aclexplode(coalesce(
      (select proacl from pg_proc where oid = to_regprocedure('private.resolve_checkout_shipping_allocations_v2(jsonb,text,text,text)')),
      acldefault('f', coalesce(
        (select proowner from pg_proc where oid = to_regprocedure('private.resolve_checkout_shipping_allocations_v2(jsonb,text,text,text)')),
        (select oid from pg_roles where rolname = current_user)
      ))
    ))
    where grantee = 0 and privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no execute privilege on the private resolver'
);
select is(
  coalesce(has_function_privilege('anon', to_regprocedure('private.resolve_checkout_shipping_allocations_v2(jsonb,text,text,text)'), 'EXECUTE'), false),
  false,
  'anon has no direct private resolver execute privilege'
);
select is(
  coalesce(has_function_privilege('authenticated', to_regprocedure('private.resolve_checkout_shipping_allocations_v2(jsonb,text,text,text)'), 'EXECUTE'), false),
  false,
  'authenticated has no direct private resolver execute privilege'
);
select is(
  coalesce(has_function_privilege('service_role', to_regprocedure('private.resolve_checkout_shipping_allocations_v2(jsonb,text,text,text)'), 'EXECUTE'), false),
  true,
  'service_role has the least-privilege direct resolver path'
);
select is(
  (select prosecdef from pg_proc where oid = to_regprocedure('private.resolve_checkout_shipping_allocations_v2(jsonb,text,text,text)')),
  false,
  'private resolver is security invoker'
);
select is(
  (select proconfig::text from pg_proc where oid = 'public.get_checkout_shipping_quote_v2(jsonb,text,text,text)'::regprocedure),
  '{"search_path=public, pg_temp"}',
  'public wrapper fixes search_path'
);

set local role anon;
select throws_ok(
  $$select private.resolve_checkout_shipping_allocations_v2('[]', 'US', 'USD', null)$$,
  '42501', null,
  'anon direct private resolver calls are denied'
);
select lives_ok(
  $$select public.get_checkout_shipping_quote_v2(
    '[{"lineId":"anon-default","productId":"08023000-0000-0000-0000-000000000004","variantId":null,"quantity":1}]',
    'US', 'USD', null
  )$$,
  'anon can call the hardened public wrapper'
);

reset role;
set local role authenticated;
select throws_ok(
  $$select private.resolve_checkout_shipping_allocations_v2('[]', 'US', 'USD', null)$$,
  '42501', null,
  'authenticated direct private resolver calls are denied'
);
select lives_ok(
  $$select public.get_checkout_shipping_quote_v2(
    '[{"lineId":"authenticated-default","productId":"08023000-0000-0000-0000-000000000004","variantId":null,"quantity":1}]',
    'US', 'USD', null
  )$$,
  'authenticated can call the hardened public wrapper'
);

reset role;
set local role service_role;
select lives_ok(
  $$select private.resolve_checkout_shipping_allocations_v2(
    '[{"lineId":"service-default","productId":"08023000-0000-0000-0000-000000000004","variantId":null,"quantity":1}]',
    'US', 'USD', null
  )$$,
  'service_role can call the private resolver directly'
);

reset role;
select results_eq(
  $$select key from jsonb_object_keys(public.get_checkout_shipping_quote_v2(
      '[{"lineId":"contract","productId":"08023000-0000-0000-0000-000000000004","variantId":null,"quantity":1}]',
      'US', 'USD', null
    )) key order by key$$,
  $$values ('allocations'::text), ('countryCode'::text), ('currencyCode'::text), ('regionCode'::text), ('status'::text), ('version'::text)$$,
  'wrapper returns only the constrained top-level JSON contract'
);

select * from finish();

rollback;
