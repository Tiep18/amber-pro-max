begin;

select plan(41);

select has_table('private', 'public_email_rate_limits', 'private public-email rate state exists');
select has_column('private', 'public_email_rate_limits', 'identity_hash', 'rate state stores a one-way identity');
select has_column('private', 'public_email_rate_limits', 'accepted_at', 'rate state keeps a bounded rolling-hour window');
select hasnt_column('private', 'public_email_rate_limits', 'raw_ip', 'rate state stores no raw IP');
select hasnt_column('private', 'public_email_rate_limits', 'email', 'rate state stores no raw email');
select table_privs_are('private', 'public_email_rate_limits', 'anon', array[]::text[], 'anonymous clients cannot inspect rate state');
select table_privs_are('private', 'public_email_rate_limits', 'authenticated', array[]::text[], 'authenticated clients cannot inspect rate state');

select has_function(
  'public', 'subscribe_newsletter',
  array['text', 'text', 'text', 'text', 'text', 'text', 'text'],
  'quota-aware newsletter RPC exists'
);
select function_privs_are(
  'public', 'subscribe_newsletter',
  array['text', 'text', 'text', 'text', 'text', 'text', 'text'],
  'anon', array[]::text[], 'anonymous callers cannot forge newsletter rate identities'
);
select function_privs_are(
  'public', 'subscribe_newsletter',
  array['text', 'text', 'text', 'text', 'text', 'text', 'text'],
  'authenticated', array[]::text[], 'authenticated callers cannot forge newsletter rate identities'
);
select function_privs_are(
  'public', 'subscribe_newsletter',
  array['text', 'text', 'text', 'text', 'text', 'text', 'text'],
  'service_role', array['EXECUTE'], 'only the trusted server may request newsletter email'
);

select has_function(
  'public', 'request_guest_order_email',
  array['text', 'text', 'text', 'text', 'text', 'text'],
  'atomic guest recovery-email RPC exists'
);
select function_privs_are(
  'public', 'request_guest_order_email',
  array['text', 'text', 'text', 'text', 'text', 'text'],
  'anon', array[]::text[], 'anonymous callers cannot forge guest rate identities'
);
select function_privs_are(
  'public', 'request_guest_order_email',
  array['text', 'text', 'text', 'text', 'text', 'text'],
  'authenticated', array[]::text[], 'authenticated callers cannot forge guest rate identities'
);
select function_privs_are(
  'public', 'request_guest_order_email',
  array['text', 'text', 'text', 'text', 'text', 'text'],
  'service_role', array['EXECUTE'], 'only the trusted server may request guest recovery email'
);

set local role service_role;

create temporary table newsletter_first as
select public.subscribe_newsletter(
  'quota-newsletter@example.test', 'en', 'intl', 'footer',
  repeat('1', 64), repeat('a', 64), repeat('b', 64)
) result;

create temporary table newsletter_repeat as
select public.subscribe_newsletter(
  ' QUOTA-NEWSLETTER@EXAMPLE.TEST ', 'vi', 'vn', 'footer',
  repeat('1', 64), repeat('a', 64), repeat('c', 64)
) result;

reset role;

select is((select result ->> 'status' from newsletter_first), 'subscribed', 'first newsletter request succeeds');
select is((select result ->> 'emailQueued' from newsletter_first), 'true', 'first newsletter request queues confirmation');
select is((select result ->> 'status' from newsletter_repeat), 'subscribed', 'existing subscriber receives the same safe success');
select is((select result ->> 'emailQueued' from newsletter_repeat), 'false', 'existing subscriber queues no duplicate confirmation');
select is((select count(*)::integer from public.newsletter_subscribers where normalized_email = 'quota-newsletter@example.test'), 1, 'repeated subscribe keeps one subscriber row');
select is((select count(*)::integer from public.newsletter_consent_events where normalized_email = 'quota-newsletter@example.test'), 1, 'repeated subscribe appends no duplicate consent event');
select is((select count(*)::integer from public.transactional_email_outbox where event_type = 'newsletter_subscribed' and recipient_email = 'quota-newsletter@example.test'), 1, 'repeated subscribe keeps one newsletter outbox row');

update public.newsletter_subscribers
set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
where normalized_email = 'quota-newsletter@example.test';
update private.public_email_rate_limits
set accepted_at = array[now() - interval '50 minutes', now() - interval '32 minutes'],
    expires_at = now() + interval '1 hour'
