begin;

select plan(39);

select has_table('public', 'physical_fulfillments', 'physical fulfillment table exists');
select has_table('public', 'physical_fulfillment_events', 'physical fulfillment event table exists');
select col_is_fk('public', 'physical_fulfillments', 'order_id', 'physical fulfillment references order');
select col_type_is('public', 'physical_fulfillments', 'status', 'text', 'physical fulfillment status is explicit');
select col_type_is('public', 'physical_fulfillments', 'tracking_number', 'text', 'tracking number is stored manually');
select col_type_is('public', 'physical_fulfillments', 'tracking_url', 'text', 'tracking URL is stored manually');
select col_type_is('public', 'physical_fulfillments', 'shipped_at', 'timestamp with time zone', 'shipped timestamp is explicit');
select col_type_is('public', 'physical_fulfillments', 'version', 'integer', 'physical fulfillment version supports stale-state checks');
select has_column('public', 'physical_fulfillments', 'admin_note', 'private admin fulfillment note is stored explicitly');
select is(
  has_column_privilege('authenticated', 'public.physical_fulfillments', 'admin_note', 'select'),
  false,
  'authenticated customers cannot select the admin note column'
);
select col_is_fk('public', 'physical_fulfillment_events', 'physical_fulfillment_id', 'physical events reference fulfillment record');
select col_type_is('public', 'physical_fulfillment_events', 'metadata', 'jsonb', 'physical event metadata is structured');
select has_trigger('public', 'physical_fulfillment_events', 'physical_fulfillment_events_safe_metadata', 'physical event metadata rejects unsafe material');
select policies_are('public', 'physical_fulfillments', array['physical fulfillments are owner readable', 'physical fulfillments are admin managed'], 'physical fulfillment exposes owner read and admin management only');
select policies_are('public', 'physical_fulfillment_events', array['physical fulfillment events are admin managed'], 'physical events are admin managed only');
select table_privs_are('public', 'physical_fulfillments', 'anon', array[]::text[], 'anon cannot read physical fulfillment rows');
select table_privs_are('public', 'physical_fulfillment_events', 'authenticated', array[]::text[], 'customers cannot read physical fulfillment event internals');
select table_privs_are('public', 'physical_fulfillments', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES', 'TRIGGER', 'TRUNCATE'], 'service role manages physical fulfillment rows');
select table_privs_are('public', 'physical_fulfillment_events', 'service_role', array['SELECT', 'INSERT', 'REFERENCES', 'TRIGGER', 'TRUNCATE'], 'service role appends physical fulfillment events');

select has_function(
  'public',
  'update_physical_fulfillment',
  array['jsonb'],
  'atomic physical fulfillment RPC exists'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.update_physical_fulfillment(jsonb)'::regprocedure),
  true,
  'atomic physical fulfillment RPC owns its authorization boundary'
);
select function_privs_are(
  'public',
  'update_physical_fulfillment',
  array['jsonb'],
  'anon',
  array[]::text[],
  'anonymous users cannot execute the physical fulfillment RPC'
);
select function_privs_are(
  'public',
  'update_physical_fulfillment',
  array['jsonb'],
  'authenticated',
  array['EXECUTE'],
  'authenticated users may enter the RPC authorization boundary'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '05000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'physical-customer@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '05000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'physical-admin@example.test', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  ('05000000-0000-4000-8000-000000000001', 'physical-customer@example.test', 'en'),
  ('05000000-0000-4000-8000-000000000002', 'physical-admin@example.test', 'en');

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '05000000-0000-4000-8000-000000000002',
  'admin',
  '05000000-0000-4000-8000-000000000002',
  'atomic physical fulfillment test admin'
);

insert into public.checkout_orders (
  id, order_number, guest_secret_hash, contact_email, locale, market,
  currency_code, status, payment_intent, subtotal_minor, discount_minor,
  shipping_minor, total_minor, accepted_quote_hash, quote_snapshot,
  cart_snapshot, idempotency_actor, idempotency_key, reservation_expires_at
)
values
  (
    '05000000-0000-4000-8000-000000000011', 'ATB-PHYSICAL-ATOMIC-1',
    'physical-atomic-guest-hash-1', 'authoritative-shipping@example.test', 'vi', 'vn',
    'VND', 'paid', 'vietqr_intent', 250000, 0, 30000, 280000,
    'physical-atomic-quote-1', '{}'::jsonb, '[]'::jsonb, 'guest',
    'physical-atomic-key-1', now() + interval '15 minutes'
  ),
  (
    '05000000-0000-4000-8000-000000000012', 'ATB-PHYSICAL-ROLLBACK-2',
    'physical-atomic-guest-hash-2', 'rollback-shipping@example.test', 'en', 'intl',
    'USD', 'paid', 'paypal_intent', 2500, 0, 500, 3000,
    'physical-atomic-quote-2', '{}'::jsonb, '[]'::jsonb, 'guest',
    'physical-atomic-key-2', now() + interval '15 minutes'
  );

insert into public.physical_fulfillments (id, order_id, status, version)
values
  ('05000000-0000-4000-8000-000000000021', '05000000-0000-4000-8000-000000000011', 'packing', 1),
  ('05000000-0000-4000-8000-000000000022', '05000000-0000-4000-8000-000000000012', 'packing', 1);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000001', true);

select is(
  public.update_physical_fulfillment(jsonb_build_object(
    'orderId', '05000000-0000-4000-8000-000000000011',
    'expectedStatus', 'packing',
    'expectedVersion', 1,
    'status', 'shipped'
  )) ->> 'status',
  'forbidden',
  'non-admin users cannot mutate physical fulfillment'
);

reset role;

select results_eq(
  $$select status, version from public.physical_fulfillments where id = '05000000-0000-4000-8000-000000000021'$$,
  $$values ('packing'::text, 1)$$,
  'forbidden mutation leaves fulfillment unchanged'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000002', true);

select is(
  public.update_physical_fulfillment(jsonb_build_object(
    'orderId', '05000000-0000-4000-8000-000000000011',
    'expectedStatus', 'awaiting_fulfillment',
    'expectedVersion', 1,
    'status', 'shipped'
  )) ->> 'status',
  'stale',
  'expected status mismatch returns stale'
);
select is(
  public.update_physical_fulfillment(jsonb_build_object(
    'orderId', '05000000-0000-4000-8000-000000000011',
    'expectedStatus', 'packing',
    'expectedVersion', 1,
    'status', 'delivered'
  )) ->> 'status',
  'invalid',
  'impossible transition returns invalid'
);
select is(
  public.update_physical_fulfillment(jsonb_build_object(
    'orderId', '05000000-0000-4000-8000-000000000011',
    'expectedStatus', 'packing',
    'expectedVersion', 1,
    'status', 'shipped',
    'trackingUrl', 'http://tracking.example.test/unsafe'
  )) ->> 'code',
  'invalid_tracking_url',
  'non-HTTPS tracking URL is rejected inside the RPC'
);

select results_eq(
  $$select status, "physicalStatus", version
    from jsonb_to_record(public.update_physical_fulfillment(jsonb_build_object(
      'orderId', '05000000-0000-4000-8000-000000000011',
      'expectedStatus', 'packing',
      'expectedVersion', 1,
      'status', 'shipped',
      'carrier', ' VNPost ',
      'trackingNumber', ' TRACK-ATOMIC-1 ',
      'trackingUrl', ' https://tracking.example.test/TRACK-ATOMIC-1 ',
      'note', ' Packed by admin '
    ))) as r(status text, "physicalStatus" text, version integer)$$,
  $$values ('updated'::text, 'shipped'::text, 2)$$,
  'admin shipped mutation returns the new state and version'
);

reset role;

select results_eq(
  $$select status, version, carrier, tracking_number, tracking_url, admin_note
    from public.physical_fulfillments where id = '05000000-0000-4000-8000-000000000021'$$,
  $$values ('shipped'::text, 2, 'VNPost'::text, 'TRACK-ATOMIC-1'::text, 'https://tracking.example.test/TRACK-ATOMIC-1'::text, 'Packed by admin'::text)$$,
  'shipped fulfillment stores normalized tracking facts and its private note once'
);
select is(
  (select metadata ? 'note' from public.physical_fulfillment_events
    where physical_fulfillment_id = '05000000-0000-4000-8000-000000000021'),
  false,
  'admin note is not copied into event metadata'
);
select results_eq(
  $$select event_type, actor_type, actor_id, metadata ->> 'status'
    from public.physical_fulfillment_events
    where physical_fulfillment_id = '05000000-0000-4000-8000-000000000021'$$,
  $$values ('physical_shipped'::text, 'admin'::text, '05000000-0000-4000-8000-000000000002'::uuid, 'shipped'::text)$$,
  'shipped event is attributed to the authenticated admin'
);
select results_eq(
  $$select recipient_email, locale, payload ->> 'orderNumber', payload ->> 'trackingNumber'
    from public.transactional_email_outbox
    where order_id = '05000000-0000-4000-8000-000000000011'
      and event_type = 'physical_shipped'$$,
  $$values ('authoritative-shipping@example.test'::text, 'vi'::text, 'ATB-PHYSICAL-ATOMIC-1'::text, 'TRACK-ATOMIC-1'::text)$$,
  'shipped email uses authoritative order identity and normalized tracking facts'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000002', true);

select is(
  public.update_physical_fulfillment(jsonb_build_object(
    'orderId', '05000000-0000-4000-8000-000000000011',
    'expectedStatus', 'shipped',
    'expectedVersion', 2,
    'status', 'delivered'
  )) ->> 'status',
  'updated',
  'non-shipped forward transition remains supported'
);

reset role;

select is(
  (select count(*)::integer from public.transactional_email_outbox
    where order_id = '05000000-0000-4000-8000-000000000011'
      and event_type = 'physical_shipped'),
  1,
  'non-shipped transition does not enqueue another shipped email'
);

create function public.test_reject_physical_shipped_outbox() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.order_id = '05000000-0000-4000-8000-000000000012'::uuid
    and new.event_type = 'physical_shipped' then
    raise exception 'forced physical shipped outbox failure' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger test_reject_physical_shipped_outbox
before insert on public.transactional_email_outbox
for each row execute function public.test_reject_physical_shipped_outbox();

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '05000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$select public.update_physical_fulfillment(jsonb_build_object(
    'orderId', '05000000-0000-4000-8000-000000000012',
    'expectedStatus', 'packing',
    'expectedVersion', 1,
    'status', 'shipped'
  ))$$,
  'P0001',
  'forced physical shipped outbox failure',
  'outbox failure aborts the atomic mutation'
);

reset role;

select results_eq(
  $$select status, version from public.physical_fulfillments where id = '05000000-0000-4000-8000-000000000022'$$,
  $$values ('packing'::text, 1)$$,
  'outbox failure rolls back fulfillment state and version'
);
select is(
  (select count(*)::integer from public.physical_fulfillment_events
    where physical_fulfillment_id = '05000000-0000-4000-8000-000000000022'),
  0,
  'outbox failure rolls back the physical event'
);
select is(
  (select count(*)::integer from public.transactional_email_outbox
    where order_id = '05000000-0000-4000-8000-000000000012'
      and event_type = 'physical_shipped'),
  0,
  'outbox failure leaves no shipped email intent'
);

drop trigger test_reject_physical_shipped_outbox on public.transactional_email_outbox;
drop function public.test_reject_physical_shipped_outbox();

select * from finish();

rollback;

