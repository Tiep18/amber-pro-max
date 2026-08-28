begin;

select plan(67);

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
    'newsletter-capability@example.test', 'en', 'intl', 'footer',
    repeat('1', 64), repeat('2', 64), null
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

select has_column(
  'public',
  'transactional_email_outbox',
  'version',
  'admin retry has an integer stale-form fence'
);
select has_function(
  'public',
  'admin_retry_transactional_email',
  array['uuid', 'integer'],
  'atomic admin transactional email retry RPC exists'
);
select function_privs_are(
  'public',
  'admin_retry_transactional_email',
  array['uuid', 'integer'],
  'anon',
  array[]::text[],
  'anonymous clients cannot retry transactional emails'
);
select function_privs_are(
  'public',
  'admin_retry_transactional_email',
  array['uuid', 'integer'],
  'authenticated',
  array['EXECUTE'],
  'authenticated admins reach the retry RPC authorization boundary'
);
select function_privs_are(
  'public',
  'admin_retry_transactional_email',
  array['uuid', 'integer'],
  'service_role',
  array[]::text[],
  'service workers cannot invoke the human admin retry action'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '85000000-0000-4000-8000-000000000099',
  'authenticated', 'authenticated', 'email-recovery-admin@example.test', 'x', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
);
insert into public.profiles (id, email, preferred_locale)
values (
  '85000000-0000-4000-8000-000000000099',
  'email-recovery-admin@example.test',
  'en'
);
insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '85000000-0000-4000-8000-000000000099',
  'admin',
  '85000000-0000-4000-8000-000000000099',
  'atomic email recovery test'
);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '85000000-0000-4000-8000-000000000099', true);

update public.checkout_orders
set paid_gate_status = 'open'
where id = '85000000-0000-4000-8000-000000000010';

insert into public.transactional_email_outbox (
  id, order_id, event_type, recipient_email, locale, status, payload,
  available_at, attempt_count, version
) values
(
  '85000000-0000-4000-8000-000000000030',
  '85000000-0000-4000-8000-000000000010',
  'physical_shipped', 'guest-capability@example.test', 'en', 'failed',
  jsonb_build_object('orderNumber', 'ATB-EMAIL-CAPABILITY'),
  now() - interval '1 minute', 4, 2
),
(
  '85000000-0000-4000-8000-000000000031',
  '85000000-0000-4000-8000-000000000010',
  'physical_shipped', 'guest-capability@example.test', 'en', 'sent',
  jsonb_build_object('orderNumber', 'ATB-EMAIL-CAPABILITY'),
  now() - interval '1 minute', 1, 1
),
(
  '85000000-0000-4000-8000-000000000032',
  '85000000-0000-4000-8000-000000000010',
  'physical_shipped', 'forged-recipient@example.test', 'en', 'failed',
  jsonb_build_object('orderNumber', 'ATB-EMAIL-CAPABILITY'),
  now() - interval '1 minute', 1, 1
);

select is(
  public.admin_retry_transactional_email(
    '85000000-0000-4000-8000-000000000030', 1
  )->>'status',
  'stale',
  'stale admin form cannot retry a newer outbox version'
);
select is(
  (select status from public.transactional_email_outbox where id = '85000000-0000-4000-8000-000000000030'),
  'failed',
  'stale admin retry leaves the failed row unchanged'
);

update public.transactional_email_outbox
set status = 'sending', claimed_at = now(), claim_token = gen_random_uuid()
where id = '85000000-0000-4000-8000-000000000030';
select is(
  public.admin_retry_transactional_email(
    '85000000-0000-4000-8000-000000000030', 2
  )->>'status',
  'stale',
  'admin retry rejects an actively leased row'
);

update public.transactional_email_outbox
set claimed_at = now() - interval '6 minutes'
where id = '85000000-0000-4000-8000-000000000030';
select is(
  public.admin_retry_transactional_email(
    '85000000-0000-4000-8000-000000000030', 2
  )->>'status',
  'queued',
  'admin retry may recover an expired worker lease'
);
select is(
  (select status from public.transactional_email_outbox where id = '85000000-0000-4000-8000-000000000030'),
  'pending',
  'expired lease recovery queues the same outbox row'
);
select is(
  (select version from public.transactional_email_outbox where id = '85000000-0000-4000-8000-000000000030'),
  3,
  'successful admin retry advances the outbox version'
);
select is(
  (select attempt_count from public.transactional_email_outbox where id = '85000000-0000-4000-8000-000000000030'),
  4,
  'manual retry preserves historical provider attempt count'
);
select is(
  (select count(*)::integer from public.fulfillment_audit_events where event_key = 'transactional_email_retry_queued:85000000-0000-4000-8000-000000000030:3'),
  1,
  'retry state and admin audit event commit together'
);
select is(
  public.admin_retry_transactional_email(
    '85000000-0000-4000-8000-000000000030', 2
  )->>'status',
  'stale',
  'a second stale click cannot queue the same retry twice'
);
select is(
  public.admin_retry_transactional_email(
    '85000000-0000-4000-8000-000000000031', 1
  )->>'status',
  'stale',
  'sent email can never be reset to pending'
);
select is(
  public.admin_retry_transactional_email(
    '85000000-0000-4000-8000-000000000032', 1
  )->>'status',
  'stale',
  'forged recipient relationship fails closed'
);

