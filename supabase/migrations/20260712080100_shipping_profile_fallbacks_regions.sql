-- D-03 / SHIP-07: store-default selection is explicit. This table intentionally
-- starts empty; no existing profile is nominated by this migration.
create table public.shipping_store_defaults (
  id uuid primary key default gen_random_uuid(),
  shipping_profile_id uuid not null unique references public.shipping_profiles(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index shipping_store_defaults_one_active_idx
on public.shipping_store_defaults ((active))
where active;

create or replace function private.validate_shipping_store_default()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  if new.active and not exists (
    select 1
    from public.shipping_profiles
    where id = new.shipping_profile_id
      and active
  ) then
    raise exception 'active shipping store default requires an active profile'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger shipping_store_defaults_validate_profile
before insert or update on public.shipping_store_defaults
for each row execute function private.validate_shipping_store_default();

create or replace function public.admin_set_shipping_store_default(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  selected_id uuid;
begin
  if not private.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if p_profile_id is null or not exists (
    select 1 from public.shipping_profiles where id = p_profile_id and active
  ) then
    raise exception 'active shipping profile required' using errcode = '23514';
  end if;

  -- Serialize the singleton scope even when the table currently has zero rows.
  perform pg_advisory_xact_lock(hashtextextended('shipping_store_default', 0));

  update public.shipping_store_defaults
  set active = false,
      updated_at = now()
  where active;

  insert into public.shipping_store_defaults (shipping_profile_id, active)
  values (p_profile_id, true)
  on conflict (shipping_profile_id) do update
    set active = true,
        updated_at = now()
  returning id into selected_id;

  return selected_id;
end;
$$;

-- D-02 / D-04 / SHIP-08: preserve every legacy semantic value and classify
-- existing rows as exact-country rules. No fallback row is synthesized.
alter table public.shipping_rules
  add column match_kind text not null default 'exact_country';

alter table public.shipping_rules
  drop constraint shipping_rules_country_code_check,
  drop constraint shipping_rules_profile_id_country_code_currency_code_key,
  alter column country_code drop not null;

alter table public.shipping_rules
  add constraint shipping_rules_match_kind_check
    check (match_kind in ('exact_country', 'fallback')),
  add constraint shipping_rules_destination_shape_check
    check (
      (match_kind = 'exact_country' and country_code is not null and country_code ~ '^[A-Z]{2}$')
      or (match_kind = 'fallback' and country_code is null)
    );

create unique index shipping_rules_exact_unique_idx
on public.shipping_rules (profile_id, country_code, currency_code)
where match_kind = 'exact_country';

create unique index shipping_rules_fallback_unique_idx
on public.shipping_rules (profile_id, currency_code)
where match_kind = 'fallback';

create index shipping_rules_active_resolution_idx
on public.shipping_rules (profile_id, currency_code, match_kind, country_code)
where active;

-- D-05 / D-06 / SHIP-10: generic normalized region adjustments inherit
-- currency from their parent shipping rule.
create table public.shipping_region_adjustments (
  id uuid primary key default gen_random_uuid(),
  shipping_rule_id uuid not null references public.shipping_rules(id) on delete cascade,
  country_code text not null,
  region_code text not null,
  mode text not null,
  first_item_fee_minor integer not null,
  additional_item_fee_minor integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_region_adjustments_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),
  constraint shipping_region_adjustments_region_code_check
    check (region_code ~ '^[A-Z0-9]{1,3}$'),
  constraint shipping_region_adjustments_mode_check
    check (mode in ('surcharge', 'replace')),
  constraint shipping_region_adjustments_amounts_check
    check (first_item_fee_minor >= 0 and additional_item_fee_minor >= 0)
);

create unique index shipping_region_adjustments_one_active_idx
on public.shipping_region_adjustments (shipping_rule_id, country_code, region_code)
where active;

create index shipping_region_adjustments_active_lookup_idx
on public.shipping_region_adjustments (shipping_rule_id, country_code, region_code)
where active;

create or replace function private.validate_shipping_region_adjustment()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
declare
  parent_kind text;
  parent_country text;
begin
  select match_kind, country_code
  into parent_kind, parent_country
  from public.shipping_rules
  where id = new.shipping_rule_id;

  if parent_kind = 'exact_country' and parent_country <> new.country_code then
    raise exception 'region adjustment country must match its exact parent rule'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger shipping_region_adjustments_validate_parent
before insert or update on public.shipping_region_adjustments
for each row execute function private.validate_shipping_region_adjustment();

-- D-09 / SHIP-12: immutable evidence is append-only and reconstructs each
-- physical line's selected rule chain and exact allocation.
create table public.checkout_order_shipping_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  order_line_id uuid not null references public.checkout_order_lines(id) on delete cascade,
  source_tier text not null check (source_tier in ('variant', 'product', 'store_default')),
  shipping_profile_id uuid not null references public.shipping_profiles(id) on delete restrict,
  profile_name text not null check (length(btrim(profile_name)) > 0),
  shipping_rule_id uuid not null references public.shipping_rules(id) on delete restrict,
  rule_match_kind text not null check (rule_match_kind in ('exact_country', 'fallback')),
  destination_country_code text not null check (destination_country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check (currency_code in ('VND', 'USD')),
  base_first_item_fee_minor integer not null check (base_first_item_fee_minor >= 0),
  base_additional_item_fee_minor integer not null check (base_additional_item_fee_minor >= 0),
  region_adjustment_id uuid references public.shipping_region_adjustments(id) on delete restrict,
  region_code text,
  region_mode text,
  region_first_item_fee_minor integer,
  region_additional_item_fee_minor integer,
  final_first_item_fee_minor integer not null check (final_first_item_fee_minor >= 0),
  final_additional_item_fee_minor integer not null check (final_additional_item_fee_minor >= 0),
  quantity integer not null check (quantity > 0),
  first_item_winner_units integer not null check (first_item_winner_units in (0, 1)),
  allocated_shipping_minor bigint not null check (allocated_shipping_minor >= 0),
  created_at timestamptz not null default now(),
  constraint checkout_shipping_allocation_region_evidence_check check (
    (
      region_adjustment_id is null
      and region_code is null
      and region_mode is null
      and region_first_item_fee_minor is null
      and region_additional_item_fee_minor is null
    )
    or (
      region_adjustment_id is not null
      and region_code ~ '^[A-Z0-9]{1,3}$'
      and region_mode in ('surcharge', 'replace')
      and region_first_item_fee_minor >= 0
      and region_additional_item_fee_minor >= 0
    )
  ),
  constraint checkout_shipping_allocation_total_check check (
    first_item_winner_units <= quantity
    and allocated_shipping_minor =
      (first_item_winner_units::bigint * final_first_item_fee_minor::bigint)
      + ((quantity - first_item_winner_units)::bigint * final_additional_item_fee_minor::bigint)
  )
);

create unique index checkout_order_shipping_allocations_order_line_uidx
on public.checkout_order_shipping_allocations (order_line_id);

create index checkout_order_shipping_allocations_order_idx
on public.checkout_order_shipping_allocations (order_id, order_line_id);

create or replace function private.validate_checkout_shipping_allocation()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.checkout_order_lines
    where id = new.order_line_id
      and order_id = new.order_id
      and fulfillment_type = 'physical'
      and currency_code = new.currency_code
      and quantity = new.quantity
  ) then
    raise exception 'shipping allocation requires its matching physical order line'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger checkout_order_shipping_allocations_validate_line
before insert on public.checkout_order_shipping_allocations
for each row execute function private.validate_checkout_shipping_allocation();

create or replace function private.prevent_checkout_shipping_allocation_mutation()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  raise exception 'checkout shipping allocation evidence is immutable'
    using errcode = '23514';
end;
$$;

create trigger checkout_order_shipping_allocations_immutable
before update or delete on public.checkout_order_shipping_allocations
for each row execute function private.prevent_checkout_shipping_allocation_mutation();

-- Plan 08-02 replaces this body without changing its hardened public contract.
create or replace function public.get_checkout_shipping_quote_v2(
  p_lines jsonb,
  p_country_code text,
  p_currency_code text,
  p_region_code text
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('status', 'error', 'code', 'resolver_not_ready');
$$;

-- T-08-01 / T-08-02: new configuration and allocation tables stay private.
alter table public.shipping_store_defaults enable row level security;
alter table public.shipping_region_adjustments enable row level security;
alter table public.checkout_order_shipping_allocations enable row level security;

revoke all on table public.shipping_store_defaults from anon, authenticated;
revoke all on table public.shipping_region_adjustments from anon, authenticated;
revoke all on table public.checkout_order_shipping_allocations from anon, authenticated;
revoke all on table public.shipping_store_defaults from service_role;
revoke all on table public.shipping_region_adjustments from service_role;
revoke all on table public.checkout_order_shipping_allocations from service_role;

grant select, insert, update, delete on table public.shipping_store_defaults to authenticated;
grant select, insert, update, delete on table public.shipping_region_adjustments to authenticated;
grant select, insert on table public.checkout_order_shipping_allocations to authenticated;

grant select, insert, update, delete on table public.shipping_store_defaults to service_role;
grant select, insert, update, delete on table public.shipping_region_adjustments to service_role;
grant select, insert on table public.checkout_order_shipping_allocations to service_role;

create policy "shipping store defaults are admin managed"
on public.shipping_store_defaults
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "shipping region adjustments are admin managed"
on public.shipping_region_adjustments
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "shipping allocations are admin readable"
on public.checkout_order_shipping_allocations
for select to authenticated
using (private.is_admin());

create policy "shipping allocations are admin insertable"
on public.checkout_order_shipping_allocations
for insert to authenticated
with check (private.is_admin());

revoke all on function private.validate_shipping_store_default() from public, anon, authenticated;
revoke all on function private.validate_shipping_region_adjustment() from public, anon, authenticated;
revoke all on function private.validate_checkout_shipping_allocation() from public, anon, authenticated;
revoke all on function private.prevent_checkout_shipping_allocation_mutation() from public, anon, authenticated;

revoke all on function public.admin_set_shipping_store_default(uuid) from public, anon, authenticated;
grant execute on function public.admin_set_shipping_store_default(uuid) to authenticated, service_role;

revoke all on function public.get_checkout_shipping_quote_v2(jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.get_checkout_shipping_quote_v2(jsonb, text, text, text) to anon, authenticated, service_role;
