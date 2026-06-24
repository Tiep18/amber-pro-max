begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select has_table('public', 'operational_errors', 'operational errors table exists');
select has_function('private', 'operational_error_safe_json', array['jsonb'], 'operational error safe json function exists');
select col_is_pk('public', 'operational_errors', 'id', 'operational errors use id primary key');
select has_column('public', 'operational_errors', 'sanitized_facts', 'sanitized facts column exists');

insert into public.operational_errors (
  id,
  area,
  severity,
  error_code,
  summary,
  sanitized_facts
)
values (
  '76000000-0000-0000-0000-000000000001',
  'payment',
  'error',
  'paypal:capture_failed',
  'PayPal capture failed after provider verification',
  '{"providerOrderId":"ORDER-123","status":"DECLINED","amountCurrency":"USD"}'::jsonb
);

select is(
  (
    select status
    from public.operational_errors
    where id = '76000000-0000-0000-0000-000000000001'
  ),
  'unresolved',
  'new operational errors start unresolved'
);

select throws_ok(
  $$insert into public.operational_errors (area, error_code, summary, sanitized_facts)
    values ('email', 'raw_leak', 'Unsafe raw error', '{"customerEmail":"buyer@example.com"}'::jsonb)$$,
  'P0001',
  'unsafe operational error facts',
  'email-like PII is rejected before storage'
);

select throws_ok(
  $$insert into public.operational_errors (area, error_code, summary, sanitized_facts)
    values ('application', 'token_leak', 'Unsafe token error', '{"accessToken":"secret-token"}'::jsonb)$$,
  'P0001',
  'unsafe operational error facts',
  'token-shaped facts are rejected before storage'
);

update public.operational_errors
set status = 'resolved',
    resolved_by = null
where id = '76000000-0000-0000-0000-000000000001';

select isnt(
  (
    select resolved_at
    from public.operational_errors
    where id = '76000000-0000-0000-0000-000000000001'
  ),
  null,
  'resolving an operational error stamps resolved_at'
);

select ok(
  private.operational_error_safe_json('{"area":"checkout","orderNumber":"AM-1001"}'::jsonb),
  'safe operational facts are accepted'
);

select isnt(
  has_table_privilege('anon', 'public.operational_errors', 'select'),
  true,
  'anonymous users cannot select operational errors'
);

select isnt(
  has_table_privilege('authenticated', 'public.operational_errors', 'select'),
  false,
  'authenticated role has table grant gated by RLS'
);

select ok(
  has_table_privilege('service_role', 'public.operational_errors', 'insert'),
  'service role can insert sanitized operational error fixtures'
);

select * from finish();

rollback;
