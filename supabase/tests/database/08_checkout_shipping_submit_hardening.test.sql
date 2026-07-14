begin;

create extension if not exists pgtap with schema extensions;
select plan(49);

select has_function(
  'private', 'checkout_commercial_quote_is_current', array['jsonb', 'uuid'],
  'submit has a private database-owned commercial verifier'
);
select function_privs_are(
  'private', 'checkout_commercial_quote_is_current', array['jsonb', 'uuid'], 'anon', array[]::text[],
  'anon cannot execute the commercial verifier directly'
);
select function_privs_are(
  'private', 'checkout_commercial_quote_is_current', array['jsonb', 'uuid'], 'authenticated', array[]::text[],
  'authenticated callers cannot execute the commercial verifier directly'
);
select function_privs_are(
  'public', 'submit_checkout', array['jsonb'], 'anon', array['EXECUTE'],
  'anon can execute only the public submit boundary'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.checkout_orders'::regclass
      and conname = 'checkout_orders_authoritative_arithmetic_check'
  ),
  'orders enforce authoritative subtotal/discount/shipping arithmetic'
);
select has_trigger(
  'public', 'checkout_order_lines', 'checkout_order_lines_server_shipping_allocation',
  'server allocation is written before immutable line insertion'
);
select has_table('private', 'checkout_guest_attempt_claims', 'guest attempts have a private claim table');
select table_privs_are('private', 'checkout_guest_attempt_claims', 'anon', array[]::text[], 'anon cannot inspect guest attempt claims');
select table_privs_are('private', 'checkout_guest_attempt_claims', 'authenticated', array[]::text[], 'authenticated cannot inspect guest attempt claims');
select function_privs_are('private', 'submit_checkout_authority_v2', array['jsonb'], 'anon', array[]::text[], 'anon cannot bypass the guest attempt boundary');

insert into public.products (id, product_type, status, published_at)
values ('08140000-0000-0000-0000-000000000001', 'pdf_pattern', 'published', now());
insert into public.product_market_offers (
  product_id, market_code, enabled, currency_code, price_minor
) values ('08140000-0000-0000-0000-000000000001', 'intl', true, 'USD', 2500);

select isnt(
  private.checkout_commercial_quote_is_current(
    jsonb_build_object(
      'locale', 'en', 'market', 'intl', 'paymentIntent', 'paypal_intent',
      'discountCode', null,
      'lines', jsonb_build_array(jsonb_build_object(
        'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
        'quantity', 2, 'marketAtAdd', 'intl'
      )),
      'acceptedQuote', jsonb_build_object(
        'status', 'ready', 'market', 'intl', 'currencyCode', 'USD',
        'subtotalMinor', 5000, 'totalMinor', 5000,
        'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
        'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0),
        'lines', jsonb_build_array(jsonb_build_object(
          'lineId', '08140000-0000-0000-0000-000000000001::product',
          'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
          'fulfillmentType', 'digital', 'status', 'ready', 'quantity', 2,
          'requestedQuantity', 2, 'marketAtAdd', 'intl', 'currencyCode', 'USD', 'unitPriceMinor', 2500,
          'lineSubtotalMinor', 5000, 'discountAllocationMinor', 0
        ))
      )
    ), null
  ), true,
  'a digital quote without a private PDF asset is rejected'
);

insert into public.product_digital_assets (
  product_id, bucket_id, object_path, file_name, byte_size
) values (
  '08140000-0000-0000-0000-000000000001',
  'pattern-pdfs',
  'patterns/08140000-0000-0000-0000-000000000001/checkout.pdf',
  'checkout.pdf',
  1024
);

