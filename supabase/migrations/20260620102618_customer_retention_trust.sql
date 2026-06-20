create table public.customer_shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  recipient_name text not null check (char_length(btrim(recipient_name)) between 1 and 120),
  phone_number text not null check (char_length(btrim(phone_number)) between 5 and 40),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region text check (region is null or char_length(btrim(region)) between 1 and 200),
  locality text check (locality is null or char_length(btrim(locality)) between 1 and 200),
  address_line_1 text not null check (char_length(btrim(address_line_1)) between 1 and 200),
  address_line_2 text check (address_line_2 is null or char_length(btrim(address_line_2)) between 1 and 200),
  postal_code text check (postal_code is null or char_length(btrim(postal_code)) between 1 and 200),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customer_shipping_addresses_one_default_idx
on public.customer_shipping_addresses (user_id)
where is_default;

create index customer_shipping_addresses_owner_updated_idx
on public.customer_shipping_addresses (user_id, updated_at desc);

alter table public.customer_shipping_addresses enable row level security;

revoke all on table public.customer_shipping_addresses from public, anon, authenticated;
grant select, insert, update, delete on table public.customer_shipping_addresses to authenticated;
grant select, insert, update, delete on table public.customer_shipping_addresses to service_role;

create policy "customer shipping addresses are owner readable"
on public.customer_shipping_addresses
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "customer shipping addresses are owner insertable"
on public.customer_shipping_addresses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "customer shipping addresses are owner updatable"
on public.customer_shipping_addresses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "customer shipping addresses are owner deletable"
on public.customer_shipping_addresses
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.save_customer_shipping_address(
  p_address_id uuid,
  p_label text,
  p_recipient_name text,
  p_phone_number text,
  p_country_code text,
  p_region text,
  p_locality text,
  p_address_line_1 text,
  p_address_line_2 text,
  p_postal_code text,
  p_is_default boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if p_address_id is not null and not exists (
    select 1
    from public.customer_shipping_addresses
    where id = p_address_id
      and user_id = auth.uid()
  ) then
    return jsonb_build_object('status', 'not_found');
  end if;

  if coalesce(p_is_default, false) then
    update public.customer_shipping_addresses
    set is_default = false,
        updated_at = now()
    where user_id = auth.uid()
      and is_default
      and (p_address_id is null or id <> p_address_id);
  end if;

  if p_address_id is null then
    insert into public.customer_shipping_addresses (
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
    ) values (
      auth.uid(),
      btrim(p_label),
      btrim(p_recipient_name),
      btrim(p_phone_number),
      upper(btrim(p_country_code)),
      nullif(btrim(p_region), ''),
      nullif(btrim(p_locality), ''),
      btrim(p_address_line_1),
      nullif(btrim(p_address_line_2), ''),
      nullif(btrim(p_postal_code), ''),
      coalesce(p_is_default, false)
    )
    returning id into saved_id;
  else
    update public.customer_shipping_addresses
    set label = btrim(p_label),
        recipient_name = btrim(p_recipient_name),
        phone_number = btrim(p_phone_number),
        country_code = upper(btrim(p_country_code)),
        region = nullif(btrim(p_region), ''),
        locality = nullif(btrim(p_locality), ''),
        address_line_1 = btrim(p_address_line_1),
        address_line_2 = nullif(btrim(p_address_line_2), ''),
        postal_code = nullif(btrim(p_postal_code), ''),
        is_default = coalesce(p_is_default, false),
        updated_at = now()
    where id = p_address_id
      and user_id = auth.uid()
    returning id into saved_id;
  end if;

  return jsonb_build_object('status', 'saved', 'address_id', saved_id);
exception
  when check_violation or unique_violation then
    return jsonb_build_object('status', 'invalid');
end;
$$;

create or replace function public.delete_customer_shipping_address(p_address_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  deleted_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  delete from public.customer_shipping_addresses
  where id = p_address_id
    and user_id = auth.uid()
  returning id into deleted_id;

  if deleted_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'deleted');
end;
$$;

create or replace function public.set_default_customer_shipping_address(p_address_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if not exists (
    select 1
    from public.customer_shipping_addresses
    where id = p_address_id
      and user_id = auth.uid()
  ) then
    return jsonb_build_object('status', 'not_found');
  end if;

  update public.customer_shipping_addresses
  set is_default = (id = p_address_id),
      updated_at = case when is_default is distinct from (id = p_address_id) then now() else updated_at end
  where user_id = auth.uid();

  return jsonb_build_object('status', 'default_set');
end;
$$;

revoke all on function public.save_customer_shipping_address(uuid, text, text, text, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.delete_customer_shipping_address(uuid) from public, anon;
revoke all on function public.set_default_customer_shipping_address(uuid) from public, anon;

grant execute on function public.save_customer_shipping_address(uuid, text, text, text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.delete_customer_shipping_address(uuid) to authenticated;
grant execute on function public.set_default_customer_shipping_address(uuid) to authenticated;

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index wishlist_items_owner_product_idx
on public.wishlist_items (user_id, product_id);

create index wishlist_items_owner_created_idx
on public.wishlist_items (user_id, created_at desc);

alter table public.wishlist_items enable row level security;

revoke all on table public.wishlist_items from public, anon, authenticated;
grant select, insert, delete on table public.wishlist_items to authenticated;
grant select, insert, delete on table public.wishlist_items to service_role;

create policy "wishlist items are owner readable"
on public.wishlist_items
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "wishlist items are owner insertable"
on public.wishlist_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "wishlist items are owner deletable"
on public.wishlist_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.get_customer_wishlist(p_locale text, p_market text)
returns table (
  wishlist_item_id uuid,
  product_id uuid,
  created_at timestamptz,
  product_type text,
  product_status text,
  slug text,
  title text,
  description text,
  available boolean,
  currency_code text,
  price_minor bigint,
  in_stock boolean,
  primary_image_bucket text,
  primary_image_path text,
  primary_image_alt text,
  variants jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.catalog_validate_locale_market(p_locale, p_market);

  if auth.uid() is null then
    return;
  end if;

  return query
  select
    wi.id as wishlist_item_id,
    p.id as product_id,
    wi.created_at,
    p.product_type,
    p.status as product_status,
    pt.slug,
    pt.title,
    pt.description,
    (p.status = 'published' and pmo.id is not null) as available,
    case when p.status = 'published' and pmo.id is not null then pmo.currency_code else null end as currency_code,
    case when p.status = 'published' and pmo.id is not null then pmo.price_minor else null end as price_minor,
    case
      when p.status <> 'published' or pmo.id is null then false
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
  from public.wishlist_items wi
  join public.products p
    on p.id = wi.product_id
  join public.product_translations pt
    on pt.product_id = p.id
   and pt.locale = p_locale
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
  where wi.user_id = auth.uid()
  order by wi.created_at desc;
end;
$$;

revoke all on function public.get_customer_wishlist(text, text) from public, anon;
grant execute on function public.get_customer_wishlist(text, text) to authenticated;
