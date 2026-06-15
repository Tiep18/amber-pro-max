create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code = upper(btrim(code)) and code ~ '^[A-Z0-9][A-Z0-9_-]{1,38}[A-Z0-9]$'),
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  percentage_bps integer check (percentage_bps is null or (percentage_bps > 0 and percentage_bps <= 10000)),
  amount_minor integer check (amount_minor is null or amount_minor > 0),
  currency_code text check (currency_code is null or currency_code in ('VND', 'USD')),
  market text check (market is null or market in ('vn', 'intl')),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  minimum_subtotal_minor integer not null default 0 check (minimum_subtotal_minor >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  check (
    (discount_type = 'percentage' and percentage_bps is not null and amount_minor is null and currency_code is null)
    or
    (discount_type = 'fixed' and percentage_bps is null and amount_minor is not null and currency_code is not null)
  ),
  check (
    market is null
    or (market = 'vn' and (currency_code is null or currency_code = 'VND'))
    or (market = 'intl' and (currency_code is null or currency_code = 'USD'))
  ),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (usage_limit is null or used_count <= usage_limit)
);

create table public.discount_code_customers (
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (discount_code_id, user_id)
);

create table public.discount_code_products (
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (discount_code_id, product_id)
);

create table public.discount_code_categories (
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (discount_code_id, category_id)
);

create table public.discount_code_collections (
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (discount_code_id, collection_id)
);

create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references public.discount_codes(id) on delete restrict,
  order_id uuid,
  checkout_draft_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  quote_hash text not null check (length(btrim(quote_hash)) > 0),
  amount_minor integer not null check (amount_minor >= 0),
  currency_code text not null check (currency_code in ('VND', 'USD')),
  status text not null default 'pending' check (status in ('pending', 'committed', 'void')),
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  voided_at timestamptz,
  check (
    (status = 'pending' and committed_at is null and voided_at is null)
    or (status = 'committed' and committed_at is not null and voided_at is null)
    or (status = 'void' and voided_at is not null)
  )
);

create index discount_codes_active_lookup_idx
on public.discount_codes (code, active, market, starts_at, ends_at);

create index discount_code_customers_user_idx
on public.discount_code_customers (user_id, discount_code_id);

create index discount_code_products_product_idx
on public.discount_code_products (product_id, discount_code_id);

create index discount_code_categories_category_idx
on public.discount_code_categories (category_id, discount_code_id);

create index discount_code_collections_collection_idx
on public.discount_code_collections (collection_id, discount_code_id);

create index discount_redemptions_code_status_idx
on public.discount_redemptions (discount_code_id, status, created_at);

alter table public.discount_codes enable row level security;
alter table public.discount_code_customers enable row level security;
alter table public.discount_code_products enable row level security;
alter table public.discount_code_categories enable row level security;
alter table public.discount_code_collections enable row level security;
alter table public.discount_redemptions enable row level security;

revoke all on table public.discount_codes from anon, authenticated;
revoke all on table public.discount_code_customers from anon, authenticated;
revoke all on table public.discount_code_products from anon, authenticated;
revoke all on table public.discount_code_categories from anon, authenticated;
revoke all on table public.discount_code_collections from anon, authenticated;
revoke all on table public.discount_redemptions from anon, authenticated;

grant select, insert, update, delete on table public.discount_codes to authenticated;
grant select, insert, update, delete on table public.discount_code_customers to authenticated;
grant select, insert, update, delete on table public.discount_code_products to authenticated;
grant select, insert, update, delete on table public.discount_code_categories to authenticated;
grant select, insert, update, delete on table public.discount_code_collections to authenticated;
grant select, insert, update, delete on table public.discount_redemptions to authenticated;

grant select, insert, update, delete on table public.discount_codes to service_role;
grant select, insert, update, delete on table public.discount_code_customers to service_role;
grant select, insert, update, delete on table public.discount_code_products to service_role;
grant select, insert, update, delete on table public.discount_code_categories to service_role;
grant select, insert, update, delete on table public.discount_code_collections to service_role;
grant select, insert, update, delete on table public.discount_redemptions to service_role;

create policy "discount codes are admin managed"
on public.discount_codes
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "discount customers are admin managed"
on public.discount_code_customers
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "discount products are admin managed"
on public.discount_code_products
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "discount categories are admin managed"
on public.discount_code_categories
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "discount collections are admin managed"
on public.discount_code_collections
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "discount redemptions are admin managed"
on public.discount_redemptions
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create or replace function public.get_checkout_discount_code(p_code text)
returns table (
  id uuid,
  code text,
  discount_type text,
  percentage_bps integer,
  amount_minor integer,
  currency_code text,
  market text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean,
  usage_limit integer,
  used_count integer,
  minimum_subtotal_minor integer,
  eligible_customer_ids uuid[],
  eligible_product_ids uuid[],
  eligible_category_ids uuid[],
  eligible_collection_ids uuid[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    dc.id,
    dc.code,
    dc.discount_type,
    dc.percentage_bps,
    dc.amount_minor,
    dc.currency_code,
    dc.market,
    dc.starts_at,
    dc.ends_at,
    dc.active,
    dc.usage_limit,
    dc.used_count,
    dc.minimum_subtotal_minor,
    coalesce(
      array_agg(distinct dcc.user_id) filter (where dcc.user_id is not null),
      '{}'::uuid[]
    ) as eligible_customer_ids,
    coalesce(
      array_agg(distinct dcp.product_id) filter (where dcp.product_id is not null),
      '{}'::uuid[]
    ) as eligible_product_ids,
    coalesce(
      array_agg(distinct dcat.category_id) filter (where dcat.category_id is not null),
      '{}'::uuid[]
    ) as eligible_category_ids,
    coalesce(
      array_agg(distinct dcol.collection_id) filter (where dcol.collection_id is not null),
      '{}'::uuid[]
    ) as eligible_collection_ids
  from public.discount_codes dc
  left join public.discount_code_customers dcc on dcc.discount_code_id = dc.id
  left join public.discount_code_products dcp on dcp.discount_code_id = dc.id
  left join public.discount_code_categories dcat on dcat.discount_code_id = dc.id
  left join public.discount_code_collections dcol on dcol.discount_code_id = dc.id
  where dc.code = upper(btrim(p_code))
  group by dc.id;
$$;

revoke all on function public.get_checkout_discount_code(text) from public, anon, authenticated;
grant execute on function public.get_checkout_discount_code(text) to anon, authenticated;

create or replace function public.get_checkout_product_discount_scopes(p_product_ids uuid[])
returns table (
  product_id uuid,
  category_ids uuid[],
  collection_ids uuid[]
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    product_ids.product_id,
    coalesce(
      array_agg(distinct pc.category_id) filter (where pc.category_id is not null),
      '{}'::uuid[]
    ) as category_ids,
    coalesce(
      array_agg(distinct cp.collection_id) filter (where cp.collection_id is not null),
      '{}'::uuid[]
    ) as collection_ids
  from unnest(coalesce(p_product_ids, '{}'::uuid[])) as product_ids(product_id)
  left join public.product_categories pc on pc.product_id = product_ids.product_id
  left join public.collection_products cp on cp.product_id = product_ids.product_id
  group by product_ids.product_id;
$$;

revoke all on function public.get_checkout_product_discount_scopes(uuid[]) from public, anon, authenticated;
grant execute on function public.get_checkout_product_discount_scopes(uuid[]) to anon, authenticated;