select ok(
  private.checkout_commercial_quote_is_current(
    jsonb_build_object(
      'locale', 'en', 'market', 'intl', 'paymentIntent', 'paypal_intent',
      'discountCode', null,
      'lines', jsonb_build_array(jsonb_build_object(
        'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
        'quantity', 2, 'marketAtAdd', 'intl'
      )),
      'acceptedQuote', jsonb_build_object(
        'status', 'ready', 'market', 'intl', 'currencyCode', 'USD',
        'subtotalMinor', 5000, 'totalMinor', 5000,
        'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
        'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0),
        'lines', jsonb_build_array(jsonb_build_object(
          'lineId', '08140000-0000-0000-0000-000000000001::product',
          'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
          'fulfillmentType', 'digital', 'status', 'ready', 'quantity', 2,
          'requestedQuantity', 2, 'marketAtAdd', 'intl', 'currencyCode', 'USD', 'unitPriceMinor', 2500,
          'lineSubtotalMinor', 5000, 'discountAllocationMinor', 0
        ))
      )
    ), null
  ),
  'an untouched current commercial quote is accepted'
);

select isnt(
  private.checkout_commercial_quote_is_current(
    jsonb_build_object(
      'locale', 'en', 'market', 'intl', 'paymentIntent', 'paypal_intent', 'discountCode', null,
      'lines', jsonb_build_array(jsonb_build_object(
        'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null, 'quantity', 2, 'marketAtAdd', 'intl'
      )),
      'acceptedQuote', jsonb_build_object(
        'status', 'ready', 'market', 'intl', 'currencyCode', 'USD', 'subtotalMinor', 5000, 'totalMinor', 5000,
        'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
        'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0),
        'lines', jsonb_build_array(jsonb_build_object(
          'lineId', '08140000-0000-0000-0000-000000000001::product',
          'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
          'fulfillmentType', 'digital', 'status', 'ready', 'quantity', 2, 'requestedQuantity', 2,
          'marketAtAdd', 'intl', 'currencyCode', 'USD', 'unitPriceMinor', 2500,
          'lineSubtotalMinor', 5000, 'discountAllocationMinor', 1
        ))
      )
    ), null
  ), true,
  'zero expected discount explicitly rejects a nonzero line allocation'
);

select isnt(
  private.checkout_commercial_quote_is_current(
    jsonb_build_object(
      'locale', 'en', 'market', 'intl', 'paymentIntent', 'paypal_intent',
      'lines', jsonb_build_array(jsonb_build_object(
        'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
        'quantity', 2, 'marketAtAdd', 'intl'
      )),
      'acceptedQuote', jsonb_build_object(
        'status', 'ready', 'market', 'intl', 'currencyCode', 'USD',
        'subtotalMinor', 2, 'totalMinor', 2,
        'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
        'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0),
        'lines', jsonb_build_array(jsonb_build_object(
          'lineId', '08140000-0000-0000-0000-000000000001::product',
          'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
          'fulfillmentType', 'digital', 'status', 'ready', 'quantity', 2,
          'requestedQuantity', 2, 'marketAtAdd', 'intl', 'currencyCode', 'USD', 'unitPriceMinor', 1,
          'lineSubtotalMinor', 2, 'discountAllocationMinor', 0
        ))
      )
    ), null
  ), true,
  'tampered client price and totals are rejected'
);

update public.product_market_offers
set price_minor = 3000
where product_id = '08140000-0000-0000-0000-000000000001';

select isnt(
  private.checkout_commercial_quote_is_current(
    jsonb_build_object(
      'locale', 'en', 'market', 'intl', 'paymentIntent', 'paypal_intent',
      'lines', jsonb_build_array(jsonb_build_object(
        'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
        'quantity', 2, 'marketAtAdd', 'intl'
      )),
      'acceptedQuote', jsonb_build_object(
        'status', 'ready', 'market', 'intl', 'currencyCode', 'USD',
        'subtotalMinor', 5000, 'totalMinor', 5000,
        'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
        'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0),
        'lines', jsonb_build_array(jsonb_build_object(
          'lineId', '08140000-0000-0000-0000-000000000001::product',
          'productId', '08140000-0000-0000-0000-000000000001', 'variantId', null,
          'fulfillmentType', 'digital', 'status', 'ready', 'quantity', 2,
          'requestedQuantity', 2, 'marketAtAdd', 'intl', 'currencyCode', 'USD', 'unitPriceMinor', 2500,
          'lineSubtotalMinor', 5000, 'discountAllocationMinor', 0
        ))
      )
    ), null
  ), true,
  'a catalog price change makes the accepted quote stale'
);

