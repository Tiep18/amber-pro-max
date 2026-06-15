begin;

select plan(12);

select policies_are(
  'public',
  'checkout_orders',
  array[
    'checkout orders are owner readable',
    'checkout orders are admin managed'
  ],
  'checkout orders expose only owner read and admin management policies'
);

select policies_are(
  'public',
  'checkout_order_lines',
  array[
    'checkout order lines are owner readable',
    'checkout order lines are admin managed'
  ],
  'checkout lines expose only owner read and admin management policies'
);

select policies_are(
  'public',
  'checkout_inventory_reservations',
  array['checkout reservations are admin managed'],
  'reservation records are not directly customer-readable'
);

select has_trigger(
  'public',
  'checkout_order_lines',
  'checkout_order_lines_immutable_snapshots',
  'commercial line snapshots have an immutable update trigger'
);

select function_privs_are(
  'public',
  'submit_checkout',
  array['jsonb'],
  'anon',
  array['EXECUTE'],
  'anon can execute only the submit RPC'
);

select function_privs_are(
  'public',
  'submit_checkout',
  array['jsonb'],
  'authenticated',
  array['EXECUTE'],
  'authenticated can execute the submit RPC'
);

select table_privs_are(
  'public',
  'checkout_orders',
  'anon',
  array[]::text[],
  'anon has no direct checkout order table grants'
);

select table_privs_are(
  'public',
  'checkout_order_lines',
  'anon',
  array[]::text[],
  'anon has no direct checkout line table grants'
);

select table_privs_are(
  'public',
  'checkout_inventory_reservations',
  'anon',
  array[]::text[],
  'anon has no direct reservation table grants'
);

select table_privs_are(
  'public',
  'checkout_orders',
  'authenticated',
  array['SELECT'],
  'authenticated users can only select own checkout orders through RLS'
);

select table_privs_are(
  'public',
  'checkout_order_lines',
  'authenticated',
  array['SELECT'],
  'authenticated users can only select own checkout lines through RLS'
);

select table_privs_are(
  'public',
  'checkout_inventory_reservations',
  'authenticated',
  array[]::text[],
  'authenticated users have no direct reservation grants'
);

select * from finish();

rollback;
