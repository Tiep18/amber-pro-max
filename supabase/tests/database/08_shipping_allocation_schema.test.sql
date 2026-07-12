begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

-- D-09 / SHIP-12: one complete immutable allocation row per physical order line.
select has_table('public', 'checkout_order_shipping_allocations', 'shipping allocation evidence exists');
select col_is_fk('public', 'checkout_order_shipping_allocations', 'order_id', 'allocation references its order');
select col_is_fk('public', 'checkout_order_shipping_allocations', 'order_line_id', 'allocation references its order line');
select col_is_fk('public', 'checkout_order_shipping_allocations', 'shipping_profile_id', 'allocation references its selected profile');
select col_is_fk('public', 'checkout_order_shipping_allocations', 'shipping_rule_id', 'allocation references its selected rule');
select col_is_fk('public', 'checkout_order_shipping_allocations', 'region_adjustment_id', 'allocation optionally references its selected region adjustment');

select col_type_is('public', 'checkout_order_shipping_allocations', 'source_tier', 'text', 'allocation snapshots source tier');
select col_type_is('public', 'checkout_order_shipping_allocations', 'profile_name', 'text', 'allocation snapshots profile name');
select col_type_is('public', 'checkout_order_shipping_allocations', 'rule_match_kind', 'text', 'allocation snapshots rule match kind');
select col_type_is('public', 'checkout_order_shipping_allocations', 'destination_country_code', 'text', 'allocation snapshots destination');
select col_type_is('public', 'checkout_order_shipping_allocations', 'currency_code', 'text', 'allocation snapshots currency');
select col_type_is('public', 'checkout_order_shipping_allocations', 'base_first_item_fee_minor', 'integer', 'allocation snapshots base first fee');
select col_type_is('public', 'checkout_order_shipping_allocations', 'base_additional_item_fee_minor', 'integer', 'allocation snapshots base additional fee');
select col_type_is('public', 'checkout_order_shipping_allocations', 'region_code', 'text', 'allocation snapshots region code');
select col_type_is('public', 'checkout_order_shipping_allocations', 'region_mode', 'text', 'allocation snapshots region mode');
select col_type_is('public', 'checkout_order_shipping_allocations', 'region_first_item_fee_minor', 'integer', 'allocation snapshots region first amount');
select col_type_is('public', 'checkout_order_shipping_allocations', 'region_additional_item_fee_minor', 'integer', 'allocation snapshots region additional amount');
select col_type_is('public', 'checkout_order_shipping_allocations', 'final_first_item_fee_minor', 'integer', 'allocation snapshots final first fee');
select col_type_is('public', 'checkout_order_shipping_allocations', 'final_additional_item_fee_minor', 'integer', 'allocation snapshots final additional fee');
select col_type_is('public', 'checkout_order_shipping_allocations', 'quantity', 'integer', 'allocation snapshots quantity');
select col_type_is('public', 'checkout_order_shipping_allocations', 'first_item_winner_units', 'integer', 'allocation records highest-first winner units');
select col_type_is('public', 'checkout_order_shipping_allocations', 'allocated_shipping_minor', 'bigint', 'allocation snapshots allocated total');

select has_index('public', 'checkout_order_shipping_allocations', 'checkout_order_shipping_allocations_order_line_uidx', 'one allocation exists per order line');
select has_index('public', 'checkout_order_shipping_allocations', 'checkout_order_shipping_allocations_order_idx', 'order allocations are indexed');
select has_trigger('public', 'checkout_order_shipping_allocations', 'checkout_order_shipping_allocations_immutable', 'allocation evidence is trigger-immutable');
select policies_are('public', 'checkout_order_shipping_allocations', array['shipping allocations are admin readable', 'shipping allocations are admin insertable'], 'allocation policies permit only admin read and insert');
select table_privs_are('public', 'checkout_order_shipping_allocations', 'anon', array[]::text[], 'anon has no allocation table grants');
select table_privs_are('public', 'checkout_order_shipping_allocations', 'authenticated', array['SELECT', 'INSERT'], 'authenticated allocation access is admin-RLS constrained');
select table_privs_are('public', 'checkout_order_shipping_allocations', 'service_role', array['SELECT', 'INSERT'], 'service role may append and inspect evidence only');

