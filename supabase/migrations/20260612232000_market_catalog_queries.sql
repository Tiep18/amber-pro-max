create or replace function public.catalog_valid_locale(value text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select value in ('vi', 'en');
$$;

create or replace function public.catalog_valid_market(value text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select value in ('vn', 'intl');
$$;

create or replace function public.catalog_validate_locale_market(locale text, market text)
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if not public.catalog_valid_locale(locale) then
    raise exception 'invalid locale' using errcode = '22023';
  end if;

  if not public.catalog_valid_market(market) then
    raise exception 'invalid market code' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.list_catalog_products(
  p_locale text,
  p_market text,
  p_search text default null,
  p_product_type text default null,
  p_category_slug text default null,
  p_technique_id uuid default null,
  p_tag_id uuid default null,
  p_sort text default 'newest'
)
returns table (
  product_id uuid,
  slug text,
  title text,
  description text,
  product_type text,
  currency_code text,
  price_minor bigint,
  primary_image_bucket text,
  primary_image_path text,
  primary_image_alt text,
  in_stock boolean,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  collection_slug text;
  effective_sort text := coalesce(p_sort, 'newest');
begin
  perform public.catalog_validate_locale_market(p_locale, p_market);

  if p_product_type is not null and p_product_type not in ('pdf_pattern', 'physical_finished') then
    raise exception 'invalid product type' using errcode = '22023';
  end if;

  if effective_sort not in ('newest', 'price_asc', 'price_desc', 'title')
    and effective_sort not like 'collection:%' then
    raise exception 'invalid sort' using errcode = '22023';
  end if;

  if effective_sort like 'collection:%' then
    collection_slug := nullif(substring(effective_sort from 12), '');
    effective_sort := 'collection';
  end if;

  return query
  with eligible as (
    select
      p.id as product_id,
      p.product_type,
      p.published_at,
      pt.slug,
      pt.title,
      pt.description,
      pmo.currency_code,
      pmo.price_minor,
      pm.bucket_id as primary_image_bucket,
      pm.object_path as primary_image_path,
      case p_locale
        when 'vi' then pm.alt_text_vi
        else pm.alt_text_en
      end as primary_image_alt,
      coalesce(
        exists (
          select 1
          from public.product_variants pv
          join public.variant_market_offers vmo
            on vmo.variant_id = pv.id
           and vmo.market_code = p_market
           and vmo.enabled
          join public.inventory_records vir
            on vir.variant_id = pv.id
           and vir.quantity_on_hand > 0
          where pv.product_id = p.id
        ),
        false
      ) or coalesce(ir.quantity_on_hand > 0, p.product_type = 'pdf_pattern') as in_stock,
      cp.display_order as collection_order
    from public.products p
    join public.product_translations pt
      on pt.product_id = p.id
     and pt.locale = p_locale
    join public.product_market_offers pmo
      on pmo.product_id = p.id
     and pmo.market_code = p_market
     and pmo.enabled
     and pmo.price_minor is not null
    left join public.product_media pm
      on pm.product_id = p.id
     and pm.is_primary
    left join public.inventory_records ir
      on ir.product_id = p.id
    left join public.collection_translations selected_collection
      on selected_collection.locale = p_locale
     and selected_collection.slug = collection_slug
    left join public.collection_products cp
      on cp.product_id = p.id
     and cp.collection_id = selected_collection.collection_id
    where p.status = 'published'
      and (p_product_type is null or p.product_type = p_product_type)
      and (
        p_search is null
        or length(btrim(p_search)) = 0
        or pt.title ilike '%' || btrim(p_search) || '%'
        or pt.description ilike '%' || btrim(p_search) || '%'
      )
      and (
        p_category_slug is null
        or exists (
          select 1
          from public.product_categories pc
          join public.category_translations ct
            on ct.category_id = pc.category_id
           and ct.locale = p_locale
           and ct.slug = p_category_slug
          where pc.product_id = p.id
        )
      )
      and (
        p_technique_id is null
        or exists (
          select 1
          from public.product_techniques ptech
          where ptech.product_id = p.id
            and ptech.technique_id = p_technique_id
        )
      )
      and (
        p_tag_id is null
        or exists (
          select 1
          from public.product_tags ptag
          where ptag.product_id = p.id
            and ptag.tag_id = p_tag_id
        )
      )
      and (effective_sort <> 'collection' or cp.product_id is not null)
  )
  select
    eligible.product_id,
    eligible.slug,
    eligible.title,
    eligible.description,
    eligible.product_type,
    eligible.currency_code,
    eligible.price_minor,
    eligible.primary_image_bucket,
    eligible.primary_image_path,
    eligible.primary_image_alt,
    eligible.in_stock,
    eligible.published_at
  from eligible
  order by
    case when effective_sort = 'collection' then eligible.collection_order end asc,
    case when effective_sort = 'title' then eligible.title end asc,
    case when effective_sort = 'price_asc' then eligible.price_minor end asc,
    case when effective_sort = 'price_desc' then eligible.price_minor end desc,
    case when effective_sort = 'newest' then eligible.published_at end desc,
    eligible.slug asc;
end;
$$;

create or replace function public.list_catalog_facets(p_locale text, p_market text)
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
begin
  perform public.catalog_validate_locale_market(p_locale, p_market);

  return query
  with eligible_products as (
    select lp.product_id
    from public.list_catalog_products(p_locale, p_market, null, null, null, null, null, 'newest') lp
  ),
  category_facets as (
    select
      'category'::text as facet_type,
      c.id,
      ct.slug,
      ct.name as label,
      count(*)::bigint as product_count
    from eligible_products ep
    join public.product_categories pc on pc.product_id = ep.product_id
    join public.categories c on c.id = pc.category_id
    join public.category_translations ct
      on ct.category_id = c.id
     and ct.locale = p_locale
    group by c.id, ct.slug, ct.name
  ),
  collection_facets as (
    select
      'collection'::text as facet_type,
      c.id,
      ct.slug,
      ct.name as label,
      count(*)::bigint as product_count
    from eligible_products ep
    join public.collection_products cp on cp.product_id = ep.product_id
    join public.collections c on c.id = cp.collection_id
    join public.collection_translations ct
      on ct.collection_id = c.id
     and ct.locale = p_locale
    group by c.id, ct.slug, ct.name
  )
  select * from category_facets
  union all
  select * from collection_facets
  order by facet_type, label;
end;
$$;

create or replace function public.get_catalog_product_by_slug(p_locale text, p_market text, p_slug text)
returns table (
  product_id uuid,
  slug text,
  title text,
  description text,
  specifications jsonb,
  product_type text,
  available boolean,
  currency_code text,
  price_minor bigint,
  in_stock boolean,
  primary_image_bucket text,
  primary_image_path text,
  primary_image_alt text,
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  other_market_code text,
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
    p.id as product_id,
    pt.slug,
    pt.title,
    pt.description,
    pt.specifications,
    p.product_type,
    (pmo.id is not null) as available,
    pmo.currency_code,
    pmo.price_minor,
    case
      when pmo.id is null then false
      when p.product_type = 'pdf_pattern' then true
      else coalesce(ir.quantity_on_hand > 0, false)
        or exists (
          select 1
          from public.product_variants pv
          join public.variant_market_offers vmo
            on vmo.variant_id = pv.id
           and vmo.market_code = p_market
           and vmo.enabled
          join public.inventory_records vir
            on vir.variant_id = pv.id
           and vir.quantity_on_hand > 0
          where pv.product_id = p.id
        )
    end as in_stock,
    pm.bucket_id as primary_image_bucket,
    pm.object_path as primary_image_path,
    case p_locale
      when 'vi' then pm.alt_text_vi
      else pm.alt_text_en
    end as primary_image_alt,
    pt.seo_title,
    pt.seo_description,
    pt.social_image_bucket,
    pt.social_image_path,
    case
      when pmo.id is not null then null::text
      when exists (
        select 1
        from public.product_market_offers alternate
        where alternate.product_id = p.id
          and alternate.enabled
          and alternate.price_minor is not null
          and alternate.market_code <> p_market
      ) then (
        select alternate.market_code
        from public.product_market_offers alternate
        where alternate.product_id = p.id
          and alternate.enabled
          and alternate.price_minor is not null
          and alternate.market_code <> p_market
        order by alternate.market_code
        limit 1
      )
      else null::text
    end as other_market_code,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'variant_id', pv.id,
            'sku', pv.sku,
            'attributes', pv.attributes,
            'display_order', pv.display_order,
            'enabled', coalesce(vmo.enabled, false),
            'currency_code', case when coalesce(vmo.enabled, false) then vmo.currency_code else null end,
            'price_minor', case when coalesce(vmo.enabled, false) then vmo.price_minor else null end,
            'stock', coalesce(vir.quantity_on_hand > 0, false)
          )
          order by pv.display_order, pv.sku
        )
        from public.product_variants pv
        left join public.variant_market_offers vmo
          on vmo.variant_id = pv.id
         and vmo.market_code = p_market
        left join public.inventory_records vir
          on vir.variant_id = pv.id
        where pv.product_id = p.id
      ),
      '[]'::jsonb
    ) as variants
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
  left join public.product_media pm
    on pm.product_id = p.id
   and pm.is_primary
  where p.status = 'published';
