begin;

select plan(13);

select has_table('public', 'guest_order_access_tokens', 'guest reopen and claim token table exists');
select col_is_fk('public', 'guest_order_access_tokens', 'order_id', 'guest token references order');
select col_type_is('public', 'guest_order_access_tokens', 'token_hash', 'text', 'guest token stores only a hash');
select col_type_is('public', 'guest_order_access_tokens', 'purpose', 'text', 'guest token purpose is scoped');
select col_type_is('public', 'guest_order_access_tokens', 'expires_at', 'timestamp with time zone', 'guest token expiry is explicit');
select col_type_is('public', 'guest_order_access_tokens', 'consumed_at', 'timestamp with time zone', 'guest token consumption is retained');
select has_index('public', 'guest_order_access_tokens', 'guest_order_access_tokens_order_idx', 'guest token lookup is scoped by order purpose and status');
select table_privs_are('public', 'guest_order_access_tokens', 'anon', array[]::text[], 'anon cannot read claim hashes');
select table_privs_are('public', 'guest_order_access_tokens', 'authenticated', array[]::text[], 'authenticated cannot read claim hashes');
select throws_ok(
  $$insert into public.guest_order_access_tokens(order_id, contact_email, token_hash, purpose, expires_at) values (gen_random_uuid(), 'buyer@example.test', 'short', 'claim_order', now() + interval '24 hours')$$,
  null,
  null,
  'guest claim token rejects raw short token material'
);
select throws_ok(
  $$insert into public.guest_order_access_tokens(order_id, contact_email, token_hash, purpose, expires_at) values (gen_random_uuid(), 'buyer@example.test', repeat('a', 64), 'download', now() + interval '24 hours')$$,
  null,
  null,
  'guest claim token purpose must be explicit and narrow'
);
select policies_are('public', 'guest_order_access_tokens', array['guest order access tokens are admin managed'], 'guest tokens are admin/service managed only');
select table_privs_are('public', 'guest_order_access_tokens', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES', 'TRIGGER', 'TRUNCATE'], 'service role manages guest token lifecycle');

select * from finish();

rollback;

