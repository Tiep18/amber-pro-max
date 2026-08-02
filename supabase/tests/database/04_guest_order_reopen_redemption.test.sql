begin;

select plan(13);

select has_function(
  'public',
  'redeem_guest_order_reopen_token',
  array['text', 'text', 'text'],
  'atomic guest reopen redemption RPC exists'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.redeem_guest_order_reopen_token(text,text,text)'::regprocedure),
  true,
  'redemption RPC owns its authorization boundary'
);

select function_privs_are(
  'public',
  'redeem_guest_order_reopen_token',
  array['text', 'text', 'text'],
  'anon',
  array[]::text[],
  'anonymous role cannot redeem reopen tokens directly'
);

select function_privs_are(
  'public',
  'redeem_guest_order_reopen_token',
  array['text', 'text', 'text'],
  'authenticated',
  array[]::text[],
  'authenticated role cannot redeem reopen tokens directly'
);

insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, payment_intent, subtotal_minor, discount_minor, shipping_minor, total_minor,
  accepted_quote_hash, quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at
)
values (
  '00000000-0000-4000-8000-000000000951',
  'ATB-REOPEN-TEST',
  repeat('a', 64),
  'reopen@example.test',
  'en', 'intl', 'USD', 'pending_payment', 'paypal_intent',
  3000, 0, 0, 3000,
  'reopen-hash', '{}'::jsonb, '[]'::jsonb, 'guest', 'reopen-key',
  now() + interval '25 minutes'
);

insert into public.guest_order_access_tokens (id, order_id, contact_email, token_hash, purpose, expires_at)
values (
  '00000000-0000-4000-8000-000000000952',
  '00000000-0000-4000-8000-000000000951',
  'reopen@example.test',
  repeat('b', 64),
  'reopen_order',
  now() + interval '1 hour'
);

-- First redemption succeeds and rotates the guest secret.
select results_eq(
  $$select status from jsonb_to_record(
      public.redeem_guest_order_reopen_token('atb-reopen-test', repeat('b', 64), repeat('c', 64))
    ) as r(status text)$$,
  $$values ('granted'::text)$$,
  'a valid, active reopen token is granted'
);

select is(
  (select guest_secret_hash from public.checkout_orders where id = '00000000-0000-4000-8000-000000000951'),
  repeat('c', 64),
  'redemption rotates the order guest secret to the supplied hash'
);

select is(
  (select status from public.guest_order_access_tokens where id = '00000000-0000-4000-8000-000000000952'),
  'consumed',
  'redemption consumes the token exactly once'
);

-- THE POINT OF THIS MIGRATION: a second redemption of the same link is denied
-- and, critically, must NOT rotate the secret again — otherwise the cookie the
-- first (legitimate) redemption just issued would be silently invalidated.
select results_eq(
  $$select status from jsonb_to_record(
      public.redeem_guest_order_reopen_token('ATB-REOPEN-TEST', repeat('b', 64), repeat('d', 64))
    ) as r(status text)$$,
  $$values ('denied'::text)$$,
  'replaying a consumed reopen token is denied'
);

select is(
  (select guest_secret_hash from public.checkout_orders where id = '00000000-0000-4000-8000-000000000951'),
  repeat('c', 64),
  'a denied replay leaves the first redemption''s guest secret intact'
);

-- Refunds do not revoke durable guest access to the order record. Both
-- settled refund states must return the same paid access signal as paid.
update public.payments
set status = 'partially_refunded',
    paid_gate_opened_at = now(),
    paid_at = now(),
    refund_status = 'partially_refunded',
    refunded_amount_minor = 1000
where order_id = '00000000-0000-4000-8000-000000000951';

insert into public.guest_order_access_tokens (id, order_id, contact_email, token_hash, purpose, expires_at)
values (
  '00000000-0000-4000-8000-000000000957',
  '00000000-0000-4000-8000-000000000951',
  'reopen@example.test',
  repeat('3', 64),
  'reopen_order',
  now() + interval '1 hour'
);

select results_eq(
  $$select paid from jsonb_to_record(
      public.redeem_guest_order_reopen_token('ATB-REOPEN-TEST', repeat('3', 64), repeat('4', 64))
    ) as r(paid boolean)$$,
  $$values (true)$$,
  'a partially refunded guest order retains durable reopen access'
);

update public.payments
set status = 'refunded',
    refund_status = 'refunded',
    refunded_amount_minor = amount_minor
where order_id = '00000000-0000-4000-8000-000000000951';

insert into public.guest_order_access_tokens (id, order_id, contact_email, token_hash, purpose, expires_at)
values (
  '00000000-0000-4000-8000-000000000958',
  '00000000-0000-4000-8000-000000000951',
  'reopen@example.test',
  repeat('5', 64),
  'reopen_order',
  now() + interval '1 hour'
);

select results_eq(
  $$select paid from jsonb_to_record(
      public.redeem_guest_order_reopen_token('ATB-REOPEN-TEST', repeat('5', 64), repeat('6', 64))
    ) as r(paid boolean)$$,
  $$values (true)$$,
  'a fully refunded guest order retains durable reopen access'
);

-- An expired token must not be redeemable even though it is still 'active'.
insert into public.guest_order_access_tokens (id, order_id, contact_email, token_hash, purpose, expires_at, created_at)
values (
  '00000000-0000-4000-8000-000000000953',
  '00000000-0000-4000-8000-000000000951',
  'reopen@example.test',
  repeat('e', 64),
  'reopen_order',
  now() - interval '1 minute',
  now() - interval '2 hours'
);

select results_eq(
  $$select status from jsonb_to_record(
      public.redeem_guest_order_reopen_token('ATB-REOPEN-TEST', repeat('e', 64), repeat('f', 64))
    ) as r(status text)$$,
  $$values ('denied'::text)$$,
  'an expired reopen token is denied even while still marked active'
);

-- An order that has been claimed by an account uses the signed-in flow.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000955', 'authenticated', 'authenticated',
  'reopen-owner@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

update public.checkout_orders
set owner_user_id = '00000000-0000-4000-8000-000000000955'
where id = '00000000-0000-4000-8000-000000000951';

insert into public.guest_order_access_tokens (id, order_id, contact_email, token_hash, purpose, expires_at)
values (
  '00000000-0000-4000-8000-000000000954',
  '00000000-0000-4000-8000-000000000951',
  'reopen@example.test',
  repeat('1', 64),
  'reopen_order',
  now() + interval '1 hour'
);

select results_eq(
  $$select status from jsonb_to_record(
      public.redeem_guest_order_reopen_token('ATB-REOPEN-TEST', repeat('1', 64), repeat('2', 64))
    ) as r(status text)$$,
  $$values ('denied'::text)$$,
  'an order owned by an account cannot be reopened through the guest link'
);

select * from finish();

rollback;