where scope = 'target' and action = 'newsletter_subscribe' and identity_hash = repeat('1', 64);

set local role service_role;
select public.subscribe_newsletter(
  'quota-newsletter@example.test', 'en', 'intl', 'footer',
  repeat('1', 64), repeat('a', 64), repeat('b', 64)
);
reset role;

update public.newsletter_subscribers
set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
where normalized_email = 'quota-newsletter@example.test';
update private.public_email_rate_limits
set accepted_at = array[now() - interval '50 minutes', now() - interval '32 minutes', now() - interval '16 minutes'],
    expires_at = now() + interval '1 hour'
where scope = 'target' and action = 'newsletter_subscribe' and identity_hash = repeat('1', 64);

set local role service_role;
create temporary table newsletter_limited as
select public.subscribe_newsletter(
  'quota-newsletter@example.test', 'en', 'intl', 'footer',
  repeat('1', 64), repeat('a', 64), repeat('b', 64)
) result;
reset role;

select is((select result ->> 'status' from newsletter_limited), 'subscribed', 'newsletter throttle remains a generic success');
select is((select result ->> 'emailQueued' from newsletter_limited), 'false', 'three-per-hour newsletter target budget prevents a fourth email');
select is((select status from public.newsletter_subscribers where normalized_email = 'quota-newsletter@example.test'), 'unsubscribed', 'throttled resubscribe does not mutate consent state');
select is((select count(*)::integer from public.transactional_email_outbox where event_type = 'newsletter_subscribed' and recipient_email = 'quota-newsletter@example.test'), 2, 'newsletter hourly limit prevents an extra outbox row');

insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, payment_intent, subtotal_minor, discount_minor, shipping_minor, total_minor,
  accepted_quote_hash, quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at
) values (
  '85900000-0000-4000-8000-000000000010', 'ATB-PUBLIC-EMAIL-QUOTA', repeat('e', 64),
  'quota-guest@example.test', 'en', 'intl', 'USD', 'pending_payment', 'paypal_intent',
  1000, 0, 0, 1000, 'public-email-quota-hash', '{}'::jsonb, '[]'::jsonb,
  'guest', 'public-email-quota-key', now() + interval '30 minutes'
);

set local role service_role;
create temporary table guest_first as
select public.request_guest_order_email(
  'atb-public-email-quota', 'QUOTA-GUEST@EXAMPLE.TEST', 'vi', 'reopen_order',
  repeat('3', 64), repeat('d', 64)
) result;
create temporary table guest_repeat as
select public.request_guest_order_email(
  'ATB-PUBLIC-EMAIL-QUOTA', 'quota-guest@example.test', 'en', 'reopen_order',
  repeat('3', 64), repeat('d', 64)
) result;
create temporary table guest_claim as
select public.request_guest_order_email(
  'ATB-PUBLIC-EMAIL-QUOTA', 'quota-guest@example.test', 'en', 'claim_order',
  repeat('4', 64), repeat('d', 64)
) result;
create temporary table guest_missing as
select public.request_guest_order_email(
  'ATB-DOES-NOT-EXIST', 'nobody@example.test', 'en', 'reopen_order',
  repeat('5', 64), repeat('d', 64)
) result;
reset role;

select is((select result ->> 'status' from guest_first), 'sent', 'matching guest reopen returns generic sent');
select is((select count(*)::integer from public.transactional_email_outbox where order_id = '85900000-0000-4000-8000-000000000010' and event_type = 'guest_order_reopen'), 1, 'first guest reopen queues one authoritative email');
select is((select result ->> 'status' from guest_repeat), 'sent', 'cooldown denial remains generic sent');
select is((select count(*)::integer from public.transactional_email_outbox where order_id = '85900000-0000-4000-8000-000000000010' and event_type = 'guest_order_reopen'), 1, 'guest cooldown prevents a duplicate outbox row');
select is((select count(*)::integer from public.transactional_email_outbox where order_id = '85900000-0000-4000-8000-000000000010' and event_type = 'guest_order_claim'), 1, 'claim-email has a separate action budget');
select is((select result ->> 'status' from guest_missing), 'sent', 'missing guest order is indistinguishable from a match');
select is((select count(*)::integer from public.transactional_email_outbox where recipient_email = 'nobody@example.test'), 0, 'missing guest request creates no email intent');