insert into public.products (id, product_type)
values ('08020000-0000-0000-0000-000000000001', 'physical_finished');
insert into public.shipping_profiles (id, name, active)
values ('08020000-0000-0000-0000-000000000002', 'Allocation fixture', true);
insert into public.shipping_rules (
  id, profile_id, match_kind, country_code, currency_code,
  first_item_fee_minor, additional_item_fee_minor
)
values (
  '08020000-0000-0000-0000-000000000003',
  '08020000-0000-0000-0000-000000000002',
  'exact_country', 'US', 'USD', 1200, 350
);
insert into public.checkout_orders (
  id, contact_email, locale, market, currency_code, payment_intent,
  subtotal_minor, shipping_minor, total_minor, accepted_quote_hash,
  quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at, guest_secret_hash
)
values (
  '08020000-0000-0000-0000-000000000004', 'allocation@example.test',
  'en', 'intl', 'USD', 'paypal_intent', 5000, 1550, 6550, 'phase-8-allocation',
  '{"status":"ready"}'::jsonb, '[]'::jsonb, 'guest:phase8', 'phase8-allocation',
  now() + interval '15 minutes', repeat('a', 64)
);
insert into public.checkout_order_lines (
  id, order_id, product_id, line_id, product_title, fulfillment_type,
  market, currency_code, quantity, unit_price_minor, line_subtotal_minor,
  shipping_allocation_minor, quote_line_snapshot
)
values (
  '08020000-0000-0000-0000-000000000005',
  '08020000-0000-0000-0000-000000000004',
  '08020000-0000-0000-0000-000000000001', 'phase8-line', 'Allocation fixture',
  'physical', 'intl', 'USD', 2, 2500, 5000, 1550, '{"status":"ready"}'::jsonb
);
insert into public.checkout_order_shipping_allocations (
  id, order_id, order_line_id, source_tier, shipping_profile_id, profile_name,
  shipping_rule_id, rule_match_kind, destination_country_code, currency_code,
  base_first_item_fee_minor, base_additional_item_fee_minor,
  final_first_item_fee_minor, final_additional_item_fee_minor,
  quantity, first_item_winner_units, allocated_shipping_minor
)
values (
  '08020000-0000-0000-0000-000000000006',
  '08020000-0000-0000-0000-000000000004',
  '08020000-0000-0000-0000-000000000005',
  'store_default', '08020000-0000-0000-0000-000000000002', 'Allocation fixture',
  '08020000-0000-0000-0000-000000000003', 'exact_country', 'US', 'USD',
  1200, 350, 1200, 350, 2, 1, 1550
);

select throws_ok(
  $$update public.checkout_order_shipping_allocations
    set allocated_shipping_minor = 0
    where id = '08020000-0000-0000-0000-000000000006'$$,
  '23514', null,
  'accepted allocation evidence cannot be updated'
);
select throws_ok(
  $$delete from public.checkout_order_shipping_allocations
    where id = '08020000-0000-0000-0000-000000000006'$$,
  '23514', null,
  'accepted allocation evidence cannot be deleted'
);
select throws_ok(
  $$insert into public.checkout_order_shipping_allocations (
      order_id, order_line_id, source_tier, shipping_profile_id, profile_name,
      shipping_rule_id, rule_match_kind, destination_country_code, currency_code,
      base_first_item_fee_minor, base_additional_item_fee_minor,
      final_first_item_fee_minor, final_additional_item_fee_minor,
      quantity, first_item_winner_units, allocated_shipping_minor,
      region_code
    ) values (
      '08020000-0000-0000-0000-000000000004',
      '08020000-0000-0000-0000-000000000005',
      'product', '08020000-0000-0000-0000-000000000002', 'Allocation fixture',
      '08020000-0000-0000-0000-000000000003', 'exact_country', 'US', 'USD',
      1200, 350, 1200, 350, 2, 0, 700, 'AK'
    )$$,
  '23514', null,
  'partial region evidence is rejected'
);

set local role anon;
select throws_ok(
  $$select * from public.checkout_order_shipping_allocations$$,
  '42501', null,
  'anon cannot directly read shipping allocation evidence'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '08020000-0000-0000-0000-000000000099', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*)::integer from public.checkout_order_shipping_allocations),
  0,
  'non-admin authenticated callers cannot read shipping allocation evidence'
);
select throws_ok(
  $$update public.checkout_order_shipping_allocations set allocated_shipping_minor = 0$$,
  '42501', null,
  'authenticated callers have no direct allocation update privilege'
);
reset role;

select * from finish();

rollback;
