begin;

create extension if not exists pgtap with schema extensions;

select plan(83);

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
  ('00000000-0000-4000-8000-000000000602', 'authenticated', 'authenticated', 'address-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000603', 'authenticated', 'authenticated', 'review-admin@example.test', '', now(), '{}'::jsonb, '{}'::jsonb);

insert into public.user_roles (user_id, role, note)
values ('00000000-0000-4000-8000-000000000603', 'admin', 'review moderation test admin');

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

select has_table('public', 'wishlist_items', 'wishlist items table exists');
select col_is_fk('public', 'wishlist_items', 'user_id', 'wishlist items belong to auth users');
select col_is_fk('public', 'wishlist_items', 'product_id', 'wishlist items point at catalog products');
select has_index(
  'public',
  'wishlist_items',
  'wishlist_items_owner_product_idx',
  'each customer can save a product once'
);
select policies_are(
  'public',
  'wishlist_items',
  array[
    'wishlist items are owner readable',
    'wishlist items are owner insertable',
    'wishlist items are owner deletable'
  ],
  'wishlist exposes owner-only read, create, and remove policies'
);
select table_privs_are(
  'public',
  'wishlist_items',
  'anon',
  array[]::text[],
  'anonymous visitors have no direct wishlist access'
);
select table_privs_are(
  'public',
  'wishlist_items',
  'authenticated',
  array['SELECT', 'INSERT', 'DELETE'],
  'authenticated customers use owner-scoped wishlist CRUD'
);
select hasnt_column('public', 'wishlist_items', 'price_minor', 'wishlist rows do not snapshot price');
select hasnt_column('public', 'wishlist_items', 'currency_code', 'wishlist rows do not snapshot currency');
select hasnt_column('public', 'wishlist_items', 'localized_title', 'wishlist rows do not snapshot localized titles');
select hasnt_column('public', 'wishlist_items', 'stock_quantity', 'wishlist rows do not snapshot stock');

reset role;

insert into public.wishlist_items (id, user_id, product_id)
select
  '00000000-0000-4000-8000-000000000631',
  '00000000-0000-4000-8000-000000000601',
  products.id
from public.products
order by products.id
limit 1;

insert into public.wishlist_items (id, user_id, product_id)
select
  '00000000-0000-4000-8000-000000000632',
  '00000000-0000-4000-8000-000000000602',
  products.id
from public.products
order by products.id
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000601', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$select user_id from public.wishlist_items order by id$$,
  $$values ('00000000-0000-4000-8000-000000000601'::uuid)$$,
  'customer sees only their own wishlist items'
);
select is_empty(
  $$
    delete from public.wishlist_items
    where id = '00000000-0000-4000-8000-000000000632'
    returning id
  $$,
  'customer cannot remove another customer wishlist item'
);
select throws_ok(
  $$
    insert into public.wishlist_items (user_id, product_id)
    select '00000000-0000-4000-8000-000000000601', product_id
    from public.wishlist_items
    where id = '00000000-0000-4000-8000-000000000631'
  $$,
  '23505',
  null,
  'database rejects duplicate owner and product wishlist rows'
);
select throws_ok(
  $$
    insert into public.wishlist_items (user_id, product_id)
    select '00000000-0000-4000-8000-000000000602', product_id
    from public.wishlist_items
    where id = '00000000-0000-4000-8000-000000000631'
  $$,
  '42501',
  null,
  'customer cannot create a wishlist item for another owner'
);

reset role;