update private.public_email_rate_limits
set accepted_at = array[
      now() - interval '55 minutes', now() - interval '44 minutes',
      now() - interval '33 minutes', now() - interval '22 minutes',
      now() - interval '11 minutes'
    ], expires_at = now() + interval '1 hour'
where scope = 'target' and action = 'guest_order_reopen' and identity_hash = repeat('3', 64);

set local role service_role;
select public.request_guest_order_email(
  'ATB-PUBLIC-EMAIL-QUOTA', 'quota-guest@example.test', 'en', 'reopen_order',
  repeat('3', 64), repeat('6', 64)
);
reset role;
select is((select count(*)::integer from public.transactional_email_outbox where order_id = '85900000-0000-4000-8000-000000000010' and event_type = 'guest_order_reopen'), 1, 'five-per-hour guest target budget prevents another email');

set local role service_role;
do $$
declare
  i integer;
begin
  for i in 1..20 loop
    perform public.request_guest_order_email(
      'ATB-MISSING-' || i::text, 'missing-' || i::text || '@example.test', 'en',
      case when i % 2 = 0 then 'reopen_order' else 'claim_order' end,
      encode(extensions.digest('public-email-target-' || i::text, 'sha256'), 'hex'),
      repeat('9', 64)
    );
  end loop;
end;
$$;
select public.request_guest_order_email(
  'ATB-PUBLIC-EMAIL-QUOTA', 'quota-guest@example.test', 'en', 'claim_order',
  repeat('8', 64), repeat('9', 64)
);
reset role;
select is((select count(*)::integer from public.transactional_email_outbox where order_id = '85900000-0000-4000-8000-000000000010' and event_type = 'guest_order_claim'), 1, 'shared twenty-per-hour IP budget protects quota across actions');
select ok((select bool_and(identity_hash ~ '^[a-f0-9]{64}$' and identity_hash <> '203.0.113.10') from private.public_email_rate_limits), 'rate state contains only fixed-length privacy-safe identities');

update public.transactional_email_outbox set status = 'cancelled' where status = 'pending';
insert into public.transactional_email_outbox (
  id, event_type, recipient_email, locale, payload, available_at, created_at
) values
  ('85900000-0000-4000-8000-000000000101', 'newsletter_subscribed', 'priority@example.test', 'en', '{}'::jsonb, now() - interval '4 minutes', now() - interval '4 minutes'),
  ('85900000-0000-4000-8000-000000000102', 'physical_shipped', 'priority@example.test', 'en', '{}'::jsonb, now() - interval '3 minutes', now() - interval '3 minutes'),
  ('85900000-0000-4000-8000-000000000103', 'digital_access_granted', 'priority@example.test', 'en', '{}'::jsonb, now() - interval '2 minutes', now() - interval '2 minutes'),
  ('85900000-0000-4000-8000-000000000104', 'payment_received', 'priority@example.test', 'en', '{}'::jsonb, now() - interval '1 minute', now() - interval '1 minute');

create temporary table priority_claim_1 as select * from public.claim_transactional_emails(1, 300);
create temporary table priority_claim_2 as select * from public.claim_transactional_emails(1, 300);
create temporary table priority_claim_3 as select * from public.claim_transactional_emails(1, 300);
create temporary table priority_claim_4 as select * from public.claim_transactional_emails(1, 300);

select is((select event_type from priority_claim_1), 'payment_received', 'payment confirmation claims first despite later availability');
select is((select event_type from priority_claim_2), 'digital_access_granted', 'digital access claims before other transactional email');
select is((select event_type from priority_claim_3), 'physical_shipped', 'other transactional email claims before newsletter');
select is((select event_type from priority_claim_4), 'newsletter_subscribed', 'newsletter consumes remaining claim capacity last');

insert into public.transactional_email_outbox (
  id, event_type, recipient_email, locale, payload, available_at, created_at
) values
  ('85900000-0000-4000-8000-000000000105', 'newsletter_subscribed', 'fifo-old@example.test', 'en', '{}'::jsonb, now() - interval '1 minute', now() - interval '2 minutes'),
  ('85900000-0000-4000-8000-000000000106', 'newsletter_subscribed', 'fifo-new@example.test', 'en', '{}'::jsonb, now() - interval '1 minute', now() - interval '1 minute');
create temporary table priority_fifo_claim as select * from public.claim_transactional_emails(1, 300);
select is((select id from priority_fifo_claim), '85900000-0000-4000-8000-000000000105'::uuid, 'claim priority preserves FIFO order inside a tier');

select * from finish();

rollback;
