begin;

select plan(10);

select has_function(
  'public',
  'checkout_available_inventory',
  array['uuid'],
  'active reservations are subtracted through helper'
);

select has_index(
  'public',
  'checkout_orders',
  'checkout_orders_pending_deadline_idx',
  'pending reservations have a deadline index'
);

select col_not_null('public', 'checkout_orders', 'idempotency_key', 'idempotency key is required');
select col_not_null('public', 'checkout_inventory_reservations', 'quantity_reserved', 'reservation quantity is required');

select throws_ok(
  $$select public.checkout_reservation_expires_at('card_capture', now())$$,
  '23514',
  null,
  'unknown payment intent is rejected'
);

select results_eq(
  $$select status from jsonb_to_record(public.submit_checkout('{"idempotencyKey":"x"}'::jsonb)) as r(status text)$$,
  $$values ('invalid'::text)$$,
  'invalid payload returns typed safe result'
);

select results_eq(
  $$select code from jsonb_to_record(public.submit_checkout('{"idempotencyKey":"x"}'::jsonb)) as r(code text)$$,
  $$values ('invalid_checkout_submit'::text)$$,
  'invalid payload does not raise raw SQL errors'
);

select is(
  public.checkout_available_inventory('00000000-0000-0000-0000-000000000000'::uuid),
  0,
  'missing inventory has zero available units'
);

select results_eq(
  $$select status from jsonb_to_record(public.validate_market_exception_grant(repeat('0', 64))) as r(status text)$$,
  $$values ('invalid'::text)$$,
  'invalid exception grant returns generic invalid status'
);

select results_eq(
  $$select code from jsonb_to_record(public.validate_market_exception_grant(repeat('0', 64))) as r(code text)$$,
  $$values ('invalid_or_expired'::text)$$,
  'invalid exception grant does not reveal token enumeration detail'
);

select * from finish();

rollback;
