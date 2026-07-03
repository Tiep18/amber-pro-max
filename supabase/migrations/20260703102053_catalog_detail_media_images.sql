drop function if exists public.get_catalog_product_by_slug(text, text, text);

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
  media_images jsonb,
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  localized_slugs jsonb,
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
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'bucket_id', media.bucket_id,
            'object_path', media.object_path,
            'alt', case p_locale
              when 'vi' then media.alt_text_vi
              else media.alt_text_en
            end,
            'display_order', media.display_order,
            'is_primary', media.is_primary
          )
          order by media.is_primary desc, media.display_order, media.object_path
        )
        from public.product_media media
        where media.product_id = p.id
      ),
      '[]'::jsonb
    ) as media_images,
    pt.seo_title,
    pt.seo_description,
    pt.social_image_bucket,
    pt.social_image_path,
    (
      select jsonb_object_agg(all_translations.locale, all_translations.slug)
      from public.product_translations all_translations
      where all_translations.product_id = p.id
    ) as localized_slugs,
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

revoke all on function public.get_catalog_product_by_slug(text, text, text) from public, anon, authenticated;
grant execute on function public.get_catalog_product_by_slug(text, text, text) to anon, authenticated;
