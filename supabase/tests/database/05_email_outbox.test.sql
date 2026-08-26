begin;

select plan(43);

select has_table('public', 'transactional_email_outbox', 'transactional email outbox exists');
select col_not_null('public', 'transactional_email_outbox', 'event_type', 'outbox event type is required');
select col_not_null('public', 'transactional_email_outbox', 'recipient_email', 'outbox recipient is required');
select col_not_null('public', 'transactional_email_outbox', 'locale', 'outbox locale is required');
select col_not_null('public', 'transactional_email_outbox', 'status', 'outbox status is required');
select col_not_null('public', 'transactional_email_outbox', 'payload', 'outbox payload is required');
select col_type_is('public', 'transactional_email_outbox', 'available_at', 'timestamp with time zone', 'outbox send availability is explicit');
select has_index('public', 'transactional_email_outbox', 'transactional_email_outbox_pending_idx', 'pending email worker index exists');
select has_trigger('public', 'transactional_email_outbox', 'transactional_email_outbox_safe_payload', 'outbox rejects raw tokens and signed URLs');
select table_privs_are('public', 'transactional_email_outbox', 'anon', array[]::text[], 'anon has no outbox access');
select table_privs_are('public', 'transactional_email_outbox', 'authenticated', array[]::text[], 'authenticated has no outbox access');
select table_privs_are('public', 'transactional_email_outbox', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES', 'TRIGGER', 'TRUNCATE'], 'service role owns deferred email work');

select col_type_is('public', 'transactional_email_outbox', 'claim_token', 'uuid', 'outbox claim ownership is UUID-fenced');
select has_function(
  'public',
  'claim_transactional_emails',
  array['integer', 'integer'],
  'atomic email claim RPC exists'
);
select has_function(
  'public',
  'transition_transactional_email_claim',
  array['uuid', 'uuid', 'text', 'text', 'text', 'timestamp with time zone', 'timestamp with time zone'],
  'fenced email transition RPC exists'
);
select function_privs_are(
  'public',
  'transition_transactional_email_claim',
  array['uuid', 'uuid', 'text', 'text', 'text', 'timestamp with time zone', 'timestamp with time zone'],
  'anon',
  array[]::text[],
  'anonymous clients cannot transition email claims'
);
select function_privs_are(
  'public',
  'transition_transactional_email_claim',
  array['uuid', 'uuid', 'text', 'text', 'text', 'timestamp with time zone', 'timestamp with time zone'],
  'authenticated',
  array[]::text[],
  'authenticated clients cannot transition email claims'
);
select function_privs_are(
  'public',
  'transition_transactional_email_claim',
  array['uuid', 'uuid', 'text', 'text', 'text', 'timestamp with time zone', 'timestamp with time zone'],
  'service_role',
  array['EXECUTE'],
  'only the service worker can transition email claims'
);

insert into public.transactional_email_outbox (
  id,
  event_type,
  recipient_email,
  locale,
  payload,
  available_at
)
values (
  '85000000-0000-4000-8000-000000000001',
  'digital_access_granted',
  'claim-fence@example.test',
  'en',
  '{}'::jsonb,
  '-infinity'::timestamptz
);

create temporary table first_email_claim on commit drop as
select id, claim_token
from public.claim_transactional_emails(1, 30);

select isnt(
  (select claim_token from first_email_claim where id = '85000000-0000-4000-8000-000000000001'),
  null::uuid,
  'claim RPC assigns an ownership token'
);

update public.transactional_email_outbox
set claimed_at = now() - interval '31 seconds'
where id = '85000000-0000-4000-8000-000000000001';

create temporary table second_email_claim on commit drop as
select id, claim_token
from public.claim_transactional_emails(1, 30);

select isnt(
  (select claim_token from second_email_claim where id = '85000000-0000-4000-8000-000000000001'),
  (select claim_token from first_email_claim where id = '85000000-0000-4000-8000-000000000001'),
  'reclaim assigns a fresh ownership token'
);

select throws_ok(
  $$select public.transition_transactional_email_claim(
      '85000000-0000-4000-8000-000000000001',
      (select claim_token from second_email_claim where id = '85000000-0000-4000-8000-000000000001'),
      'cancelled',
      null,
      null,
      null,
      now()
    )$$,
  '22023',
  'invalid email claim transition status',
  'transition RPC rejects statuses outside the worker state machine'
);

select is(
  public.transition_transactional_email_claim(
    '85000000-0000-4000-8000-000000000001',
    (select claim_token from first_email_claim where id = '85000000-0000-4000-8000-000000000001'),
    'sent',
    'stale-provider-id',
    null,
    null,
    now()
  ),
  false,
  'stale claim cannot transition after reclaim'
);

select is(
  (select status from public.transactional_email_outbox where id = '85000000-0000-4000-8000-000000000001'),
  'sending',
  'stale transition leaves the current claim in progress'
);

select is(
  public.transition_transactional_email_claim(
    '85000000-0000-4000-8000-000000000001',
    (select claim_token from second_email_claim where id = '85000000-0000-4000-8000-000000000001'),
    'sent',
    'current-provider-id',
    null,
    null,
    now()
  ),
  true,
  'current claim can transition successfully'
);

select is(
  (select status from public.transactional_email_outbox where id = '85000000-0000-4000-8000-000000000001'),
  'sent',
  'current transition persists the terminal status'
);

select is(
  (select claim_token from public.transactional_email_outbox where id = '85000000-0000-4000-8000-000000000001'),
  null::uuid,
  'terminal transition clears claim ownership'
);

select has_function(
  'public',
  'issue_transactional_email_capability_for_outbox',
  array['uuid', 'text'],
  'atomic guest and newsletter capability issuance RPC exists'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.issue_transactional_email_capability_for_outbox(uuid,text)'::regprocedure
  ),
  true,
  'capability issuance RPC owns its authorization boundary'
);
select function_privs_are(
  'public',
  'issue_transactional_email_capability_for_outbox',
  array['uuid', 'text'],
  'anon',
  array[]::text[],
  'anonymous clients cannot issue email capabilities'
);
select function_privs_are(
  'public',
  'issue_transactional_email_capability_for_outbox',
  array['uuid', 'text'],
  'authenticated',
  array[]::text[],
  'authenticated clients cannot issue email capabilities'
);
select function_privs_are(
  'public',
  'issue_transactional_email_capability_for_outbox',
  array['uuid', 'text'],
  'service_role',
  array['EXECUTE'],
  'only the service worker can issue email capabilities'
);

insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, payment_intent, subtotal_minor, discount_minor, shipping_minor, total_minor,
  accepted_quote_hash, quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at
)
values (
  '85000000-0000-4000-8000-000000000010',
  'ATB-EMAIL-CAPABILITY',
  repeat('a', 64),
  'guest-capability@example.test',
  'en', 'intl', 'USD', 'pending_payment', 'paypal_intent',
  3000, 0, 0, 3000,
  'email-capability-hash', '{}'::jsonb, '[]'::jsonb,
  'guest', 'email-capability-key', now() + interval '25 minutes'
);

insert into public.transactional_email_outbox (
  id, order_id, event_type, recipient_email, locale, payload, created_at
)
values (
  '85000000-0000-4000-8000-000000000011',
  '85000000-0000-4000-8000-000000000010',
  'guest_order_reopen',
  'guest-capability@example.test',
  'en',
  jsonb_build_object('orderNumber', 'ATB-EMAIL-CAPABILITY'),
  date_trunc('second', now())
);

select isnt(
  public.issue_transactional_email_capability_for_outbox(
    '85000000-0000-4000-8000-000000000011', repeat('b', 64)
  ),
  null::timestamptz,
  'first guest provider attempt prepares a capability'
);
select is(
  public.issue_transactional_email_capability_for_outbox(
    '85000000-0000-4000-8000-000000000011', repeat('b', 64)
  ),
  (
    select expires_at
    from public.guest_order_access_tokens
    where source_email_outbox_id = '85000000-0000-4000-8000-000000000011'
  ),
  'provider retry reuses the canonical guest capability expiry'
);
select is(
  (
    select count(*)::integer
    from public.guest_order_access_tokens
    where source_email_outbox_id = '85000000-0000-4000-8000-000000000011'
  ),
  1,
  'provider retry creates no duplicate guest capability'
);
select is(
  public.issue_transactional_email_capability_for_outbox(
    '85000000-0000-4000-8000-000000000011', repeat('c', 64)
  ),
  null::timestamptz,
  'guest retry with a different derived token fails closed'
);
select is(
  (
    select count(*)::integer
    from public.guest_order_access_tokens
    where source_email_outbox_id = '85000000-0000-4000-8000-000000000011'
  ),
  1,
  'mismatched guest retry leaves the original capability intact'
);

select is(
  public.issue_transactional_email_capability_for_outbox(
    '85000000-0000-4000-8000-000000000011', repeat('b', 64)
  ),
  (
    select created_at + interval '24 hours'
    from public.transactional_email_outbox
    where id = '85000000-0000-4000-8000-000000000011'
  ),
  'guest expiry is derived as a database timestamp from the outbox creation time'
);

select is(
  public.subscribe_newsletter(
    'newsletter-capability@example.test', 'en', 'intl', 'footer', null, null
  )->>'status',
  'subscribed',
  'newsletter fixture creates authoritative subscriber state'
);

insert into public.transactional_email_outbox (
  id, event_type, recipient_email, locale, payload, created_at
)
values (
  '85000000-0000-4000-8000-000000000012',
  'newsletter_subscribed',
  'newsletter-capability@example.test',
  'en',
  '{}'::jsonb,
  date_trunc('second', now())
);

select isnt(
  public.issue_transactional_email_capability_for_outbox(
    '85000000-0000-4000-8000-000000000012', repeat('d', 64)
  ),
  null::timestamptz,
  'first newsletter provider attempt prepares a capability'
);
select is(
  public.issue_transactional_email_capability_for_outbox(
    '85000000-0000-4000-8000-000000000012', repeat('d', 64)
  ),
  (
    select expires_at
    from public.newsletter_unsubscribe_tokens
    where source_email_outbox_id = '85000000-0000-4000-8000-000000000012'
  ),
  'provider retry reuses the canonical newsletter capability expiry'
);
select is(
  (
    select count(*)::integer
    from public.newsletter_unsubscribe_tokens
    where source_email_outbox_id = '85000000-0000-4000-8000-000000000012'
  ),
  1,
  'provider retry creates no duplicate newsletter capability'
);
select is(
  public.issue_transactional_email_capability_for_outbox(
    '85000000-0000-4000-8000-000000000012', repeat('d', 64)
  ),
  (
    select created_at + interval '30 days'
    from public.transactional_email_outbox
    where id = '85000000-0000-4000-8000-000000000012'
  ),
  'newsletter expiry is derived as a database timestamp from the outbox creation time'
);
select is(
  public.issue_transactional_email_capability_for_outbox(
    '85000000-0000-4000-8000-000000000001', repeat('e', 64)
  ),
  null::timestamptz,
  'unsupported outbox events cannot mint guest or newsletter capabilities'
);

select * from finish();

rollback;

