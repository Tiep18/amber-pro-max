create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
select plan(13);

-- This fixture is committed so two independent dblink sessions can execute
-- complete submit_checkout transactions against the same attempt.
begin;
insert into public.products (id, product_type, status, published_at)
values ('08142000-0000-0000-0000-000000000001', 'pdf_pattern', 'published', now());
insert into public.product_translations (product_id, locale, slug, title, description)
values ('08142000-0000-0000-0000-000000000001', 'en', 'guest-race-pattern', 'Guest race pattern', '');
insert into public.product_market_offers (product_id, market_code, enabled, currency_code, price_minor)
values ('08142000-0000-0000-0000-000000000001', 'intl', true, 'USD', 2500);
commit;

create temporary table guest_race_payloads (name text primary key, payload jsonb);
insert into guest_race_payloads values
  ('a', jsonb_build_object(
    'locale', 'en', 'market', 'intl',
    'lines', jsonb_build_array(jsonb_build_object(
      'productId', '08142000-0000-0000-0000-000000000001', 'variantId', null,
      'quantity', 1, 'marketAtAdd', 'intl'
    )),
    'acceptedQuoteHash', 'guest-race-quote',
    'acceptedQuote', jsonb_build_object(
      'status', 'ready', 'locale', 'en', 'market', 'intl', 'currencyCode', 'USD',
      'lines', jsonb_build_array(jsonb_build_object(
        'lineId', '08142000-0000-0000-0000-000000000001::product',
        'productId', '08142000-0000-0000-0000-000000000001', 'variantId', null,
        'fulfillmentType', 'digital', 'status', 'ready', 'quantity', 1, 'requestedQuantity', 1,
        'marketAtAdd', 'intl', 'currencyCode', 'USD', 'unitPriceMinor', 2500,
        'lineSubtotalMinor', 2500, 'excludedSubtotalMinor', 0, 'discountAllocationMinor', 0
      )),
      'subtotalMinor', 2500, 'excludedSubtotalMinor', 0,
      'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
      'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0, 'countryCode', null),
      'totalMinor', 2500, 'hash', 'guest-race-quote', 'quotedAt', now()
    ),
    'idempotencyKey', 'browser-race-a', 'guestCartId', 'browser-race-a',
    'guestRecovery', jsonb_build_object('attemptId', repeat('N', 43), 'proof', repeat('O', 43)),
    'contactEmail', 'guest-race@example.test', 'paymentIntent', 'paypal_intent'
  )),
  ('b', jsonb_build_object(
    'locale', 'en', 'market', 'intl',
    'lines', jsonb_build_array(jsonb_build_object(
      'productId', '08142000-0000-0000-0000-000000000001', 'variantId', null,
      'quantity', 1, 'marketAtAdd', 'intl'
    )),
    'acceptedQuoteHash', 'guest-race-quote',
    'acceptedQuote', jsonb_build_object(
      'status', 'ready', 'locale', 'en', 'market', 'intl', 'currencyCode', 'USD',
      'lines', jsonb_build_array(jsonb_build_object(
        'lineId', '08142000-0000-0000-0000-000000000001::product',
        'productId', '08142000-0000-0000-0000-000000000001', 'variantId', null,
        'fulfillmentType', 'digital', 'status', 'ready', 'quantity', 1, 'requestedQuantity', 1,
        'marketAtAdd', 'intl', 'currencyCode', 'USD', 'unitPriceMinor', 2500,
        'lineSubtotalMinor', 2500, 'excludedSubtotalMinor', 0, 'discountAllocationMinor', 0
      )),
      'subtotalMinor', 2500, 'excludedSubtotalMinor', 0,
      'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
      'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0, 'countryCode', null),
      'totalMinor', 2500, 'hash', 'guest-race-quote', 'quotedAt', now()
    ),
    'idempotencyKey', 'browser-race-b', 'guestCartId', 'browser-race-b',
    'guestRecovery', jsonb_build_object('attemptId', repeat('N', 43), 'proof', repeat('P', 43)),
    'contactEmail', 'guest-race@example.test', 'paymentIntent', 'paypal_intent'
  ));

select extensions.dblink_connect('guest_race_a', 'host=db port=5432 dbname=postgres user=postgres password=postgres');
select extensions.dblink_connect('guest_race_b', 'host=db port=5432 dbname=postgres user=postgres password=postgres');
select extensions.dblink_send_query(
  'guest_race_a',
  format('select public.submit_checkout(%L::jsonb)', (select payload::text from guest_race_payloads where name = 'a'))
);
select extensions.dblink_send_query(
  'guest_race_b',
  format('select public.submit_checkout(%L::jsonb)', (select payload::text from guest_race_payloads where name = 'b'))
);

