create or replace function public.admin_save_catalog_variant(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_product_id uuid;
  target_variant_id uuid;
  target_product_type text;
  existing_product_id uuid;
  saved_variant_id uuid;
begin
  if not private.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  target_product_id := (p_payload ->> 'product_id')::uuid;
  target_variant_id := (p_payload ->> 'variant_id')::uuid;

  select product_type
  into target_product_type
  from public.products
  where id = target_product_id
  for update;

  if not found then
    raise exception 'catalog product not found' using errcode = 'P2001';
  end if;

  if target_product_type <> 'physical_finished' then
    raise exception 'variants require a physical product' using errcode = 'P2002';
  end if;

  select product_id
  into existing_product_id
  from public.product_variants
  where id = target_variant_id
  for update;

  if existing_product_id is not null and existing_product_id <> target_product_id then
    raise exception 'variant belongs to another product' using errcode = 'P2003';
  end if;

  insert into public.product_variants (
    id,
    product_id,
    sku,
    attributes,
    display_order,
    media_id,
    updated_at
  )
  values (
    target_variant_id,
    target_product_id,
    p_payload ->> 'sku',
    p_payload -> 'attributes',
    (p_payload ->> 'display_order')::integer,
    nullif(p_payload ->> 'media_id', '')::uuid,
    now()
  )
  on conflict (id) do update
  set
    product_id = excluded.product_id,
    sku = excluded.sku,
    attributes = excluded.attributes,
    display_order = excluded.display_order,
    media_id = excluded.media_id,
    updated_at = excluded.updated_at
  where product_variants.product_id = excluded.product_id
  returning id into saved_variant_id;

  if saved_variant_id is null then
    raise exception 'variant belongs to another product' using errcode = 'P2003';
  end if;

  delete from public.variant_market_offers
  where variant_id = target_variant_id;

  insert into public.variant_market_offers (
    variant_id,
    market_code,
    enabled,
    currency_code,
    price_minor,
    updated_at
  )
  select
    target_variant_id,
    override.market_code,
    override.enabled,
    override.currency_code,
    override.price_minor,
    now()
  from jsonb_to_recordset(coalesce(p_payload -> 'overrides', '[]'::jsonb)) as override(
    market_code text,
    enabled boolean,
    currency_code text,
    price_minor bigint
  );

  insert into public.inventory_records (
    product_id,
    variant_id,
    quantity_on_hand,
    updated_at
  )
  values (
    null,
    target_variant_id,
    (p_payload ->> 'quantity_on_hand')::integer,
    now()
  )
  on conflict (variant_id) do update
  set
    quantity_on_hand = excluded.quantity_on_hand,
    updated_at = excluded.updated_at;

  return target_variant_id;
end;
$$;

revoke all on function public.admin_save_catalog_variant(jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_catalog_variant(jsonb) to authenticated;