select has_table('public', 'product_reviews', 'product reviews table exists');
select col_is_fk('public', 'product_reviews', 'user_id', 'reviews belong to auth users');
select col_is_fk('public', 'product_reviews', 'product_id', 'reviews belong to products');
select col_type_is('public', 'product_reviews', 'rating', 'integer', 'review rating is an integer');
select has_index(
  'public',
  'product_reviews',
  'product_reviews_one_per_customer_product_idx',
  'one customer can have one review per product'
);
select policies_are(
  'public',
  'product_reviews',
  array[
    'product reviews are owner readable',
    'product reviews are owner insertable',
    'product reviews are owner updatable'
  ],
  'reviews expose owner-only write policies'
);
select table_privs_are(
  'public',
  'product_reviews',
  'authenticated',
  array['SELECT'],
  'authenticated customers read their own reviews and write only through verified RPCs'
);
select has_function(
  'public',
  'can_review_product',
  array['uuid'],
  'review eligibility function exists'
);
select has_function(
  'public',
  'submit_product_review',
  array['uuid', 'integer', 'text', 'text'],
  'review submit/update RPC exists'
);
select has_view('public', 'approved_product_reviews', 'approved reviews public projection exists');
select col_type_is('public', 'approved_product_reviews', 'masked_author', 'text', 'public reviews expose masked author text');
select col_type_is('public', 'approved_product_reviews', 'verified_purchase', 'boolean', 'public reviews expose verified purchase badge fact');

delete from public.payments
where id in (
    '00000000-0000-4000-8000-000000000645',
    '00000000-0000-4000-8000-000000000646'
  )
  or order_id in (
    '00000000-0000-4000-8000-000000000641',
    '00000000-0000-4000-8000-000000000642'
  );
delete from public.checkout_order_lines where id in (
  '00000000-0000-4000-8000-000000000643',
  '00000000-0000-4000-8000-000000000644'
);
delete from public.checkout_orders where id in (
  '00000000-0000-4000-8000-000000000641',
  '00000000-0000-4000-8000-000000000642'
);

insert into public.checkout_orders (
  id,
  order_number,
  owner_user_id,
  contact_email,
  locale,
  market,
  currency_code,
  payment_intent,
  subtotal_minor,
  total_minor,
  accepted_quote_hash,
  quote_snapshot,
  cart_snapshot,
  idempotency_actor,
  idempotency_key,
  reservation_expires_at,
  payment_status,
  paid_gate_status,
  paid_at
) values
  (
    '00000000-0000-4000-8000-000000000641',
    'ATB-REVIEW-PAID',
    '00000000-0000-4000-8000-000000000601',
    'review-a@example.test',
    'en',
    'intl',
    'USD',
    'paypal_intent',
    2800,
    2800,
    'review-paid-quote',
    '{}'::jsonb,
    '[]'::jsonb,
    'review-a',
    'review-a-key',
    now() + interval '1 day',
    'paid',
    'open',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000642',
    'ATB-REVIEW-PENDING',
    '00000000-0000-4000-8000-000000000602',
    'review-b@example.test',
    'en',
    'intl',
    'USD',
    'paypal_intent',
    2800,
    2800,
    'review-pending-quote',
    '{}'::jsonb,
    '[]'::jsonb,
    'review-b',
    'review-b-key',
    now() + interval '1 day',
    'awaiting_payment',
    'locked',
    null
  );

insert into public.checkout_order_lines (
  id,
  order_id,
  product_id,
  line_id,
  product_title,
  fulfillment_type,
  market,
  currency_code,
  quantity,
  unit_price_minor,
  line_subtotal_minor,
  quote_line_snapshot
) values
  (
    '00000000-0000-4000-8000-000000000643',
    '00000000-0000-4000-8000-000000000641',
    '50000000-0000-0000-0000-000000000003',
    'review-paid-line',
    'Both-market bear',
    'physical',
    'intl',
    'USD',
    1,
    2800,
    2800,
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000644',
    '00000000-0000-4000-8000-000000000642',
    '50000000-0000-0000-0000-000000000003',
    'review-pending-line',
    'Both-market bear',
    'physical',
    'intl',
    'USD',
    1,
    2800,
    2800,
    '{}'::jsonb
  );

update public.payments
set status = 'paid',
    paid_gate_opened_at = now(),
    paid_at = now(),
    updated_at = now()
