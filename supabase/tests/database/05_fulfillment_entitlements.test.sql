begin;

select plan(28);

select has_table('public', 'digital_entitlements', 'paid digital entitlement table exists');
select has_table('public', 'digital_access_tokens', 'download token table exists');
select has_table('public', 'transactional_email_outbox', 'email outbox exists');
select has_table('public', 'fulfillment_audit_events', 'fulfillment audit table exists');
select has_function('private', 'grant_paid_digital_entitlements', array['uuid', 'uuid'], 'paid transition helper exists');
select has_function('public', 'revoke_digital_entitlement', array['uuid', 'integer', 'text'], 'admin revoke RPC exists');
select has_function('public', 'reissue_digital_access_token', array['uuid', 'integer', 'text'], 'admin reissue RPC exists');

select col_is_fk('public', 'digital_entitlements', 'order_id', 'entitlements reference orders');
select col_is_fk('public', 'digital_entitlements', 'order_line_id', 'entitlements reference immutable order lines');
select col_type_is('public', 'digital_entitlements', 'status', 'text', 'entitlement status is explicit');
select col_type_is('public', 'digital_entitlements', 'version', 'integer', 'entitlement version supports stale-state checks');
select has_index('public', 'digital_entitlements', 'digital_entitlements_one_active_line_idx', 'one active entitlement per paid digital order line');

select col_is_fk('public', 'digital_access_tokens', 'entitlement_id', 'download tokens reference entitlement');
select col_type_is('public', 'digital_access_tokens', 'token_hash', 'text', 'download token stores a hash');
select col_type_is('public', 'digital_access_tokens', 'expires_at', 'timestamp with time zone', 'download token expiry is explicit');
select col_type_is('public', 'digital_access_tokens', 'revoked_at', 'timestamp with time zone', 'download token revocation timestamp is explicit');

select col_type_is('public', 'transactional_email_outbox', 'event_type', 'text', 'outbox records typed fulfillment email intent');
select col_type_is('public', 'transactional_email_outbox', 'payload', 'jsonb', 'outbox payload is structured and sanitized');
select has_index('public', 'transactional_email_outbox', 'transactional_email_outbox_pending_idx', 'pending emails are indexed');

select has_trigger('public', 'payment_transitions', 'payment_transition_grants_digital_entitlements', 'paid payment transitions grant digital entitlements');
select has_trigger('public', 'transactional_email_outbox', 'transactional_email_outbox_safe_payload', 'email payload rejects unsafe token or signed URL data');
select has_trigger('public', 'fulfillment_audit_events', 'fulfillment_audit_events_append_only', 'fulfillment audit is append-only');

select throws_ok(
  $$insert into public.digital_access_tokens(entitlement_id, token_hash, expires_at) values (gen_random_uuid(), 'raw-short', now() + interval '24 hours')$$,
  null,
  null,
  'short raw-looking token material is rejected by token_hash length check'
);

select throws_ok(
  $$insert into public.transactional_email_outbox(event_type, recipient_email, locale, payload) values ('digital_access_granted', 'buyer@example.test', 'en', '{"signed_url":"https://example.test/private.pdf"}'::jsonb)$$,
  null,
  null,
  'outbox rejects signed URLs and private object details'
);

select function_privs_are('public', 'revoke_digital_entitlement', array['uuid', 'integer', 'text'], 'anon', array[]::text[], 'anon cannot revoke entitlements');
select function_privs_are('public', 'reissue_digital_access_token', array['uuid', 'integer', 'text'], 'anon', array[]::text[], 'anon cannot reissue download tokens');
select table_privs_are('public', 'digital_access_tokens', 'authenticated', array[]::text[], 'authenticated customers cannot read token hashes directly');
select table_privs_are('public', 'transactional_email_outbox', 'authenticated', array[]::text[], 'customers cannot read email payloads directly');

select * from finish();

rollback;