create temporary table guest_race_results (name text primary key, result jsonb);
insert into guest_race_results
select 'a', result from extensions.dblink_get_result('guest_race_a') as response(result jsonb);
insert into guest_race_results
select 'b', result from extensions.dblink_get_result('guest_race_b') as response(result jsonb);
select extensions.dblink_disconnect('guest_race_a');
select extensions.dblink_disconnect('guest_race_b');

begin;
select is((select count(*)::integer from guest_race_results where result ->> 'status' = 'success'), 1, 'one concurrent full-order submit wins');
select is((select count(*)::integer from guest_race_results where result ->> 'code' = 'guest_checkout_conflict'), 1, 'different proof loses with a generic conflict');
select is((select count(*)::integer from public.checkout_orders where contact_email = 'guest-race@example.test'), 1, 'concurrent calls commit one order');
select is((select count(*)::integer from public.payments p join public.checkout_orders o on o.id = p.order_id where o.contact_email = 'guest-race@example.test'), 1, 'concurrent calls commit one payment');
select is((select count(*)::integer from public.checkout_order_lines l join public.checkout_orders o on o.id = l.order_id where o.contact_email = 'guest-race@example.test'), 1, 'concurrent calls commit one line graph');
select is((select count(*)::integer from private.checkout_guest_attempt_claims where attempt_id_hash = encode(extensions.digest(repeat('N', 43), 'sha256'), 'hex')), 1, 'concurrent calls share one hashed claim');
select ok((select bool_and(not (result ? 'guestAccessToken')) from guest_race_results), 'neither response exposes a guest token');
select ok((select bool_and(result::text not like '%' || repeat('N', 43) || '%' and result::text not like '%' || repeat('O', 43) || '%' and result::text not like '%' || repeat('P', 43) || '%') from guest_race_results), 'responses contain no raw attempt or proof');
select ok((select guest_secret_hash in (encode(extensions.digest(repeat('O', 43), 'sha256'), 'hex'), encode(extensions.digest(repeat('P', 43), 'sha256'), 'hex')) from public.checkout_orders where contact_email = 'guest-race@example.test'), 'winner stores only its proof hash');
select ok((select (o.quote_snapshot::text || o.cart_snapshot::text || o.idempotency_key || p.request_id) not like '%' || repeat('N', 43) || '%' and (o.quote_snapshot::text || o.cart_snapshot::text || o.idempotency_key || p.request_id) not like '%' || repeat('O', 43) || '%' and (o.quote_snapshot::text || o.cart_snapshot::text || o.idempotency_key || p.request_id) not like '%' || repeat('P', 43) || '%' from public.checkout_orders o join public.payments p on p.order_id = o.id where o.contact_email = 'guest-race@example.test'), 'order/payment snapshots contain no raw recovery credentials');

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '08142000-0000-0000-0000-000000000099', 'authenticated', 'authenticated',
  'signed-race@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);
select set_config('request.jwt.claim.sub', '08142000-0000-0000-0000-000000000099', true);
create temporary table signed_race_result as
select public.submit_checkout(
  ((select payload from guest_race_payloads where name = 'a') - 'guestRecovery' - 'guestCartId' - 'idempotencyKey' - 'contactEmail')
  || jsonb_build_object('idempotencyKey', 'signed-race-wrapper', 'contactEmail', 'signed-race@example.test')
) result;
select is((select result ->> 'status' from signed_race_result), 'success', 'signed-in wrapper succeeds without guest recovery credentials');
select is((select owner_user_id from public.checkout_orders where contact_email = 'signed-race@example.test'), '08142000-0000-0000-0000-000000000099'::uuid, 'signed-in wrapper preserves auth.uid ownership');
select is((select count(*)::integer from private.checkout_guest_attempt_claims c join public.checkout_orders o on o.id = c.order_id where o.contact_email = 'signed-race@example.test'), 0, 'signed-in wrapper does not consume a guest attempt claim');
select set_config('request.jwt.claim.sub', '', true);

-- The database test runner starts from db:reset. Commerce audit rows are
-- intentionally append-only, so this committed concurrency fixture remains in
-- the disposable local test database rather than bypassing its audit trigger.
select * from finish();
commit;
