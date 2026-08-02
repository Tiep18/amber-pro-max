begin;

select plan(8);

-- A fresh order with one digital and one physical line, mirroring the
-- product ids seeded by supabase/seed.sql.
insert into public.checkout_orders (
  id,
  order_number,
  guest_secret_hash,
  contact_email,
  locale,
  market,
  currency_code,
  status,
  payment_intent,
  subtotal_minor,
  discount_minor,
  shipping_minor,
  total_minor,
  accepted_quote_hash,
  quote_snapshot,
  cart_snapshot,
  idempotency_actor,
  idempotency_key,
  reservation_expires_at
)
values (
  '00000000-0000-4000-8000-000000000901',
  'ATB-LIFECYCLE-EMAIL-TEST',
  'lifecycle-email-guest-hash',
  'lifecycle-email@example.test',
  'en',
  'intl',
  'USD',
  'pending_payment',
  'paypal_intent',
  6000,
  0,
  0,
  6000,
  'lifecycle-email-hash',
  '{}'::jsonb,
  '[]'::jsonb,
  'guest',
  'lifecycle-email-key',
  now() + interval '15 minutes'
);

insert into public.checkout_order_lines (
  order_id, product_id, line_id, product_title, fulfillment_type,
  market, currency_code, quantity, unit_price_minor, line_subtotal_minor, quote_line_snapshot
)
values
  ('00000000-0000-4000-8000-000000000901', '50000000-0000-0000-0000-000000000001', 'line-digital', 'VN bear pattern', 'digital', 'intl', 'USD', 1, 3000, 3000, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000901', '50000000-0000-0000-0000-000000000002', 'line-physical', 'International bear', 'physical', 'intl', 'USD', 1, 3000, 3000, '{}'::jsonb);

select results_eq(
  $$select count(*)::int from public.transactional_email_outbox
    where order_id = '00000000-0000-4000-8000-000000000901' and event_type = 'order_created'$$,
  $$values (1)$$,
  'creating an order enqueues exactly one order_created email'
);

select results_eq(
  $$select (payload ->> 'orderNumber'), (payload ->> 'isGuest')
    from public.transactional_email_outbox
    where order_id = '00000000-0000-4000-8000-000000000901' and event_type = 'order_created'$$,
  $$values ('ATB-LIFECYCLE-EMAIL-TEST'::text, 'true'::text)$$,
  'order_created payload carries the order number and guest flag'
);

select is(
  (select count(*)::int from public.transactional_email_outbox
    where order_id = '00000000-0000-4000-8000-000000000901' and event_type = 'payment_received'),
  0,
  'no payment_received email before payment is confirmed'
);

select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'lifecycle-email-test-paid',
  'source', 'paypal_webhook',
  'targetStatus', 'paid',
  'providerEventId', 'WH-LIFECYCLE-EMAIL-TEST-0001',
  'orderNumber', 'ATB-LIFECYCLE-EMAIL-TEST',
  'amountMinor', 6000,
  'currencyCode', 'USD'
));

select results_eq(
  $$select count(*)::int from public.transactional_email_outbox
    where order_id = '00000000-0000-4000-8000-000000000901' and event_type = 'payment_received'$$,
  $$values (1)$$,
  'a paid transition enqueues exactly one payment_received email'
);

select results_eq(
  $$select (payload ->> 'hasDigitalLines'), (payload ->> 'hasPhysicalLines')
    from public.transactional_email_outbox
    where order_id = '00000000-0000-4000-8000-000000000901' and event_type = 'payment_received'$$,
  $$values ('true'::text, 'true'::text)$$,
  'payment_received payload flags both digital and physical lines'
);

select is(
  (select (payload ->> 'isGuest')::boolean
    from public.transactional_email_outbox
    where order_id = '00000000-0000-4000-8000-000000000901' and event_type = 'payment_received'),
  true,
  'guest payment_received payload carries the guest flag for reopen links'
);

-- Re-delivering the same verified event must not create a second receipt:
-- apply_payment_transition dedupes by transition_key before any insert, so
-- the payment_transitions row (and this trigger) never fires twice.
select public.apply_payment_transition(jsonb_build_object(
  'transitionKey', 'lifecycle-email-test-paid',
  'source', 'paypal_webhook',
  'targetStatus', 'paid',
  'providerEventId', 'WH-LIFECYCLE-EMAIL-TEST-0001',
  'orderNumber', 'ATB-LIFECYCLE-EMAIL-TEST',
  'amountMinor', 6000,
  'currencyCode', 'USD'
));

select results_eq(
  $$select count(*)::int from public.transactional_email_outbox
    where order_id = '00000000-0000-4000-8000-000000000901' and event_type = 'payment_received'$$,
  $$values (1)$$,
  'a duplicate webhook delivery does not enqueue a second payment_received email'
);

select ok(
  private.fulfillment_safe_json(
    (select payload from public.transactional_email_outbox
      where order_id = '00000000-0000-4000-8000-000000000901' and event_type = 'order_created')
  ),
  'order_created payload passes the fulfillment safe-json guard'
);

select * from finish();

rollback;