end;
$$;

create or replace function public.get_catalog_category_by_slug(p_locale text, p_market text, p_slug text)
returns table (
  category_id uuid,
  slug text,
  name text,
  description text,
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  product_count bigint
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
    c.id,
    ct.slug,
    ct.name,
    ct.description,
    ct.seo_title,
    ct.seo_description,
    ct.social_image_bucket,
    ct.social_image_path,
    (
      select count(*)::bigint
      from public.list_catalog_products(p_locale, p_market, null, null, ct.slug, null, null, 'newest')
    )
  from public.categories c
  join public.category_translations ct
    on ct.category_id = c.id
   and ct.locale = p_locale
   and ct.slug = p_slug;
end;
$$;

create or replace function public.get_catalog_collection_by_slug(p_locale text, p_market text, p_slug text)
returns table (
  collection_id uuid,
  slug text,
  name text,
  description text,
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  product_count bigint
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
    c.id,
    ct.slug,
    ct.name,
    ct.description,
    ct.seo_title,
    ct.seo_description,
    ct.social_image_bucket,
    ct.social_image_path,
    (
      select count(*)::bigint
      from public.list_catalog_products(p_locale, p_market, null, null, null, null, null, 'collection:' || ct.slug)
    )
  from public.collections c
  join public.collection_translations ct
    on ct.collection_id = c.id
   and ct.locale = p_locale
   and ct.slug = p_slug;
end;
$$;

revoke all on function public.catalog_valid_locale(text) from public, anon, authenticated;
revoke all on function public.catalog_valid_market(text) from public, anon, authenticated;
revoke all on function public.catalog_validate_locale_market(text, text) from public, anon, authenticated;
revoke all on function public.list_catalog_products(text, text, text, text, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.list_catalog_facets(text, text) from public, anon, authenticated;
revoke all on function public.get_catalog_product_by_slug(text, text, text) from public, anon, authenticated;
revoke all on function public.get_catalog_category_by_slug(text, text, text) from public, anon, authenticated;
revoke all on function public.get_catalog_collection_by_slug(text, text, text) from public, anon, authenticated;

grant execute on function public.catalog_valid_locale(text) to anon, authenticated;
grant execute on function public.catalog_valid_market(text) to anon, authenticated;
grant execute on function public.catalog_validate_locale_market(text, text) to anon, authenticated;
grant execute on function public.list_catalog_products(text, text, text, text, text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.list_catalog_facets(text, text) to anon, authenticated;
grant execute on function public.get_catalog_product_by_slug(text, text, text) to anon, authenticated;
grant execute on function public.get_catalog_category_by_slug(text, text, text) to anon, authenticated;
grant execute on function public.get_catalog_collection_by_slug(text, text, text) to anon, authenticated;
