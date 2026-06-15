begin;

select plan(25);

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

select has_table('public', 'discount_codes', 'discount codes table exists');
select has_table('public', 'discount_code_customers', 'discount customer restrictions table exists');
select has_table('public', 'discount_code_products', 'discount product restrictions table exists');
select has_table('public', 'discount_code_categories', 'discount category restrictions table exists');
select has_table('public', 'discount_code_collections', 'discount collection restrictions table exists');
select has_table('public', 'discount_redemptions', 'discount redemption tracking table exists');

select col_type_is('public', 'discount_codes', 'discount_type', 'text', 'discount type is constrained text');
select col_type_is('public', 'discount_codes', 'minimum_subtotal_minor', 'integer', 'discount minimum spend uses integer minor units');

select policies_are(
  'public',
  'discount_codes',
  array['discount codes are admin managed'],
  'discount codes expose only admin management policy'
);

select throws_ok(
  $$insert into public.discount_codes (code, discount_type, percentage_bps, amount_minor, currency_code, market)
    values ('BAD', 'fixed', null, 1000, 'VND', 'intl')$$,
  null,
  null,
  'fixed discounts reject currency and market mismatches'
);

select has_function(
  'public',
  'get_checkout_discount_code',
  array['text'],
  'checkout quote can fetch one discount code through a constrained RPC'
);

select has_function(
  'public',
  'get_checkout_product_discount_scopes',
  array['uuid[]'],
  'checkout quote can fetch product discount category and collection scopes through a constrained RPC'
);

select * from finish();

rollback;
