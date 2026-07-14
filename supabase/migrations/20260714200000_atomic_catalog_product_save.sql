create or replace function public.admin_save_catalog_product(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_product_id uuid;
  target_product_type text;
begin
  if not private.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  target_product_id := nullif(p_payload ->> 'product_id', '')::uuid;
  target_product_type := p_payload ->> 'product_type';

  if target_product_type not in ('pdf_pattern', 'physical_finished') then
    raise exception 'invalid catalog product type' using errcode = '23514';
  end if;

  if target_product_id is null then
    insert into public.products (product_type, created_by)
    values (target_product_type, auth.uid())
    returning id into target_product_id;
  else
    update public.products
    set
      product_type = target_product_type,
      updated_at = now()
    where id = target_product_id;

    if not found then
      raise no_data_found using message = 'catalog product not found';
    end if;
  end if;

  insert into public.product_translations (
    product_id,
    locale,
    title,
    description,
    specifications,
    slug,
    seo_title,
    seo_description,
    updated_at
  )
  select
    target_product_id,
    translation.locale,
    translation.title,
    translation.description,
    translation.specifications,
    translation.slug,
    translation.seo_title,
    translation.seo_description,
    now()
  from jsonb_to_recordset(coalesce(p_payload -> 'translations', '[]'::jsonb)) as translation(
    locale text,
    title text,
    description text,
    specifications jsonb,
    slug text,
    seo_title text,
    seo_description text
  )
  on conflict (product_id, locale) do update
  set
    title = excluded.title,
    description = excluded.description,
    specifications = excluded.specifications,
    slug = excluded.slug,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    updated_at = excluded.updated_at;

  insert into public.product_market_offers (
    product_id,
    market_code,
    currency_code,
    enabled,
    price_minor,
    updated_at
  )
  select
    target_product_id,
    offer.market_code,
    offer.currency_code,
    offer.enabled,
    offer.price_minor,
    now()
  from jsonb_to_recordset(coalesce(p_payload -> 'offers', '[]'::jsonb)) as offer(
    market_code text,
    currency_code text,
    enabled boolean,
    price_minor bigint
  )
  on conflict (product_id, market_code) do update
  set
    currency_code = excluded.currency_code,
    enabled = excluded.enabled,
    price_minor = excluded.price_minor,
    updated_at = excluded.updated_at;

  delete from public.product_categories where product_id = target_product_id;
  delete from public.product_techniques where product_id = target_product_id;
  delete from public.product_tags where product_id = target_product_id;
  delete from public.collection_products where product_id = target_product_id;

  insert into public.product_categories (product_id, category_id)
  select target_product_id, value::uuid
  from jsonb_array_elements_text(coalesce(p_payload -> 'category_ids', '[]'::jsonb));

  insert into public.product_techniques (product_id, technique_id)
  select target_product_id, value::uuid
  from jsonb_array_elements_text(coalesce(p_payload -> 'technique_ids', '[]'::jsonb));

  insert into public.product_tags (product_id, tag_id)
  select target_product_id, value::uuid
  from jsonb_array_elements_text(coalesce(p_payload -> 'tag_ids', '[]'::jsonb));

  insert into public.collection_products (product_id, collection_id, display_order)
  select target_product_id, membership.collection_id, membership.display_order
  from jsonb_to_recordset(coalesce(p_payload -> 'collections', '[]'::jsonb)) as membership(
    collection_id uuid,
    display_order integer
  );

  return target_product_id;
end;
$$;

revoke all on function public.admin_save_catalog_product(jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_catalog_product(jsonb) to authenticated;