where order_id = '00000000-0000-4000-8000-000000000641';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000601', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.can_review_product('50000000-0000-0000-0000-000000000003'),
  true,
  'paid order-line owner can review purchased product'
);
select lives_ok(
  $$select public.submit_product_review('50000000-0000-0000-0000-000000000003', 5, 'Sweet bear', 'Well made')$$,
  'eligible customer can submit a review'
);
select set_config(
  'test.review_id',
  (select id::text from public.product_reviews where user_id = '00000000-0000-4000-8000-000000000601'),
  true
);
select throws_ok(
  $$select public.submit_product_review('50000000-0000-0000-0000-000000000003', 6, 'Bad rating', 'Too high')$$,
  '23514',
  null,
  'rating must be between one and five'
);
select is_empty(
  $$select title from public.approved_product_reviews where product_id = '50000000-0000-0000-0000-000000000003'$$,
  'pending review is hidden from public approved projection'
);

reset role;

select has_table('public', 'review_admin_replies', 'review admin replies table exists');
select col_is_fk('public', 'review_admin_replies', 'review_id', 'shop replies belong to reviews');
select has_index(
  'public',
  'review_admin_replies',
  'review_admin_replies_pkey',
  'each review has at most one shop reply'
);
select table_privs_are(
  'public',
  'review_admin_replies',
  'authenticated',
  array[]::text[],
  'authenticated clients have no direct shop reply table access'
);
select table_privs_are(
  'public',
  'product_reviews',
  'authenticated',
  array['SELECT'],
  'authenticated customers cannot bypass review submit or moderation RPCs'
);
select has_function(
  'public',
  'moderate_product_review',
  array['uuid', 'integer', 'text', 'text', 'text'],
  'stale-safe review moderation RPC exists'
);
select has_function(
  'public',
  'upsert_review_admin_reply',
  array['uuid', 'integer', 'text', 'text'],
  'one shop reply upsert RPC exists'
);
select has_function(
  'public',
  'remove_review_admin_reply',
  array['uuid', 'integer', 'text', 'integer'],
  'stale-safe shop reply removal RPC exists'
);
select has_function(
  'public',
  'get_admin_product_reviews',
  array['text'],
  'protected admin review queue RPC exists'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000601', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (public.moderate_product_review(
    current_setting('test.review_id')::uuid,
    1,
    'pending',
    'approved',
    null
  )->>'status'),
  'forbidden',
  'customer cannot moderate their own review'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000603', true);

select is(
  (public.moderate_product_review(
    current_setting('test.review_id')::uuid,
    1,
    'pending',
    'approved',
    'verified fixture'
  )->>'status'),
  'approved',
  'admin can approve a pending verified review'
);
select results_eq(
  $$select title from public.approved_product_reviews where product_id = '50000000-0000-0000-0000-000000000003'$$,
  $$values ('Sweet bear'::text)$$,
  'approved review becomes public'
);
select is(
  (public.moderate_product_review(
    current_setting('test.review_id')::uuid,
    1,
    'pending',
    'hidden',
    null
  )->>'status'),
  'stale',
  'stale review moderation is rejected'
);
select is(
  (public.upsert_review_admin_reply(
    current_setting('test.review_id')::uuid,
    2,
    'approved',
    'Thank you for your review.'
  )->>'status'),
  'saved',
  'admin can create one shop reply'
);
select is(
  (select count(*)::integer from public.approved_product_reviews where shop_reply_body is not null),
  1,
  'shop reply upsert creates only one row per review'
);
select results_eq(
  $$select shop_reply_body from public.approved_product_reviews where product_id = '50000000-0000-0000-0000-000000000003'$$,
  $$values ('Thank you for your review.'::text)$$,
  'approved public review includes the shop reply'
);
select is(
  (public.upsert_review_admin_reply(
    current_setting('test.review_id')::uuid,
    2,
    'approved',
    'Updated shop reply.'
  )->>'reply_version'),
  '2',
  'editing the shop reply updates the same row version'
);
select is(
  (public.remove_review_admin_reply(
    current_setting('test.review_id')::uuid,
    2,
    'approved',
    2
  )->>'status'),
  'removed',
  'admin can remove the current shop reply'
);
select is(
  (public.moderate_product_review(
    current_setting('test.review_id')::uuid,
    2,
    'approved',
    'hidden',
    'storefront removal'
  )->>'status'),
  'hidden',
  'admin can hide an approved review'
);
select is_empty(
  $$select title from public.approved_product_reviews where product_id = '50000000-0000-0000-0000-000000000003'$$,
  'hidden review disappears from public display'
);

