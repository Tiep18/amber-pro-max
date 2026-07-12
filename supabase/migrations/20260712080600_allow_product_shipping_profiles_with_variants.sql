-- SHIP-09: product-level parcel profiles remain a valid inheritance layer
-- for variants without explicit overrides.
create or replace function private.enforce_product_shipping_profile_owner()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
declare
  owner_type text;
begin
  select product_type
  into owner_type
  from public.products
  where id = new.product_id;

  if owner_type <> 'physical_finished' then
    raise exception 'only physical products can attach shipping profiles'
      using errcode = '23514';
  end if;

  return new;
end;
$$;
