begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select has_function(
  'public',
  'get_catalog_product_commerce_by_slug',
  array['text', 'text', 'text'],
  'authoritative product commerce projection exists'
);
select has_function(
  'public',
  'list_catalog_facets_filtered',
  array['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text'],
  'filter-aware catalog facet projection exists'
);

insert into public.categories (id)
values ('09600000-0000-0000-0000-000000000010');
insert into public.category_translations (
  category_id, locale, slug, name, description, seo_title, seo_description
) values (
  '09600000-0000-0000-0000-000000000010', 'en', 'projection-toys',
  'Projection toys', '', 'Projection toys', 'Projection test category.'
);
insert into public.techniques (id)
values ('09600000-0000-0000-0000-000000000020');
insert into public.technique_translations (technique_id, locale, name, description)
values ('09600000-0000-0000-0000-000000000020', 'en', 'Projection crochet', '');
insert into public.tags (id)
values ('09600000-0000-0000-0000-000000000030');
insert into public.tag_translations (tag_id, locale, name)
values ('09600000-0000-0000-0000-000000000030', 'en', 'Projection gift');

insert into public.products (id, product_type, status, published_at)
values ('09600000-0000-0000-0000-000000000001', 'physical_finished', 'draft', now());
insert into public.product_translations (
  product_id, locale, slug, title, description, seo_title, seo_description
) values (
  '09600000-0000-0000-0000-000000000001', 'en', 'projection-bear',
  'Projection bear', 'Authoritative projection fixture.',
  'Projection bear', 'Authoritative projection fixture.'
);
insert into public.product_market_offers (
  product_id, market_code, enabled, currency_code, price_minor
) values
  ('09600000-0000-0000-0000-000000000001', 'intl', true, 'USD', 2500),
  ('09600000-0000-0000-0000-000000000001', 'vn', true, 'VND', 350000);
insert into public.product_variants (id, product_id, sku, attributes, display_order)
values
  (
    '09600000-0000-0000-0000-000000000002',
    '09600000-0000-0000-0000-000000000001',
    'PROJECTION-PARENT', '{"size":"small"}', 0
  ),
  (
    '09600000-0000-0000-0000-000000000003',
    '09600000-0000-0000-0000-000000000001',
    'PROJECTION-OVERRIDE', '{"size":"large"}', 1
  );
insert into public.variant_market_offers (
  variant_id, market_code, enabled, currency_code, price_minor
) values ('09600000-0000-0000-0000-000000000003', 'intl', true, 'USD', 3200);
insert into public.inventory_records (variant_id, quantity_on_hand)
values
  ('09600000-0000-0000-0000-000000000002', 5),
  ('09600000-0000-0000-0000-000000000003', 2);
insert into public.product_categories (product_id, category_id)
values (
  '09600000-0000-0000-0000-000000000001',
  '09600000-0000-0000-0000-000000000010'
);
insert into public.product_techniques (product_id, technique_id)
values (
  '09600000-0000-0000-0000-000000000001',
  '09600000-0000-0000-0000-000000000020'
);
insert into public.product_tags (product_id, tag_id)
values (
  '09600000-0000-0000-0000-000000000001',
  '09600000-0000-0000-0000-000000000030'
);
update public.products
set status = 'published'
where id = '09600000-0000-0000-0000-000000000001';

select results_eq(
  $$select
      variants -> 0 ->> 'price_source',
      (variants -> 0 ->> 'stock')::integer,
      variants -> 1 ->> 'price_source',
      (variants -> 1 ->> 'stock')::integer
    from public.get_catalog_product_commerce_by_slug('en', 'intl', 'projection-bear')$$,
  $$values ('parent'::text, 5, 'variant'::text, 2)$$,
  'variant commerce exposes exact quantity and authoritative price source'
);

select results_eq(
  $$select currency_code, price_minor, other_market_code, other_market_available
    from public.get_catalog_product_commerce_by_slug('en', 'intl', 'projection-bear')$$,
  $$values ('USD'::text, 2500::bigint, 'vn'::text, true)$$,
  'product commerce exposes current and alternate market facts'
);

select results_eq(
  $$select facet_type, slug, product_count
    from public.list_catalog_facets_filtered(
      'en', 'intl', 'projection bear', 'physical_finished', 'projection-toys',
      null, '09600000-0000-0000-0000-000000000020',
      '09600000-0000-0000-0000-000000000030'
    )
    order by facet_type$$,
  $$values
    ('category'::text, 'projection-toys'::text, 1::bigint),
    ('tag'::text, '09600000-0000-0000-0000-000000000030'::text, 1::bigint),
    ('technique'::text, '09600000-0000-0000-0000-000000000020'::text, 1::bigint)$$,
  'facet counts match normalized search and taxonomy filters'
);

select is_empty(
  $$select *
    from public.list_catalog_facets_filtered(
      'en', 'intl', 'missing', null, null, null, null, null
    )$$,
  'facet projection returns no stale counts when search has no matches'
);

set local role anon;

select isnt_empty(
  $$select 1
    from public.get_catalog_product_commerce_by_slug('en', 'intl', 'projection-bear')$$,
  'anon can execute the bounded product commerce projection'
);
select isnt_empty(
  $$select 1
    from public.list_catalog_facets_filtered(
      'en', 'intl', null, null, null, null, null, null
    )$$,
  'anon can execute the bounded filtered facet projection'
);
select throws_ok(
  $$select 1 from public.products limit 1$$,
  '42501',
  'permission denied for table products',
  'anon still cannot read private catalog base tables'
);
select throws_ok(
  $$select *
    from public.get_catalog_product_commerce_by_slug('en', 'usd', 'projection-bear')$$,
  '22023',
  'invalid market code',
  'product projection rejects invalid market input'
);

select finish();
rollback;
