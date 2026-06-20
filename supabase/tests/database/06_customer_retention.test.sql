begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select has_table('public', 'customer_shipping_addresses', 'customer shipping address table exists');
select col_is_fk('public', 'customer_shipping_addresses', 'user_id', 'saved addresses belong to auth users');
select has_index(
  'public',
  'customer_shipping_addresses',
  'customer_shipping_addresses_one_default_idx',
  'each customer can have at most one default shipping address'
);
select policies_are(
  'public',
  'customer_shipping_addresses',
  array[
    'customer shipping addresses are owner readable',
    'customer shipping addresses are owner insertable',
    'customer shipping addresses are owner updatable',
    'customer shipping addresses are owner deletable'
  ],
  'saved addresses expose owner-only CRUD policies'
);
select table_privs_are(
  'public',
  'customer_shipping_addresses',
  'anon',
  array[]::text[],
  'anonymous visitors have no direct saved-address access'
);
select table_privs_are(
  'public',
  'customer_shipping_addresses',
  'authenticated',
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'authenticated customers use owner-scoped saved-address CRUD'
);
select results_eq(
  $$
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.checkout_orders'::regclass
      and confrelid = 'public.customer_shipping_addresses'::regclass
      and contype = 'f'
  $$,
  array[0::bigint],
  'orders never reference mutable saved-address rows'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000601', 'authenticated', 'authenticated', 'address-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000602', 'authenticated', 'authenticated', 'address-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb);

insert into public.customer_shipping_addresses (
  id,
  user_id,
  label,
  recipient_name,
  phone_number,
  country_code,
  region,
  locality,
  address_line_1,
  address_line_2,
  postal_code,
  is_default
)
values
  (
    '00000000-0000-4000-8000-000000000611',
    '00000000-0000-4000-8000-000000000601',
    'Home',
    'Customer A',
    '+15550000001',
    'US',
    'California',
    'San Francisco',
    '1 Market Street',
    null,
    '94105',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000612',
    '00000000-0000-4000-8000-000000000602',
    'Nha',
    'Customer B',
    '+84900000000',
    'VN',
    'Ho Chi Minh',
    'Thu Duc',
    '2 Nguyen Hue',
    null,
    '700000',
    true
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000601', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$select label from public.customer_shipping_addresses order by label$$,
  $$values ('Home'::text)$$,
  'customer sees only their own saved addresses'
);
select is_empty(
  $$
    update public.customer_shipping_addresses
    set label = 'Tampered'
    where id = '00000000-0000-4000-8000-000000000612'
    returning id
  $$,
  'customer cannot edit another customer address'
);
select is_empty(
  $$
    delete from public.customer_shipping_addresses
    where id = '00000000-0000-4000-8000-000000000612'
    returning id
  $$,
  'customer cannot delete another customer address'
);
select lives_ok(
  $$
    insert into public.customer_shipping_addresses (
      user_id,
      label,
      recipient_name,
      phone_number,
      country_code,
      address_line_1,
      is_default
    ) values (
      '00000000-0000-4000-8000-000000000601',
      'Studio',
      'Customer A',
      '+15550000001',
      'US',
      '3 Mission Street',
      false
    )
  $$,
  'customer can create a non-default address for themselves'
);
select throws_ok(
  $$
    insert into public.customer_shipping_addresses (
      user_id,
      label,
      recipient_name,
      phone_number,
      country_code,
      address_line_1,
      is_default
    ) values (
      '00000000-0000-4000-8000-000000000602',
      'Forged',
      'Customer B',
      '+84900000000',
      'VN',
      '4 Le Loi',
      false
    )
  $$,
  '42501',
  null,
  'customer cannot create an address for another owner'
);
select throws_ok(
  $$
    update public.customer_shipping_addresses
    set is_default = true
    where label = 'Studio'
  $$,
  '23505',
  null,
  'database rejects a second default address for one customer'
);

select * from finish();

rollback;
