create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;

delete from public.transactional_email_outbox
where order_id = '85910000-0000-4000-8000-000000000010';
delete from public.checkout_orders
where id = '85910000-0000-4000-8000-000000000010';
delete from private.public_email_rate_limits
where identity_hash in (repeat('7', 64), repeat('8', 64));

insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market, currency_code,
  status, payment_intent, subtotal_minor, discount_minor, shipping_minor, total_minor,
  accepted_quote_hash, quote_snapshot, cart_snapshot, idempotency_actor, idempotency_key,
  reservation_expires_at
) values (
  '85910000-0000-4000-8000-000000000010', 'ATB-PUBLIC-EMAIL-RACE', repeat('f', 64),
  'quota-race@example.test', 'en', 'intl', 'USD', 'pending_payment', 'paypal_intent',
  1000, 0, 0, 1000, 'public-email-race-hash', '{}'::jsonb, '[]'::jsonb,
  'guest', 'public-email-race-key', now() + interval '30 minutes'
);

create or replace function public.test_public_email_quota_race()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  execute $call$
    select public.request_guest_order_email(
      'ATB-PUBLIC-EMAIL-RACE', 'quota-race@example.test', 'en', 'reopen_order',
      repeat('7', 64), repeat('8', 64)
    )
  $call$ into result;
  return result;
end;
$$;
revoke all on function public.test_public_email_quota_race() from public, anon, authenticated, service_role;

select extensions.dblink_connect('public_email_quota_a', 'host=db port=5432 dbname=postgres user=postgres password=postgres');
select extensions.dblink_connect('public_email_quota_b', 'host=db port=5432 dbname=postgres user=postgres password=postgres');
select extensions.dblink_send_query('public_email_quota_a', 'select public.test_public_email_quota_race()');
select extensions.dblink_send_query('public_email_quota_b', 'select public.test_public_email_quota_race()');

create temporary table public_email_quota_race_results(result jsonb);
insert into public_email_quota_race_results
select result from extensions.dblink_get_result('public_email_quota_a') as response(result jsonb);
insert into public_email_quota_race_results
select result from extensions.dblink_get_result('public_email_quota_b') as response(result jsonb);
select extensions.dblink_disconnect('public_email_quota_a');
select extensions.dblink_disconnect('public_email_quota_b');

begin;
select plan(3);
select is((select count(*)::integer from public_email_quota_race_results where result ->> 'status' = 'sent'), 2, 'concurrent public responses remain indistinguishable');
select is((select count(*)::integer from public.transactional_email_outbox where order_id = '85910000-0000-4000-8000-000000000010' and event_type = 'guest_order_reopen'), 1, 'concurrent requests enqueue exactly one email inside the cooldown');
select is((select cardinality(accepted_at) from private.public_email_rate_limits where scope = 'target' and action = 'guest_order_reopen' and identity_hash = repeat('7', 64)), 1, 'concurrent requests consume one target delivery allowance');
select * from finish();
rollback;

begin;
set local session_replication_role = 'replica';
drop function public.test_public_email_quota_race();
delete from public.transactional_email_outbox
where order_id = '85910000-0000-4000-8000-000000000010';
delete from public.checkout_orders
where id = '85910000-0000-4000-8000-000000000010';
delete from private.public_email_rate_limits
where identity_hash in (repeat('7', 64), repeat('8', 64));
commit;
