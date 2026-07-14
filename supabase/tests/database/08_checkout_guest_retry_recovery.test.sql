begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('private', 'checkout_guest_attempt_claims', 'guest recovery claims are private');
select col_is_pk('private', 'checkout_guest_attempt_claims', 'attempt_id_hash', 'attempt hash is the concurrency boundary');
select col_is_unique('private', 'checkout_guest_attempt_claims', 'order_id', 'one order can be claimed by only one guest attempt');
select table_privs_are('private', 'checkout_guest_attempt_claims', 'anon', array[]::text[], 'anon cannot read claims');
select table_privs_are('private', 'checkout_guest_attempt_claims', 'authenticated', array[]::text[], 'authenticated cannot read claims');
select function_privs_are('private', 'submit_checkout_authority_v2', array['jsonb'], 'anon', array[]::text[], 'anon cannot bypass recovery claiming');
select matches(pg_get_functiondef('public.submit_checkout(jsonb)'::regprocedure), 'return result - ''guestAccessToken''', 'public submit strips legacy guest tokens');
select matches(pg_get_functiondef('public.submit_checkout(jsonb)'::regprocedure), 'p_payload - ''guestRecovery''', 'raw recovery input is stripped before persistence');

create temporary table guest_retry_results (name text primary key, result jsonb);
insert into guest_retry_results values (
  'first',
  public.submit_checkout(jsonb_build_object(
    'guestRecovery', jsonb_build_object('attemptId', repeat('K', 43), 'proof', repeat('L', 43)),
    'idempotencyKey', 'browser-value-is-ignored'
  ))
);
select is((select result ->> 'status' from guest_retry_results where name = 'first'), 'stale', 'a claimed attempt still receives generic stale submit behavior');
select is(
  (select attempt_id_hash from private.checkout_guest_attempt_claims),
  encode(extensions.digest(repeat('K', 43), 'sha256'), 'hex'),
  'only the attempt hash is persisted'
);

insert into guest_retry_results values (
  'wrong-proof',
  public.submit_checkout(jsonb_build_object(
    'guestRecovery', jsonb_build_object('attemptId', repeat('K', 43), 'proof', repeat('M', 43)),
    'idempotencyKey', 'different-browser-value'
  ))
);
select is((select result ->> 'code' from guest_retry_results where name = 'wrong-proof'), 'guest_checkout_conflict', 'same attempt with a different proof discloses only a generic conflict');
select is((select count(*)::integer from private.checkout_guest_attempt_claims), 1, 'a different proof cannot create a duplicate claim');

select * from finish();
rollback;
