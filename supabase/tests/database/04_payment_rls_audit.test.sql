begin;

select plan(37);

select policies_are(
  'public',
  'payments',
  array[
    'payments are owner readable',
    'payments are admin managed'
  ],
  'payments expose only owner read and admin management policies'
);

select policies_are(
  'public',
  'payment_events',
  array['payment events are admin managed'],
  'provider event inbox is not directly customer-readable'
);

select policies_are(
  'public',
  'payment_transitions',
  array['payment transitions are admin managed'],
  'transition ledger is not directly customer-readable'
);

select policies_are(
  'public',
  'commerce_audit_events',
  array['commerce audit events are admin readable'],
  'audit events expose only admin read policy'
);

select table_privs_are('public', 'payments', 'anon', array[]::text[], 'anon has no direct payments table grants');
select table_privs_are('public', 'payment_events', 'anon', array[]::text[], 'anon has no direct payment event grants');
select table_privs_are('public', 'payment_transitions', 'anon', array[]::text[], 'anon has no direct transition grants');
select table_privs_are('public', 'commerce_audit_events', 'anon', array[]::text[], 'anon has no direct audit grants');

select table_privs_are('public', 'payments', 'authenticated', array['SELECT'], 'authenticated users can only select own payments through RLS');
select table_privs_are('public', 'payment_events', 'authenticated', array[]::text[], 'authenticated users cannot read provider events directly');
select table_privs_are('public', 'payment_transitions', 'authenticated', array[]::text[], 'authenticated users cannot read transition internals directly');
select table_privs_are('public', 'commerce_audit_events', 'authenticated', array[]::text[], 'authenticated users cannot mutate or read audit base table directly');
select table_privs_are('public', 'checkout_inventory_reservations', 'anon', array[]::text[], 'anon cannot mutate reservation outcome records');
select table_privs_are('public', 'checkout_inventory_reservations', 'authenticated', array[]::text[], 'authenticated users cannot mutate reservation outcome records');

select function_privs_are(
  'public',
  'apply_payment_transition',
  array['jsonb'],
  'anon',
  array[]::text[],
  'anon cannot execute arbitrary payment transitions'
);

select function_privs_are(
  'public',
  'apply_payment_transition',
  array['jsonb'],
  'authenticated',
  array[]::text[],
  'authenticated users cannot execute arbitrary payment transitions'
);

select function_privs_are(
  'public',
  'get_order_payment_status',
  array['text', 'text'],
  'anon',
  array['EXECUTE'],
  'anon can use only narrow guest order status lookup'
);

select function_privs_are(
  'public',
  'get_order_payment_status',
  array['text', 'text'],
  'authenticated',
  array['EXECUTE'],
  'authenticated can use narrow order status lookup'
);

select function_privs_are(
  'public',
  'get_admin_order_timeline',
  array['uuid'],
  'authenticated',
  array['EXECUTE'],
  'authenticated role can call admin timeline RPC only if it re-checks private.is_admin'
);

select has_view('public', 'order_payment_statuses', 'customer-safe order payment projection exists');
select has_view('public', 'admin_order_timelines', 'admin order timeline projection exists');
select view_owner_is('public', 'order_payment_statuses', current_user, 'customer projection owner is controlled by migration');

select col_type_is('public', 'order_payment_statuses', 'order_number', 'text', 'customer projection exposes order number');
select col_type_is('public', 'order_payment_statuses', 'customer_payment_status', 'text', 'customer projection exposes mapped status');
select col_type_is('public', 'order_payment_statuses', 'fulfillment_gate_status', 'text', 'customer projection exposes only lock or eligible gate');
select col_type_is('public', 'admin_order_timelines', 'event_type', 'text', 'admin projection exposes typed timeline events');
select col_type_is('public', 'admin_order_timelines', 'sanitized_facts', 'jsonb', 'admin projection exposes sanitized facts');

select table_privs_are('public', 'commerce_audit_events', 'service_role', array['SELECT', 'INSERT'], 'service role may append audit rows');
select table_privs_are('public', 'commerce_audit_events', 'service_role', array['SELECT', 'INSERT'], 'service role is not granted audit update or delete');
select table_privs_are('public', 'payment_events', 'service_role', array['SELECT', 'INSERT'], 'service role may append provider events');
select table_privs_are('public', 'payment_transitions', 'service_role', array['SELECT', 'INSERT'], 'service role may append transition rows');

select lives_ok(
  $$select private.is_admin()$$,
  'admin authorization helper remains database-owned'
);

select lives_ok(
  $$select public.get_order_payment_status('ATB-20260615-0001', repeat('0', 64))$$,
  'guest order lookup accepts order number plus opaque token hash input'
);

select results_eq(
  $$select status from jsonb_to_record(public.apply_payment_transition('{"source":"customer"}'::jsonb)) as r(status text)$$,
  $$values ('invalid'::text)$$,
  'customer-shaped transition payload is rejected safely'
);

select has_trigger('public', 'payment_events', 'payment_events_no_raw_secret_payload', 'payment events reject raw secrets or oversized payload dumps');
select has_trigger('public', 'commerce_audit_events', 'commerce_audit_events_append_only', 'audit rows are append-only');
select has_trigger('public', 'commerce_audit_events', 'commerce_audit_events_no_secret_metadata', 'audit metadata rejects raw tokens and provider secrets');

select * from finish();

rollback;
