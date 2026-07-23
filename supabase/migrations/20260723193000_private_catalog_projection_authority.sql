-- Expose the authoritative commerce facts required by Phase 09 private
-- projections without granting browser roles access to catalog base tables.

create or replace function public.get_catalog_product_commerce_by_slug(
  p_locale text,
  p_market text,
  p_slug text
)
returns table (
  product_id uuid,
  slug text,
  locale text,
  market text,
  product_type text,
  available boolean,
  currency_code text,
  price_minor bigint,
  in_stock boolean,
  other_market_code text,
  other_market_available boolean,
  variants jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.catalog_validate_locale_market(p_locale, p_market);

  return query
  select
    p.id,
    pt.slug,
    p_locale,
    p_market,
    p.product_type,
    pmo.id is not null,
    pmo.currency_code,
    pmo.price_minor,
    case
      when pmo.id is null then false
      when p.product_type = 'pdf_pattern' then true
      else coalesce(ir.quantity_on_hand > 0, false)
        or exists (
          select 1
          from public.product_variants stock_variant
          left join public.variant_market_offers stock_offer
            on stock_offer.variant_id = stock_variant.id
           and stock_offer.market_code = p_market
          join public.inventory_records stock_record
            on stock_record.variant_id = stock_variant.id
           and stock_record.quantity_on_hand > 0
          where stock_variant.product_id = p.id
            and (stock_offer.id is null or stock_offer.enabled)
        )
    end,
    alternate.market_code,
    alternate.id is not null,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'variant_id', variant.id,
            'sku', variant.sku,
            'attributes', variant.attributes,
            'display_order', variant.display_order,
            'enabled', pmo.id is not null and (variant_offer.id is null or variant_offer.enabled),
            'currency_code', case
              when pmo.id is not null and (variant_offer.id is null or variant_offer.enabled)
                then coalesce(variant_offer.currency_code, pmo.currency_code)
              else null
            end,
            'price_minor', case
              when pmo.id is not null and (variant_offer.id is null or variant_offer.enabled)
                then coalesce(variant_offer.price_minor, pmo.price_minor)
              else null
            end,
            'price_source', case
              when pmo.id is null or (variant_offer.id is not null and not variant_offer.enabled)
                then null
              when variant_offer.id is not null then 'variant'
              else 'parent'
            end,
            'stock', coalesce(inventory.quantity_on_hand, 0)
          )
          order by variant.display_order, variant.sku
        )
        from public.product_variants variant
        left join public.variant_market_offers variant_offer
          on variant_offer.variant_id = variant.id
         and variant_offer.market_code = p_market
        left join public.inventory_records inventory
          on inventory.variant_id = variant.id
        where variant.product_id = p.id
      ),
      '[]'::jsonb
    )
  from public.products p
  join public.product_translations pt
    on pt.product_id = p.id
   and pt.locale = p_locale
   and pt.slug = p_slug
  left join public.product_market_offers pmo
    on pmo.product_id = p.id
   and pmo.market_code = p_market
   and pmo.enabled
   and pmo.price_minor is not null
  left join public.inventory_records ir
    on ir.product_id = p.id
  left join lateral (
    select offer.id, offer.market_code
    from public.product_market_offers offer
    where offer.product_id = p.id
      and offer.market_code <> p_market
      and offer.enabled
      and offer.price_minor is not null
    order by offer.market_code
    limit 1
  ) alternate on true
  where p.status = 'published';
end;
$$;

revoke all on function public.get_catalog_product_commerce_by_slug(text, text, text)
  from public, anon, authenticated;
grant execute on function public.get_catalog_product_commerce_by_slug(text, text, text)
  to anon, authenticated;

create or replace function public.list_catalog_facets_filtered(
  p_locale text,
  p_market text,
  p_search text default null,
  p_product_type text default null,
  p_category_slug text default null,
  p_collection_slug text default null,
  p_technique_slug text default null,
  p_tag_slug text default null
)
returns table (
  facet_type text,
  id uuid,
  slug text,
  label text,
  product_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  selected_technique_id uuid;
  selected_tag_id uuid;
begin
  perform public.catalog_validate_locale_market(p_locale, p_market);

  if p_technique_slug is not null then
    select technique.id
      into selected_technique_id
    from public.techniques technique
    where technique.id::text = btrim(p_technique_slug);

    if selected_technique_id is null then
      return;
    end if;
  end if;

  if p_tag_slug is not null then
    select tag.id
      into selected_tag_id
    from public.tags tag
    where tag.id::text = btrim(p_tag_slug);

    if selected_tag_id is null then
      return;
    end if;
  end if;

  return query
  with eligible_products as (
    select listed.product_id
    from public.list_catalog_products(
      p_locale,
      p_market,
      nullif(btrim(p_search), ''),
      p_product_type,
      nullif(btrim(p_category_slug), ''),
      selected_technique_id,
      selected_tag_id,
      case
        when nullif(btrim(p_collection_slug), '') is not null
          then 'collection:' || btrim(p_collection_slug)
        else 'newest'
      end
    ) listed
  ),
  category_facets as (
    select
      'category'::text as facet_type,
      category.id as id,
      translation.slug as slug,
      translation.name as label,
      count(*)::bigint as product_count
    from eligible_products eligible
    join public.product_categories assignment on assignment.product_id = eligible.product_id
    join public.categories category on category.id = assignment.category_id
    join public.category_translations translation
      on translation.category_id = category.id
     and translation.locale = p_locale
    group by category.id, translation.slug, translation.name
  ),
  collection_facets as (
    select
      'collection'::text as facet_type,
      collection.id as id,
      translation.slug as slug,
      translation.name as label,
      count(*)::bigint as product_count
    from eligible_products eligible
    join public.collection_products assignment on assignment.product_id = eligible.product_id
    join public.collections collection on collection.id = assignment.collection_id
    join public.collection_translations translation
      on translation.collection_id = collection.id
     and translation.locale = p_locale
    group by collection.id, translation.slug, translation.name
  ),
  technique_facets as (
    select
      'technique'::text as facet_type,
      technique.id as id,
      technique.id::text as slug,
      translation.name as label,
      count(*)::bigint as product_count
    from eligible_products eligible
    join public.product_techniques assignment on assignment.product_id = eligible.product_id
    join public.techniques technique on technique.id = assignment.technique_id
    join public.technique_translations translation
      on translation.technique_id = technique.id
     and translation.locale = p_locale
    group by technique.id, translation.name
  ),
  tag_facets as (
    select
      'tag'::text as facet_type,
      tag.id as id,
      tag.id::text as slug,
      translation.name as label,
      count(*)::bigint as product_count
    from eligible_products eligible
    join public.product_tags assignment on assignment.product_id = eligible.product_id
    join public.tags tag on tag.id = assignment.tag_id
    join public.tag_translations translation
      on translation.tag_id = tag.id
     and translation.locale = p_locale
    group by tag.id, translation.name
  )
  select combined.*
  from (
    select * from category_facets
    union all select * from collection_facets
    union all select * from technique_facets
    union all select * from tag_facets
  ) combined
  order by combined.facet_type, combined.label, combined.slug;
end;
$$;

revoke all on function public.list_catalog_facets_filtered(
  text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.list_catalog_facets_filtered(
  text, text, text, text, text, text, text, text
) to anon, authenticated;
