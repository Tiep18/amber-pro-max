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
  with market_products as materialized (
    select listed.product_id
    from public.list_catalog_products(
      p_locale, p_market, null, null, null, null, null, 'newest'
    ) listed
  ),
  category_scope as materialized (
    select listed.product_id
    from public.list_catalog_products(
      p_locale,
      p_market,
      nullif(btrim(p_search), ''),
      p_product_type,
      null,
      selected_technique_id,
      selected_tag_id,
      case
        when nullif(btrim(p_collection_slug), '') is not null
          then 'collection:' || btrim(p_collection_slug)
        else 'newest'
      end
    ) listed
  ),
  collection_scope as materialized (
    select listed.product_id
    from public.list_catalog_products(
      p_locale,
      p_market,
      nullif(btrim(p_search), ''),
      p_product_type,
      nullif(btrim(p_category_slug), ''),
      selected_technique_id,
      selected_tag_id,
      'newest'
    ) listed
  ),
  technique_scope as materialized (
    select listed.product_id
    from public.list_catalog_products(
      p_locale,
      p_market,
      nullif(btrim(p_search), ''),
      p_product_type,
      nullif(btrim(p_category_slug), ''),
      null,
      selected_tag_id,
      case
        when nullif(btrim(p_collection_slug), '') is not null
          then 'collection:' || btrim(p_collection_slug)
        else 'newest'
      end
    ) listed
  ),
  tag_scope as materialized (
    select listed.product_id
    from public.list_catalog_products(
      p_locale,
      p_market,
      nullif(btrim(p_search), ''),
      p_product_type,
      nullif(btrim(p_category_slug), ''),
      selected_technique_id,
      null,
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
      category.id,
      translation.slug,
      translation.name as label,
      count(distinct category_scope.product_id)::bigint as product_count
    from market_products
    join public.product_categories assignment
      on assignment.product_id = market_products.product_id
    join public.categories category on category.id = assignment.category_id
    join public.category_translations translation
      on translation.category_id = category.id
     and translation.locale = p_locale
    left join category_scope on category_scope.product_id = assignment.product_id
    group by category.id, translation.slug, translation.name
  ),
  collection_facets as (
    select
      'collection'::text as facet_type,
      collection.id,
      translation.slug,
      translation.name as label,
      count(distinct collection_scope.product_id)::bigint as product_count
    from market_products
    join public.collection_products assignment
      on assignment.product_id = market_products.product_id
    join public.collections collection on collection.id = assignment.collection_id
    join public.collection_translations translation
      on translation.collection_id = collection.id
     and translation.locale = p_locale
    left join collection_scope on collection_scope.product_id = assignment.product_id
    group by collection.id, translation.slug, translation.name
  ),
  technique_facets as (
    select
      'technique'::text as facet_type,
      technique.id,
      technique.id::text as slug,
      translation.name as label,
      count(distinct technique_scope.product_id)::bigint as product_count
    from market_products
    join public.product_techniques assignment
      on assignment.product_id = market_products.product_id
    join public.techniques technique on technique.id = assignment.technique_id
    join public.technique_translations translation
      on translation.technique_id = technique.id
     and translation.locale = p_locale
    left join technique_scope on technique_scope.product_id = assignment.product_id
    group by technique.id, translation.name
  ),
  tag_facets as (
    select
      'tag'::text as facet_type,
      tag.id,
      tag.id::text as slug,
      translation.name as label,
      count(distinct tag_scope.product_id)::bigint as product_count
    from market_products
    join public.product_tags assignment
      on assignment.product_id = market_products.product_id
    join public.tags tag on tag.id = assignment.tag_id
    join public.tag_translations translation
      on translation.tag_id = tag.id
     and translation.locale = p_locale
    left join tag_scope on tag_scope.product_id = assignment.product_id
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
