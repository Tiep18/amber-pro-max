begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

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
select has_constraint(
  'public', 'checkout_orders', 'checkout_orders_authoritative_arithmetic_check',
  'orders enforce authoritative subtotal/discount/shipping arithmetic'
);
select has_trigger(
  'public', 'checkout_order_lines', 'checkout_order_lines_server_shipping_allocation',
  'server allocation is written before immutable line insertion'
);

insert into public.products (id, product_type, status, published_at)
values ('08140000-0000-0000-0000-000000000001', 'pdf_pattern', 'published', now());
insert into public.product_market_offers (
  product_id, market_code, enabled, currency_code, price_minor
) values ('08140000-0000-0000-0000-000000000001', 'intl', true, 'USD', 2500);

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
  strpos(pg_get_functiondef('public.submit_checkout(jsonb)'::regprocedure),
    'select * into existing_order') <
  strpos(pg_get_functiondef('public.submit_checkout(jsonb)'::regprocedure),
    'checkout_commercial_quote_is_current'),
  'idempotency lookup occurs before commercial and shipping resolution'
);
select like(
  pg_get_functiondef('public.submit_checkout(jsonb)'::regprocedure),
  '%case when shipping_address ->> ''countryCode'' = ''US''%',
  'only US addresses pass a region into the shipping resolver'
);
select like(
  pg_get_functiondef('public.submit_checkout(jsonb)'::regprocedure),
  '%on conflict (order_line_id) do nothing%',
  'allocation snapshot insertion is safe under idempotent races'
);
select like(
  pg_get_functiondef('public.submit_checkout(jsonb)'::regprocedure),
  '%shipping_allocation_minor <> coalesce(a.allocated_shipping_minor, 0)%',
  'legacy and v2 per-line shipping evidence must match'
);

select * from finish();
rollback;
