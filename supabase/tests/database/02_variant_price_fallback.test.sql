begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into public.products (id, product_type, status, published_at)
values ('09190000-0000-0000-0000-000000000001', 'physical_finished', 'draft', now());

insert into public.product_translations (
  product_id, locale, slug, title, description,
  seo_title, seo_description, social_image_bucket, social_image_path
) values
  (
    '09190000-0000-0000-0000-000000000001', 'en', 'fallback-bear',
    'Fallback bear', '', 'Fallback bear', 'Fallback price regression fixture.',
    'product-media', 'products/fallback-bear-social.jpg'
  ),
  (
    '09190000-0000-0000-0000-000000000001', 'vi', 'gau-ke-thua-gia',
    'Gau ke thua gia', '', 'Gau ke thua gia', 'San pham kiem thu ke thua gia.',
    'product-media', 'products/fallback-bear-social-vi.jpg'
  );

insert into public.product_market_offers (
  product_id, market_code, enabled, currency_code, price_minor
) values (
  '09190000-0000-0000-0000-000000000001', 'intl', true, 'USD', 2500
);

insert into public.product_media (
  product_id, bucket_id, object_path, display_order, is_primary
) values (
  '09190000-0000-0000-0000-000000000001',
  'product-media',
  'products/fallback-bear.jpg',
  0,
  true
);

insert into public.product_variants (
  id, product_id, sku, attributes, display_order
) values (
  '09190000-0000-0000-0000-000000000002',
  '09190000-0000-0000-0000-000000000001',
  'FALLBACK-BEAR-SMALL',
  '{"size":"small"}'::jsonb,
  0
);

insert into public.inventory_records (variant_id, quantity_on_hand)
values ('09190000-0000-0000-0000-000000000002', 5);

update public.products
set status = 'published'
where id = '09190000-0000-0000-0000-000000000001';

create temporary table variant_fallback_payloads (
  name text primary key,
  payload jsonb not null
);

insert into variant_fallback_payloads (name, payload)
values (
  'parent',
  jsonb_build_object(
    'locale', 'en',
    'market', 'intl',
    'paymentIntent', 'paypal_intent',
    'discountCode', null,
    'lines', jsonb_build_array(
      jsonb_build_object(
        'productId', '09190000-0000-0000-0000-000000000001',
        'variantId', '09190000-0000-0000-0000-000000000002',
        'quantity', 2,
        'marketAtAdd', 'intl'
      )
    ),
    'acceptedQuote', jsonb_build_object(
      'status', 'ready',
      'market', 'intl',
      'currencyCode', 'USD',
      'subtotalMinor', 5000,
      'totalMinor', 5000,
      'discount', jsonb_build_object('status', 'not_applied', 'amountMinor', 0),
      'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0),
      'lines', jsonb_build_array(
        jsonb_build_object(
          'lineId', '09190000-0000-0000-0000-000000000001::09190000-0000-0000-0000-000000000002',
          'productId', '09190000-0000-0000-0000-000000000001',
          'variantId', '09190000-0000-0000-0000-000000000002',
          'fulfillmentType', 'physical',
          'status', 'ready',
          'quantity', 2,
          'requestedQuantity', 2,
          'marketAtAdd', 'intl',
          'currencyCode', 'USD',
          'unitPriceMinor', 2500,
          'lineSubtotalMinor', 5000,
          'discountAllocationMinor', 0
        )
      )
    )
  )
);

select results_eq(
  $$select
      in_stock,
      (variants -> 0 ->> 'enabled')::boolean,
      variants -> 0 ->> 'currency_code',
      (variants -> 0 ->> 'price_minor')::bigint
    from public.get_catalog_product_by_slug('en', 'intl', 'fallback-bear')$$,
  $$values (true, true, 'USD'::text, 2500::bigint)$$,
  'detail projection inherits the enabled parent market offer when no variant override exists'
);

select results_eq(
  $$select in_stock
    from public.list_catalog_products('en', 'intl', null, null, null, null, null, 'newest')
    where product_id = '09190000-0000-0000-0000-000000000001'$$,
  $$values (true)$$,
  'catalog listing treats an in-stock inherited-price variant as in stock'
);

select ok(
  private.checkout_commercial_quote_is_current(
    (select payload from variant_fallback_payloads where name = 'parent'),
    null
  ),
  'authoritative checkout accepts the inherited parent variant price'
);

insert into public.variant_market_offers (
  variant_id, market_code, enabled, currency_code, price_minor
) values (
  '09190000-0000-0000-0000-000000000002', 'intl', true, 'USD', 3200
);

insert into variant_fallback_payloads (name, payload)
select
  'override',
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{acceptedQuote,lines,0,unitPriceMinor}', '3200'),
        '{acceptedQuote,lines,0,lineSubtotalMinor}',
        '6400'
      ),
      '{acceptedQuote,subtotalMinor}',
      '6400'
    ),
    '{acceptedQuote,totalMinor}',
    '6400'
  )
from variant_fallback_payloads
where name = 'parent';

select results_eq(
  $$select
      (variants -> 0 ->> 'enabled')::boolean,
      variants -> 0 ->> 'currency_code',
      (variants -> 0 ->> 'price_minor')::bigint
    from public.get_catalog_product_by_slug('en', 'intl', 'fallback-bear')$$,
  $$values (true, 'USD'::text, 3200::bigint)$$,
  'an explicit enabled override wins over the parent offer in the public projection'
);

select ok(
  private.checkout_commercial_quote_is_current(
    (select payload from variant_fallback_payloads where name = 'override'),
    null
  ),
  'authoritative checkout accepts the explicit override price'
);

select isnt(
  private.checkout_commercial_quote_is_current(
    (select payload from variant_fallback_payloads where name = 'parent'),
    null
  ),
  true,
  'authoritative checkout rejects a stale parent price after an override is created'
);

update public.variant_market_offers
set enabled = false
where variant_id = '09190000-0000-0000-0000-000000000002'
  and market_code = 'intl';

select results_eq(
  $$select
      in_stock,
      (variants -> 0 ->> 'enabled')::boolean,
      variants -> 0 -> 'currency_code',
      variants -> 0 -> 'price_minor'
    from public.get_catalog_product_by_slug('en', 'intl', 'fallback-bear')$$,
  $$values (false, false, 'null'::jsonb, 'null'::jsonb)$$,
  'an explicit disabled override blocks parent fallback in the public projection'
);

select isnt(
  private.checkout_commercial_quote_is_current(
    (select payload from variant_fallback_payloads where name = 'override'),
    null
  ),
  true,
  'authoritative checkout rejects an explicitly disabled variant'
);

select * from finish();
rollback;