select throws_ok(
  $$insert into public.checkout_orders (
      contact_email, locale, market, currency_code, payment_intent, subtotal_minor,
      discount_minor, shipping_minor, total_minor, accepted_quote_hash, quote_snapshot,
      cart_snapshot, idempotency_actor, idempotency_key, reservation_expires_at, guest_secret_hash
    ) values (
      'arithmetic@example.test', 'en', 'intl', 'USD', 'paypal_intent', 5000,
      0, 500, 1, 'bad-arithmetic', '{}'::jsonb, '[]'::jsonb,
      'guest:arithmetic', 'bad-arithmetic', now() + interval '15 minutes', repeat('a', 64)
    )$$,
  '23514', null,
  'inconsistent order arithmetic cannot be persisted'
);

select ok(
  strpos(pg_get_functiondef('private.submit_checkout_authority_v2(jsonb)'::regprocedure),
    'select * into existing_order') <
  strpos(pg_get_functiondef('private.submit_checkout_authority_v2(jsonb)'::regprocedure),
    'checkout_commercial_quote_is_current'),
  'idempotency lookup occurs before commercial and shipping resolution'
);
select matches(
  pg_get_functiondef('private.submit_checkout_authority_v2(jsonb)'::regprocedure),
  'case when shipping_address ->> ''countryCode'' = ''US''',
  'only US addresses pass a region into the shipping resolver'
);
select matches(
  pg_get_functiondef('private.submit_checkout_authority_v2(jsonb)'::regprocedure),
  'on conflict \(order_line_id\) do nothing',
  'allocation snapshot insertion is safe under idempotent races'
);
select matches(
  pg_get_functiondef('private.submit_checkout_authority_v2(jsonb)'::regprocedure),
  'shipping_allocation_minor <> coalesce\(a.allocated_shipping_minor, 0\)',
  'legacy and v2 per-line shipping evidence must match'
);

-- Behavioral physical checkout fixture: two lines, a non-US free-form region,
-- authoritative metadata, payment creation and repeat submission.
insert into public.products (id, product_type, status, published_at) values
  ('08141000-0000-0000-0000-000000000001', 'physical_finished', 'published', now()),
  ('08141000-0000-0000-0000-000000000002', 'physical_finished', 'published', now());
insert into public.product_translations (product_id, locale, slug, title, description) values
  ('08141000-0000-0000-0000-000000000001', 'en', 'canonical-bear', 'Canonical bear', ''),
  ('08141000-0000-0000-0000-000000000002', 'en', 'canonical-bunny', 'Canonical bunny', '');
insert into public.product_market_offers (product_id, market_code, enabled, currency_code, price_minor) values
  ('08141000-0000-0000-0000-000000000001', 'intl', true, 'USD', 2000),
  ('08141000-0000-0000-0000-000000000002', 'intl', true, 'USD', 3000);
insert into public.inventory_records (product_id, quantity_on_hand) values
  ('08141000-0000-0000-0000-000000000001', 10),
  ('08141000-0000-0000-0000-000000000002', 10);
insert into public.shipping_profiles (id, name, active)
values ('08141000-0000-0000-0000-000000000010', 'Vietnam physical fixture', true);
insert into public.shipping_rules (
  id, profile_id, match_kind, country_code, currency_code,
  first_item_fee_minor, additional_item_fee_minor, active
) values (
  '08141000-0000-0000-0000-000000000011',
  '08141000-0000-0000-0000-000000000010', 'exact_country', 'VN', 'USD', 500, 100, true
);
insert into public.product_shipping_profiles (product_id, profile_id) values
  ('08141000-0000-0000-0000-000000000001', '08141000-0000-0000-0000-000000000010'),
  ('08141000-0000-0000-0000-000000000002', '08141000-0000-0000-0000-000000000010');

