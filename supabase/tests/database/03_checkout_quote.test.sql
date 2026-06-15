begin;

select plan(13);

select has_table('public', 'shipping_profiles', 'shipping profiles table exists');
select has_table('public', 'shipping_rules', 'shipping rules table exists');
select has_table('public', 'product_shipping_profiles', 'product shipping profile attachments table exists');
select has_table('public', 'variant_shipping_profiles', 'variant shipping profile attachments table exists');

select col_type_is('public', 'shipping_rules', 'country_code', 'text', 'shipping rules scope destinations by country');
select col_type_is('public', 'shipping_rules', 'first_item_fee_minor', 'integer', 'shipping first item fee uses integer minor units');
select col_type_is('public', 'shipping_rules', 'additional_item_fee_minor', 'integer', 'shipping additional item fee uses integer minor units');

select col_is_fk('public', 'product_shipping_profiles', 'product_id', 'product attachments reference products');
select col_is_fk('public', 'variant_shipping_profiles', 'variant_id', 'variant attachments reference variants');

select policies_are(
  'public',
  'shipping_profiles',
  array['shipping profiles are admin managed'],
  'shipping profiles expose only admin mutation policy'
);

select throws_ok(
  $$insert into public.shipping_rules (profile_id, country_code, currency_code, first_item_fee_minor, additional_item_fee_minor)
    values ('00000000-0000-0000-0000-000000000000', 'US', 'USD', -1, 0)$$,
  null,
  null,
  'negative first item fee is rejected'
);

select throws_ok(
  $$insert into public.shipping_rules (profile_id, country_code, currency_code, first_item_fee_minor, additional_item_fee_minor)
    values ('00000000-0000-0000-0000-000000000000', 'US', 'USD', 100, -1)$$,
  null,
  null,
  'negative additional item fee is rejected'
);

select has_function(
  'public',
  'get_checkout_shipping_rules',
  array['uuid[]', 'uuid[]', 'text'],
  'checkout quote can fetch rule data through a constrained RPC'
);

select * from finish();

rollback;
