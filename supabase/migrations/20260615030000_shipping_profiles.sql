create table public.shipping_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.shipping_profiles(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check (currency_code in ('VND', 'USD')),
  first_item_fee_minor integer not null check (first_item_fee_minor >= 0),
  additional_item_fee_minor integer not null check (additional_item_fee_minor >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, country_code, currency_code)
);

create table public.product_shipping_profiles (
  product_id uuid primary key references public.products(id) on delete cascade,
  profile_id uuid not null references public.shipping_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.variant_shipping_profiles (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  profile_id uuid not null references public.shipping_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index shipping_rules_lookup_idx
on public.shipping_rules (country_code, currency_code, active, profile_id);

create index shipping_rules_profile_idx
on public.shipping_rules (profile_id, active, country_code);

create index product_shipping_profiles_profile_idx
on public.product_shipping_profiles (profile_id, product_id);

create index variant_shipping_profiles_profile_idx
on public.variant_shipping_profiles (profile_id, variant_id);

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

  if exists (
    select 1
    from public.product_variants
    where product_id = new.product_id
  ) then
    raise exception 'products with variants require variant shipping profiles'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger product_shipping_profiles_enforce_owner
before insert or update on public.product_shipping_profiles
for each row execute function private.enforce_product_shipping_profile_owner();

create or replace function private.enforce_variant_shipping_profile_owner()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
declare
  owner_type text;
begin
  select products.product_type
  into owner_type
  from public.product_variants
  join public.products
    on products.id = product_variants.product_id
  where product_variants.id = new.variant_id;

  if owner_type <> 'physical_finished' then
    raise exception 'only physical variants can attach shipping profiles'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger variant_shipping_profiles_enforce_owner
before insert or update on public.variant_shipping_profiles
for each row execute function private.enforce_variant_shipping_profile_owner();

revoke all on function private.enforce_product_shipping_profile_owner() from public;
revoke all on function private.enforce_product_shipping_profile_owner() from anon;
revoke all on function private.enforce_product_shipping_profile_owner() from authenticated;
revoke all on function private.enforce_variant_shipping_profile_owner() from public;
revoke all on function private.enforce_variant_shipping_profile_owner() from anon;
revoke all on function private.enforce_variant_shipping_profile_owner() from authenticated;

alter table public.shipping_profiles enable row level security;
alter table public.shipping_rules enable row level security;
alter table public.product_shipping_profiles enable row level security;
alter table public.variant_shipping_profiles enable row level security;

revoke all on table public.shipping_profiles from anon, authenticated;
revoke all on table public.shipping_rules from anon, authenticated;
revoke all on table public.product_shipping_profiles from anon, authenticated;
revoke all on table public.variant_shipping_profiles from anon, authenticated;

grant select, insert, update, delete on table public.shipping_profiles to authenticated;
grant select, insert, update, delete on table public.shipping_rules to authenticated;
grant select, insert, update, delete on table public.product_shipping_profiles to authenticated;
grant select, insert, update, delete on table public.variant_shipping_profiles to authenticated;

grant select, insert, update, delete on table public.shipping_profiles to service_role;
grant select, insert, update, delete on table public.shipping_rules to service_role;
grant select, insert, update, delete on table public.product_shipping_profiles to service_role;
grant select, insert, update, delete on table public.variant_shipping_profiles to service_role;

create policy "shipping profiles are admin managed"
on public.shipping_profiles
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "shipping rules are admin managed"
on public.shipping_rules
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "product shipping profiles are admin managed"
on public.product_shipping_profiles
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "variant shipping profiles are admin managed"
on public.variant_shipping_profiles
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create or replace function public.get_checkout_shipping_rules(
  p_product_ids uuid[],
  p_variant_ids uuid[],
  p_country_code text
)
returns table (
  product_id uuid,
  variant_id uuid,
  country_code text,
  first_item_fee_minor integer,
  additional_item_fee_minor integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with normalized as (
    select upper(btrim(p_country_code)) as country_code
  ),
  product_rules as (
    select
      psp.product_id,
      null::uuid as variant_id,
      sr.country_code,
      sr.first_item_fee_minor,
      sr.additional_item_fee_minor
    from public.product_shipping_profiles psp
    join public.shipping_profiles sp
      on sp.id = psp.profile_id
     and sp.active
    join public.shipping_rules sr
      on sr.profile_id = sp.id
     and sr.active
    join normalized
      on normalized.country_code = sr.country_code
    where psp.product_id = any(coalesce(p_product_ids, '{}'::uuid[]))
  ),
  variant_rules as (
    select
      null::uuid as product_id,
      vsp.variant_id,
      sr.country_code,
      sr.first_item_fee_minor,
      sr.additional_item_fee_minor
    from public.variant_shipping_profiles vsp
    join public.shipping_profiles sp
      on sp.id = vsp.profile_id
     and sp.active
    join public.shipping_rules sr
      on sr.profile_id = sp.id
     and sr.active
    join normalized
      on normalized.country_code = sr.country_code
    where vsp.variant_id = any(coalesce(p_variant_ids, '{}'::uuid[]))
  )
  select * from product_rules
  union all
  select * from variant_rules;
$$;

revoke all on function public.get_checkout_shipping_rules(uuid[], uuid[], text) from public, anon, authenticated;
grant execute on function public.get_checkout_shipping_rules(uuid[], uuid[], text) to anon, authenticated;