create temporary table hardening_payloads (name text primary key, payload jsonb);
with shipping as (
  select public.get_checkout_shipping_quote_v2(
    '[
      {"lineId":"08141000-0000-0000-0000-000000000001::product","productId":"08141000-0000-0000-0000-000000000001","variantId":null,"quantity":2},
      {"lineId":"08141000-0000-0000-0000-000000000002::product","productId":"08141000-0000-0000-0000-000000000002","variantId":null,"quantity":1}
    ]'::jsonb, 'VN', 'USD', null
  ) quote
), accepted as (
  select jsonb_build_object(
    'status', 'ready', 'locale', 'en', 'market', 'intl', 'currencyCode', 'USD',
    'lines', jsonb_build_array(
      jsonb_build_object(
        'lineId', '08141000-0000-0000-0000-000000000001::product',
        'productId', '08141000-0000-0000-0000-000000000001', 'variantId', null,
        'slug', 'forged-slug', 'title', 'FORGED BROWSER TITLE', 'fulfillmentType', 'physical',
        'status', 'ready', 'quantity', 2, 'requestedQuantity', 2, 'marketAtAdd', 'intl',
        'currencyCode', 'USD', 'unitPriceMinor', 2000, 'lineSubtotalMinor', 4000,
        'excludedSubtotalMinor', 0, 'discountAllocationMinor', 0
      ),
      jsonb_build_object(
        'lineId', '08141000-0000-0000-0000-000000000002::product',
        'productId', '08141000-0000-0000-0000-000000000002', 'variantId', null,
        'slug', 'forged-slug-2', 'title', 'FORGED BROWSER TITLE 2', 'fulfillmentType', 'physical',
        'status', 'ready', 'quantity', 1, 'requestedQuantity', 1, 'marketAtAdd', 'intl',
        'currencyCode', 'USD', 'unitPriceMinor', 3000, 'lineSubtotalMinor', 3000,
        'excludedSubtotalMinor', 0, 'discountAllocationMinor', 0
      )
    ),
    'subtotalMinor', 7000, 'excludedSubtotalMinor', 0,
    'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
    'shipping', jsonb_build_object(
      'status', 'ready', 'version', 2, 'countryCode', 'VN', 'regionCode', null,
      'amountMinor', 700, 'firstItemLineId', '08141000-0000-0000-0000-000000000001::product',
      'chargeableUnitCount', 3, 'allocations', shipping.quote -> 'allocations'
    ),
    'totalMinor', 7700, 'hash', 'physical-client-hash', 'quotedAt', now()
  ) quote from shipping
)
insert into hardening_payloads (name, payload)
select 'base', jsonb_build_object(
  'locale', 'en', 'market', 'intl',
  'lines', jsonb_build_array(
    jsonb_build_object('productId', '08141000-0000-0000-0000-000000000001', 'variantId', null, 'quantity', 2, 'marketAtAdd', 'intl'),
    jsonb_build_object('productId', '08141000-0000-0000-0000-000000000002', 'variantId', null, 'quantity', 1, 'marketAtAdd', 'intl')
  ),
  'destinationCountryCode', 'VN', 'destinationRegionCode', null, 'discountCode', null,
  'acceptedQuoteHash', 'physical-client-hash', 'acceptedQuote', accepted.quote,
  'idempotencyKey', 'physical-hardening-base', 'guestCartId', 'physical-hardening-guest',
  'guestRecovery', jsonb_build_object('attemptId', repeat('A', 43), 'proof', repeat('B', 43)),
  'contactEmail', 'physical-hardening@example.test', 'paymentIntent', 'paypal_intent',
  'shippingAddress', jsonb_build_object(
    'recipientName', 'Test recipient', 'phoneNumber', '+84901234567', 'countryCode', 'VN',
    'region', 'Ho Chi Minh City', 'locality', 'Thu Duc', 'addressLine1', '2 Nguyen Hue',
    'addressLine2', null, 'postalCode', '700000'
  )
) from accepted;

create temporary table hardening_submit_results (attempt integer, result jsonb);
insert into hardening_submit_results values
  (1, public.submit_checkout((select payload from hardening_payloads where name = 'base'))),
  (2, public.submit_checkout((select payload from hardening_payloads where name = 'base')));

