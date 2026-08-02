begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select has_function(
  'public',
  'get_payment_expiry_job_health',
  array['integer'],
  'payment expiry job health RPC exists'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.get_payment_expiry_job_health(integer)'::regprocedure),
  true,
  'health RPC owns its authorization boundary'
);

select function_privs_are(
  'public',
  'get_payment_expiry_job_health',
  array['integer'],
  'anon',
  array[]::text[],
  'anonymous role cannot invoke the health RPC'
);

select has_table('public', 'system_job_runs', 'system_job_runs table exists');

select table_privs_are(
  'public',
  'system_job_runs',
  'anon',
  array[]::text[],
  'anonymous role has no access to job run history'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '04500000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'expiry-customer@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '04500000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'expiry-admin@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  ('04500000-0000-4000-8000-000000000001', 'expiry-customer@example.test', 'en'),
  ('04500000-0000-4000-8000-000000000002', 'expiry-admin@example.test', 'en');

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '04500000-0000-4000-8000-000000000002',
  'admin',
  '04500000-0000-4000-8000-000000000002',
  'payment expiry job health test admin'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '04500000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$select public.get_payment_expiry_job_health()$$,
  '42501',
  'admin access required',
  'non-admin users cannot read job health'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '04500000-0000-4000-8000-000000000002', true);

select results_eq(
  $$select "extensionAvailable" from jsonb_to_record(public.get_payment_expiry_job_health()) as r("extensionAvailable" boolean)$$,
  $$values (false)$$,
  'pg_cron is not enabled on a local instance, health degrades cleanly'
);

select results_eq(
  $$select scheduled from jsonb_to_record(public.get_payment_expiry_job_health()) as r(scheduled boolean)$$,
  $$values (false)$$,
  'job is reported as not scheduled without pg_cron'
);

select results_eq(
  $$select "fallbackRecentSuccess" from jsonb_to_record(public.get_payment_expiry_job_health()) as r("fallbackRecentSuccess" boolean)$$,
  $$values (false)$$,
  'fallback has not recorded a run yet'
);

reset role;

insert into public.system_job_runs (job_name, status, ran_at, detail)
values ('trusted-payment-expiry-http', 'succeeded', now(), jsonb_build_object('processed', 2));

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '04500000-0000-4000-8000-000000000002', true);

select results_eq(
  $$select "fallbackRecentSuccess" from jsonb_to_record(public.get_payment_expiry_job_health()) as r("fallbackRecentSuccess" boolean)$$,
  $$values (true)$$,
  'a recent successful fallback run is reflected in the health signal'
);

reset role;

-- A fallback that only runs daily (hosting plans that cap cron frequency) must
-- still read as healthy when told its real interval, and must NOT read as
-- healthy against the tight default — otherwise the gate lies in one direction
-- or the other.
update public.system_job_runs
set ran_at = now() - interval '6 hours'
where job_name = 'trusted-payment-expiry-http';

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '04500000-0000-4000-8000-000000000002', true);

select results_eq(
  $$select "fallbackRecentSuccess" from jsonb_to_record(
      public.get_payment_expiry_job_health(1440)
    ) as r("fallbackRecentSuccess" boolean)$$,
  $$values (true)$$,
  'a daily-cadence fallback is healthy when the gate is told its real interval'
);

select results_eq(
  $$select "fallbackRecentSuccess" from jsonb_to_record(
      public.get_payment_expiry_job_health(1)
    ) as r("fallbackRecentSuccess" boolean)$$,
  $$values (false)$$,
  'the same six-hour-old run is stale against a one-minute cadence'
);

reset role;

select * from finish();

rollback;
