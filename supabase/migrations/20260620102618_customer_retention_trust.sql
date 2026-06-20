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
