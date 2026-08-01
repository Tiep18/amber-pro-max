begin;

select plan(9);

select has_column('public', 'checkout_orders', 'customer_transfer_declared_at', 'orders track an unverified customer transfer declaration');
select has_function('public', 'declare_vietqr_transfer', array['text', 'text'], 'customer declaration command exists');
select function_privs_are('public', 'declare_vietqr_transfer', array['text', 'text'], 'anon', array['EXECUTE'], 'guests can declare a transfer');
select function_privs_are('public', 'declare_vietqr_transfer', array['text', 'text'], 'authenticated', array['EXECUTE'], 'signed-in customers can declare a transfer');

-- A pending VietQR order the guest secret hash authorises.
insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, payment_intent, subtotal_minor, discount_minor, shipping_minor, total_minor,
  accepted_quote_hash, quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at
)
values (
  '00000000-0000-4000-8000-000000000902',
  'ATB-VIETQR-DECLARE-TEST',
  'vietqr-declare-guest-hash',
  'vietqr-declare@example.test',
  'vi',
  'vn',
  'VND',
  'pending_payment',
  'vietqr_intent',
  250000,
  0,
  0,
  250000,
  'vietqr-declare-hash',
  '{}'::jsonb,
  '[]'::jsonb,
  'guest',
  'vietqr-declare-key',
  now() + interval '24 hours'
);

select results_eq(
  $$select status from jsonb_to_record(
    public.declare_vietqr_transfer('ATB-VIETQR-DECLARE-TEST', 'wrong-guest-hash')
  ) as r(status text)$$,
  $$values ('forbidden'::text)$$,
  'a mismatched guest secret hash is rejected without revealing order state'
);

select results_eq(
  $$select status from jsonb_to_record(
    public.declare_vietqr_transfer('ATB-VIETQR-DECLARE-TEST', 'vietqr-declare-guest-hash')
  ) as r(status text)$$,
  $$values ('recorded'::text)$$,
  'a matching guest secret hash records the declaration once'
);

select results_eq(
  $$select status from jsonb_to_record(
    public.declare_vietqr_transfer('ATB-VIETQR-DECLARE-TEST', 'vietqr-declare-guest-hash')
  ) as r(status text)$$,
  $$values ('unchanged'::text)$$,
  'declaring again is idempotent and reports unchanged'
);

select is(
  (select count(*)::int from public.fulfillment_audit_events
    where event_key = 'vietqr_transfer_declared:00000000-0000-4000-8000-000000000902'),
  1,
  'declaring twice writes exactly one audit event'
);

select results_eq(
  $$select payment_status, customer_transfer_declared_at is not null
    from public.order_payment_statuses
    where order_number = 'ATB-VIETQR-DECLARE-TEST'$$,
  $$values ('pending'::text, true)$$,
  'the declaration never advances payment status, and it is visible on the projection'
);

select * from finish();

rollback;
