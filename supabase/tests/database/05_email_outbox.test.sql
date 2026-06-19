begin;

select plan(12);

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

select * from finish();

rollback;

