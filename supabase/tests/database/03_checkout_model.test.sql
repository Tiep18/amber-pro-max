begin;

select plan(28);

select has_table('public', 'checkout_orders', 'checkout order shell exists');
select has_table('public', 'checkout_order_lines', 'immutable checkout order lines exist');
select has_table('public', 'checkout_inventory_reservations', 'checkout inventory reservations exist');

select col_type_is('public', 'checkout_orders', 'owner_user_id', 'uuid', 'orders can be account-owned');
select col_type_is('public', 'checkout_orders', 'guest_secret_hash', 'text', 'guest order access uses a secret hash');
select col_type_is('public', 'checkout_orders', 'status', 'text', 'orders track pending-payment state');
select col_type_is('public', 'checkout_orders', 'reservation_expires_at', 'timestamp with time zone', 'orders store reservation deadline');
select col_type_is('public', 'checkout_order_lines', 'product_title', 'text', 'lines snapshot localized product title');
select col_type_is('public', 'checkout_order_lines', 'unit_price_minor', 'bigint', 'lines snapshot unit price in integer minor units');
select col_type_is('public', 'checkout_order_lines', 'discount_allocation_minor', 'bigint', 'lines snapshot discount allocation');
select col_type_is('public', 'checkout_order_lines', 'shipping_allocation_minor', 'bigint', 'lines snapshot shipping allocation');

select col_is_fk('public', 'checkout_order_lines', 'order_id', 'lines reference checkout orders');
select col_is_fk('public', 'checkout_inventory_reservations', 'order_id', 'reservations reference checkout orders');
select col_is_fk('public', 'checkout_inventory_reservations', 'inventory_record_id', 'reservations reference inventory records');

select has_index('public', 'checkout_orders', 'checkout_orders_idempotency_unique_idx', 'idempotency key is unique per actor');
select has_index('public', 'checkout_inventory_reservations', 'checkout_inventory_reservations_active_idx', 'active reservations are indexed');

select has_function(
  'public',
  'submit_checkout',
  array['jsonb'],
  'checkout submit has one JSON RPC boundary'
);

select lives_ok(
  $$select public.checkout_reservation_expires_at('paypal_intent', '2026-06-15T00:00:00Z'::timestamptz)$$,
  'reservation deadline helper accepts PayPal intent'
);

select is(
  public.checkout_reservation_expires_at('paypal_intent', '2026-06-15T00:00:00Z'::timestamptz),
  '2026-06-15T00:15:00Z'::timestamptz,
  'PayPal intent reserves for 15 minutes'
);

select is(
  public.checkout_reservation_expires_at('vietqr_intent', '2026-06-15T00:00:00Z'::timestamptz),
  '2026-06-16T00:00:00Z'::timestamptz,
  'VietQR intent reserves for 24 hours'
);

select has_table('public', 'market_exception_requests', 'market exception requests table exists');
select has_table('public', 'market_exception_grants', 'market exception grants table exists');
select col_type_is('public', 'market_exception_requests', 'destination_country_code', 'text', 'exception requests scope destination country');
select col_type_is('public', 'market_exception_grants', 'token_hash', 'text', 'exception grants store token hash');
select col_type_is('public', 'market_exception_grants', 'expires_at', 'timestamp with time zone', 'exception grants expire');
select col_is_fk('public', 'market_exception_grants', 'request_id', 'exception grants reference requests');
select has_function('public', 'create_market_exception_request', array['jsonb'], 'request RPC exists');
select has_function('public', 'validate_market_exception_grant', array['text'], 'grant validation RPC exists');

select * from finish();

rollback;