select is((select result ->> 'status' from hardening_submit_results where attempt = 1), 'success', 'physical submit succeeds');
select is(
  (select result ->> 'orderId' from hardening_submit_results where attempt = 1),
  (select result ->> 'orderId' from hardening_submit_results where attempt = 2),
  'same actor and idempotency key return the same physical order'
);
select ok(not ((select result from hardening_submit_results where attempt = 1) ? 'guestAccessToken'), 'submit response is metadata-only');
select ok(not ((select result from hardening_submit_results where attempt = 2) ? 'guestAccessToken'), 'retry response is metadata-only');
select is(
  (select guest_secret_hash from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)),
  encode(extensions.digest(repeat('B', 43), 'sha256'), 'hex'),
  'guest order stores only the prepared proof hash'
);
select is(
  (select attempt_id_hash from private.checkout_guest_attempt_claims where order_id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)),
  encode(extensions.digest(repeat('A', 43), 'sha256'), 'hex'),
  'attempt claim stores only the attempt hash'
);
select is(
  (select idempotency_key from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)),
  'guest-attempt:' || encode(extensions.digest(repeat('A', 43), 'sha256'), 'hex'),
  'order idempotency evidence is namespaced and hashed'
);
select is(
  (select request_id from public.payments where order_id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)),
  'guest-attempt:' || encode(extensions.digest(repeat('A', 43), 'sha256'), 'hex'),
  'payment idempotency evidence is namespaced and hashed'
);
select ok(
  (select (coalesce(quote_snapshot::text, '') || coalesce(cart_snapshot::text, '') || coalesce(shipping_address::text, '') || idempotency_key) not like '%' || repeat('A', 43) || '%'
   from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)),
  'raw attempt id is absent from persisted order evidence'
);
select is((select count(*)::integer from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), 1, 'retry creates one order');
select is((select count(*)::integer from public.checkout_order_lines where order_id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), 2, 'retry creates one line set');
select is((select count(*)::integer from public.checkout_inventory_reservations where order_id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), 2, 'retry creates one reservation set');
select is((select count(*)::integer from public.payments where order_id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), 1, 'retry creates one payment row');
select is((select count(*)::integer from public.checkout_order_shipping_allocations where order_id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), 2, 'retry creates one shipping snapshot set');
select is((select shipping_address ->> 'region' from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), 'Ho Chi Minh City', 'non-US region remains in immutable address');
select is((select quote_snapshot #>> '{shipping,regionCode}' from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), null, 'non-US region is absent from resolver evidence');
select is((select quote_snapshot #>> '{lines,0,title}' from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), 'Canonical bear', 'order quote snapshot uses database title');
select ok(not (select quote_snapshot::text like '%_serverShippingAllocationMinor%' from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)), 'order snapshot contains no internal allocation marker');
select is(
  (select count(*)::integer from public.checkout_order_lines l join public.checkout_order_shipping_allocations a on a.order_line_id = l.id where l.order_id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1) and l.shipping_allocation_minor = a.allocated_shipping_minor),
  2, 'both physical line allocation representations match'
);
select is(
  (select sum(shipping_allocation_minor)::bigint from public.checkout_order_lines where order_id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)),
  (select shipping_minor from public.checkout_orders where id = (select (result ->> 'orderId')::uuid from hardening_submit_results where attempt = 1)),
  'line allocations sum to authoritative order shipping'
);

insert into hardening_payloads
select 'tampered', jsonb_set(jsonb_set(payload, '{idempotencyKey}', '"physical-tampered-total"'), '{acceptedQuote,totalMinor}', '1')
  || jsonb_build_object('guestRecovery', jsonb_build_object('attemptId', repeat('C', 43), 'proof', repeat('D', 43)))
from hardening_payloads where name = 'base';
select is(public.submit_checkout((select payload from hardening_payloads where name = 'tampered')) ->> 'code', 'stale_commercial_quote', 'tampered total is rejected by public submit');
select is((select count(*)::integer from public.checkout_orders where idempotency_key = 'physical-tampered-total'), 0, 'tampered total creates no order or payment graph');

update public.product_market_offers set price_minor = 2500 where product_id = '08141000-0000-0000-0000-000000000001' and market_code = 'intl';
insert into hardening_payloads
select 'stale-price', jsonb_set(payload, '{idempotencyKey}', '"physical-stale-price"')
  || jsonb_build_object('guestRecovery', jsonb_build_object('attemptId', repeat('E', 43), 'proof', repeat('F', 43)))
from hardening_payloads where name = 'base';
select is(public.submit_checkout((select payload from hardening_payloads where name = 'stale-price')) ->> 'code', 'stale_commercial_quote', 'price changed after quote is rejected');
select is((select count(*)::integer from public.checkout_orders where idempotency_key = 'physical-stale-price'), 0, 'stale price creates nothing');

update public.product_market_offers set price_minor = 2000 where product_id = '08141000-0000-0000-0000-000000000001' and market_code = 'intl';
update public.shipping_rules set first_item_fee_minor = 900 where id = '08141000-0000-0000-0000-000000000011';
insert into hardening_payloads
select 'stale-shipping', jsonb_set(payload, '{idempotencyKey}', '"physical-stale-shipping"')
  || jsonb_build_object('guestRecovery', jsonb_build_object('attemptId', repeat('G', 43), 'proof', repeat('H', 43)))
from hardening_payloads where name = 'base';
select is(public.submit_checkout((select payload from hardening_payloads where name = 'stale-shipping')) ->> 'code', 'stale_shipping_quote', 'shipping configuration changed after quote is rejected');
select is((select count(*)::integer from public.checkout_orders where idempotency_key = 'physical-stale-shipping'), 0, 'stale shipping creates nothing');
update public.shipping_rules set first_item_fee_minor = 500 where id = '08141000-0000-0000-0000-000000000011';

insert into public.discount_codes (code, discount_type, percentage_bps, market, minimum_subtotal_minor)
values ('SAVE10', 'percentage', 1000, 'intl', 0);
insert into hardening_payloads
select 'stale-discount',
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(payload, '{idempotencyKey}', '"physical-stale-discount"'),
          '{discountCode}', '"SAVE10"'
        ),
        '{acceptedQuote,discount}', '{"status":"applied","code":"SAVE10","amountMinor":700,"allocations":[{"lineId":"08141000-0000-0000-0000-000000000001::product","amountMinor":400},{"lineId":"08141000-0000-0000-0000-000000000002::product","amountMinor":300}]}'::jsonb
      ),
      '{acceptedQuote,lines,0,discountAllocationMinor}', '400'
    ),
    '{acceptedQuote,lines,1,discountAllocationMinor}', '300'
  ) || jsonb_build_object(
    'acceptedQuote', jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(payload -> 'acceptedQuote', '{discount}', '{"status":"applied","code":"SAVE10","amountMinor":700,"allocations":[{"lineId":"08141000-0000-0000-0000-000000000001::product","amountMinor":400},{"lineId":"08141000-0000-0000-0000-000000000002::product","amountMinor":300}]}'::jsonb),
          '{lines,0,discountAllocationMinor}', '400'
        ),
        '{lines,1,discountAllocationMinor}', '300'
      ),
      '{totalMinor}', '7000'
    )
  ) || jsonb_build_object('guestRecovery', jsonb_build_object('attemptId', repeat('I', 43), 'proof', repeat('J', 43)))
from hardening_payloads where name = 'base';
select ok(
  private.checkout_commercial_quote_is_current(
    (select payload from hardening_payloads where name = 'stale-discount'),
    null
  ),
  'positive discount preserves exact proportional allocations before the rule changes'
);
update public.discount_codes set percentage_bps = 2000 where code = 'SAVE10';
select is(public.submit_checkout((select payload from hardening_payloads where name = 'stale-discount')) ->> 'code', 'stale_commercial_quote', 'discount changed after quote is rejected');
select is((select count(*)::integer from public.checkout_orders where idempotency_key = 'physical-stale-discount'), 0, 'stale discount creates nothing');

select * from finish();
rollback;