reset role;

delete from public.newsletter_consent_events
where normalized_email in ('newsletter@example.test', 'visual-newsletter@example.test');
delete from public.newsletter_subscribers
where normalized_email in ('newsletter@example.test', 'visual-newsletter@example.test');

select has_table('public', 'newsletter_subscribers', 'newsletter subscribers table exists');
select has_table('public', 'newsletter_consent_events', 'newsletter consent events table exists');
select col_is_pk('public', 'newsletter_subscribers', 'normalized_email', 'normalized email is the subscriber identity');
select col_is_fk('public', 'newsletter_consent_events', 'normalized_email', 'consent events belong to subscriber state');
select has_column('public', 'newsletter_consent_events', 'consent_source', 'consent source is recorded');
select has_column('public', 'newsletter_consent_events', 'occurred_at', 'consent timestamp is recorded');
select hasnt_column('public', 'newsletter_consent_events', 'raw_ip', 'raw IP is not stored');
select hasnt_column('public', 'newsletter_consent_events', 'ip_address', 'IP address field is not stored');
select hasnt_column('public', 'newsletter_consent_events', 'user_agent', 'raw user-agent is not stored');
select hasnt_column('public', 'newsletter_consent_events', 'raw_headers', 'raw request headers are not stored');
select table_privs_are(
  'public',
  'newsletter_subscribers',
  'anon',
  array[]::text[],
  'anonymous visitors cannot read or mutate subscriber rows directly'
);
select table_privs_are(
  'public',
  'newsletter_consent_events',
  'authenticated',
  array[]::text[],
  'authenticated users cannot inspect consent history directly'
);
select has_function(
  'public',
  'subscribe_newsletter',
  array['text', 'text', 'text', 'text', 'text', 'text'],
  'public subscribe RPC exists'
);

set local role anon;

select is(
  (public.subscribe_newsletter(
    '  NEWSLETTER@Example.Test ',
    'en',
    'intl',
    'footer',
    repeat('a', 64),
    repeat('b', 64)
  )->>'status'),
  'subscribed',
  'anonymous visitor can explicitly subscribe'
);

reset role;

select results_eq(
  $$select normalized_email, latest_locale, latest_market, status from public.newsletter_subscribers where normalized_email = 'newsletter@example.test'$$,
  $$values ('newsletter@example.test'::text, 'en'::text, 'intl'::text, 'subscribed'::text)$$,
  'subscriber state uses normalized email and latest preferences'
);
select is(
  (select count(*)::integer from public.newsletter_consent_events where normalized_email = 'newsletter@example.test'),
  1,
  'subscribe appends one consent event'
);
select results_eq(
  $$select ip_hash, user_agent_hash from public.newsletter_consent_events where normalized_email = 'newsletter@example.test'$$,
  $$values (repeat('a', 64)::text, repeat('b', 64)::text)$$,
  'consent event retains hash-only request evidence'
);

update public.newsletter_subscribers
set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
where normalized_email = 'newsletter@example.test';

set local role anon;

select is(
  (public.subscribe_newsletter(
    'newsletter@example.test',
    'vi',
    'vn',
    'footer',
    null,
    null
  )->>'status'),
  'resubscribed',
  'unsubscribed visitor can explicitly resubscribe'
);

reset role;

select results_eq(
  $$select latest_locale, latest_market, status from public.newsletter_subscribers where normalized_email = 'newsletter@example.test'$$,
  $$values ('vi'::text, 'vn'::text, 'subscribed'::text)$$,
  'resubscribe updates latest locale and market state'
);

select * from finish();

rollback;