insert into public.checkout_order_lines (
  id, order_id, product_id, line_id, product_title, fulfillment_type,
  market, currency_code, quantity, unit_price_minor, line_subtotal_minor,
  quote_line_snapshot
) values
(
  '85000000-0000-4000-8000-000000000040',
  '85000000-0000-4000-8000-000000000010',
  '50000000-0000-0000-0000-000000000001', 'email-expired-line',
  'Expired capability pattern', 'digital', 'intl', 'USD', 1, 1000, 1000, '{}'::jsonb
),
(
  '85000000-0000-4000-8000-000000000041',
  '85000000-0000-4000-8000-000000000010',
  '50000000-0000-0000-0000-000000000001', 'email-resend-line',
  'Resend pattern', 'digital', 'intl', 'USD', 1, 1000, 1000, '{}'::jsonb
),
(
  '85000000-0000-4000-8000-000000000042',
  '85000000-0000-4000-8000-000000000010',
  '50000000-0000-0000-0000-000000000001', 'email-rollback-line',
  'Rollback pattern', 'digital', 'intl', 'USD', 1, 1000, 1000, '{}'::jsonb
);

insert into public.digital_entitlements (
  id, order_id, order_line_id, contact_email, product_id, status, version
) values
(
  '85000000-0000-4000-8000-000000000050',
  '85000000-0000-4000-8000-000000000010',
  '85000000-0000-4000-8000-000000000040',
  'guest-capability@example.test', '50000000-0000-0000-0000-000000000001', 'active', 1
),
(
  '85000000-0000-4000-8000-000000000051',
  '85000000-0000-4000-8000-000000000010',
  '85000000-0000-4000-8000-000000000041',
  'guest-capability@example.test', '50000000-0000-0000-0000-000000000001', 'active', 1
),
(
  '85000000-0000-4000-8000-000000000052',
  '85000000-0000-4000-8000-000000000010',
  '85000000-0000-4000-8000-000000000042',
  'guest-capability@example.test', '50000000-0000-0000-0000-000000000001', 'active', 1
);

insert into public.transactional_email_outbox (
  id, order_id, entitlement_id, event_type, recipient_email, locale, status,
  payload, available_at
) values (
  '85000000-0000-4000-8000-000000000060',
  '85000000-0000-4000-8000-000000000010',
  '85000000-0000-4000-8000-000000000050',
  'digital_access_granted', 'guest-capability@example.test', 'en', 'failed',
  jsonb_build_object('orderNumber', 'ATB-EMAIL-CAPABILITY', 'entitlementVersion', 1),
  now() - interval '1 minute'
);
insert into public.digital_access_tokens (
  entitlement_id, token_hash, purpose, status, expires_at, source_email_outbox_id
) values (
  '85000000-0000-4000-8000-000000000050', repeat('f', 64), 'download', 'active',
  now() - interval '1 minute', '85000000-0000-4000-8000-000000000060'
);
select is(
  public.admin_retry_transactional_email(
    '85000000-0000-4000-8000-000000000060', 1
  )->>'status',
  'stale',
  'expired digital capability requires an explicit fresh resend'
);

select is(
  public.reissue_digital_access_token(
    '85000000-0000-4000-8000-000000000051', 1
  )->>'status',
  'reissued',
  'digital resend succeeds from entitlement identity and expected version only'
);
select is(
  (
    select recipient_email || '|' || locale || '|' || (payload ->> 'orderNumber')
    from public.transactional_email_outbox
    where entitlement_id = '85000000-0000-4000-8000-000000000051'
      and event_type = 'digital_access_reissued'
  ),
  'guest-capability@example.test|en|ATB-EMAIL-CAPABILITY',
  'digital resend derives recipient locale and order number from database records'
);
select is(
  (
    select count(*)::integer
    from public.fulfillment_audit_events
    where entitlement_id = '85000000-0000-4000-8000-000000000051'
      and event_type = 'digital_access_reissued'
  ),
  1,
  'digital resend creates exactly one matching audit event'
);

insert into public.digital_access_tokens (
  entitlement_id, token_hash, purpose, status, expires_at
) values (
  '85000000-0000-4000-8000-000000000052', repeat('e', 64), 'download', 'active',
  now() + interval '1 hour'
);
insert into public.fulfillment_audit_events (
  event_key, order_id, entitlement_id, event_type, actor_type, actor_id, metadata
) values (
  'digital_access_reissued:85000000-0000-4000-8000-000000000052:2',
  '85000000-0000-4000-8000-000000000010',
  '85000000-0000-4000-8000-000000000052',
  'digital_access_reissued', 'admin',
  '85000000-0000-4000-8000-000000000099', '{}'::jsonb
);
create function pg_temp.reissue_with_unique_violation_caught()
returns text
language plpgsql
as $$
begin
  perform public.reissue_digital_access_token(
    '85000000-0000-4000-8000-000000000052', 1
  );
  return 'unexpected_success';
exception when unique_violation then
  return 'unique_violation';
end;
$$;
select is(
  pg_temp.reissue_with_unique_violation_caught(),
  'unique_violation',
  'audit insertion failure aborts the resend transaction'
);
select is(
  (select version from public.digital_entitlements where id = '85000000-0000-4000-8000-000000000052'),
  1,
  'failed audit insertion rolls entitlement version back'
);
select is(
  (select status from public.digital_access_tokens where entitlement_id = '85000000-0000-4000-8000-000000000052'),
  'active',
  'failed audit insertion rolls token revocation back'
);
select is(
  (
    select count(*)::integer
    from public.transactional_email_outbox
    where entitlement_id = '85000000-0000-4000-8000-000000000052'
      and event_type = 'digital_access_reissued'
  ),
  0,
  'failed audit insertion rolls replacement outbox creation back'
);

select * from finish();

rollback;

