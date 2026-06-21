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

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text check (title is null or char_length(btrim(title)) between 1 and 120),
  body text check (body is null or char_length(btrim(body)) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  version integer not null default 1 check (version > 0),
  approved_at timestamptz,
  hidden_at timestamptz,
  moderation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'approved' and approved_at is not null and hidden_at is null)
    or (status = 'hidden' and hidden_at is not null)
    or status in ('pending', 'rejected')
  )
);

create unique index product_reviews_one_per_customer_product_idx
on public.product_reviews (user_id, product_id);

create index product_reviews_product_status_idx
on public.product_reviews (product_id, status, approved_at desc);

alter table public.product_reviews enable row level security;

revoke all on table public.product_reviews from public, anon, authenticated;
grant select on table public.product_reviews to authenticated;
grant select, insert, update on table public.product_reviews to service_role;

create policy "product reviews are owner readable"
on public.product_reviews
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "product reviews are owner insertable"
on public.product_reviews
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "product reviews are owner updatable"
on public.product_reviews
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.can_review_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.checkout_order_lines col
      join public.checkout_orders co
        on co.id = col.order_id
      join public.payments p
        on p.order_id = co.id
      where co.owner_user_id = auth.uid()
        and col.product_id = p_product_id
        and co.paid_gate_status = 'open'
        and co.payment_status in ('paid', 'partially_refunded', 'refunded')
        and p.status in ('paid', 'partially_refunded', 'refunded')
    );
$$;

create or replace function public.submit_product_review(
  p_product_id uuid,
  p_rating integer,
  p_title text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if p_rating not between 1 and 5 then
    raise exception 'rating must be between one and five' using errcode = '23514';
  end if;

  if not public.can_review_product(p_product_id) then
    return jsonb_build_object('status', 'not_eligible');
  end if;

  insert into public.product_reviews (
    user_id,
    product_id,
    rating,
    title,
    body,
    status,
    version,
    approved_at,
    hidden_at,
    updated_at
  ) values (
    auth.uid(),
    p_product_id,
    p_rating,
    nullif(btrim(p_title), ''),
    nullif(btrim(p_body), ''),
    'pending',
    1,
    null,
    null,
    now()
  )
  on conflict (user_id, product_id)
  do update set
    rating = excluded.rating,
    title = excluded.title,
    body = excluded.body,
    status = 'pending',
    version = public.product_reviews.version + 1,
    approved_at = null,
    hidden_at = null,
    updated_at = now()
  returning id into saved_id;

  return jsonb_build_object('status', 'pending', 'review_id', saved_id);
end;
$$;

create or replace function public.mask_review_author(value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when value ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      then left(split_part(value, '@', 1), 1) || '***@' || split_part(value, '@', 2)
    else 'Customer'
  end;
$$;

create or replace view public.approved_product_reviews
with (security_invoker = false)
as
select
  pr.id,
  pr.product_id,
  pr.rating,
  pr.title,
  pr.body,
  public.mask_review_author(coalesce(u.email, '')) as masked_author,
  true as verified_purchase,
  pr.approved_at,
  pr.created_at,
  pr.updated_at
from public.product_reviews pr
join auth.users u
  on u.id = pr.user_id
where pr.status = 'approved'
  and pr.approved_at is not null;

revoke all on function public.can_review_product(uuid) from public, anon;
revoke all on function public.submit_product_review(uuid, integer, text, text) from public, anon;
revoke all on function public.mask_review_author(text) from public, anon;
revoke all on table public.approved_product_reviews from public;

grant execute on function public.can_review_product(uuid) to authenticated;
grant execute on function public.submit_product_review(uuid, integer, text, text) to authenticated;
grant execute on function public.mask_review_author(text) to authenticated, service_role;
grant select on table public.approved_product_reviews to anon, authenticated;

create table public.review_admin_replies (
  review_id uuid primary key references public.product_reviews(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.review_admin_replies enable row level security;

revoke all on table public.review_admin_replies from public, anon, authenticated;
grant select, insert, update, delete on table public.review_admin_replies to service_role;

create or replace function public.moderate_product_review(
  p_review_id uuid,
  p_expected_version integer,
  p_expected_status text,
  p_target_status text,
  p_moderation_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  saved_version integer;
  current_version integer;
begin
  if not private.is_admin() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if p_target_status not in ('approved', 'hidden')
    or p_expected_status not in ('pending', 'approved', 'rejected', 'hidden')
    or p_expected_version < 1
  then
    return jsonb_build_object('status', 'invalid');
  end if;

  update public.product_reviews
  set status = p_target_status,
      version = version + 1,
      approved_at = case when p_target_status = 'approved' then now() else null end,
      hidden_at = case when p_target_status = 'hidden' then now() else null end,
      moderation_note = nullif(left(btrim(p_moderation_note), 500), ''),
      updated_at = now()
  where id = p_review_id
    and version = p_expected_version
    and status = p_expected_status
  returning version into saved_version;

  if saved_version is null then
    select version into current_version
    from public.product_reviews
    where id = p_review_id;

    if current_version is null then
      return jsonb_build_object('status', 'not_found');
    end if;
    return jsonb_build_object('status', 'stale', 'version', current_version);
  end if;

  return jsonb_build_object('status', p_target_status, 'version', saved_version);
end;
$$;

create or replace function public.upsert_review_admin_reply(
  p_review_id uuid,
  p_expected_review_version integer,
  p_expected_review_status text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  current_review_version integer;
  saved_reply_version integer;
begin
  if not private.is_admin() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if p_expected_review_status <> 'approved'
    or p_expected_review_version < 1
    or char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000
  then
    return jsonb_build_object('status', 'invalid');
  end if;

  select version into current_review_version
  from public.product_reviews
  where id = p_review_id
    and version = p_expected_review_version
    and status = p_expected_review_status;

  if current_review_version is null then
    select version into current_review_version
    from public.product_reviews
    where id = p_review_id;
    return jsonb_build_object('status', 'stale', 'version', current_review_version);
  end if;

  insert into public.review_admin_replies (
    review_id,
    admin_user_id,
    body,
    version,
    updated_at
  ) values (
    p_review_id,
    auth.uid(),
    btrim(p_body),
    1,
    now()
  )
  on conflict (review_id)
  do update set
    admin_user_id = excluded.admin_user_id,
    body = excluded.body,
    version = public.review_admin_replies.version + 1,
    updated_at = now()
  returning version into saved_reply_version;

  return jsonb_build_object('status', 'saved', 'reply_version', saved_reply_version);
end;
$$;

create or replace function public.remove_review_admin_reply(
  p_review_id uuid,
  p_expected_review_version integer,
  p_expected_review_status text,
  p_expected_reply_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  current_review_version integer;
  current_reply_version integer;
  removed_id uuid;
begin
  if not private.is_admin() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select version into current_review_version
  from public.product_reviews
  where id = p_review_id
    and version = p_expected_review_version
    and status = p_expected_review_status;

  if current_review_version is null then
    select version into current_review_version
    from public.product_reviews
    where id = p_review_id;
    return jsonb_build_object('status', 'stale', 'version', current_review_version);
  end if;

  delete from public.review_admin_replies
  where review_id = p_review_id
    and version = p_expected_reply_version
  returning review_id into removed_id;

  if removed_id is null then
    select version into current_reply_version
    from public.review_admin_replies
    where review_id = p_review_id;
    return jsonb_build_object('status', 'stale', 'version', current_reply_version);
  end if;

  return jsonb_build_object('status', 'removed');
end;
$$;

create or replace function public.get_admin_product_reviews(p_status text default null)
returns table (
  review_id uuid,
  product_id uuid,
  product_title text,
  customer_email text,
  rating integer,
  review_title text,
  review_body text,
  review_status text,
  review_version integer,
  submitted_at timestamptz,
  updated_at timestamptz,
  reply_body text,
  reply_version integer,
  reply_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_admin() then
    return;
  end if;

  if p_status is not null and p_status not in ('pending', 'approved', 'rejected', 'hidden') then
    return;
  end if;

  return query
  select
    pr.id,
    pr.product_id,
    coalesce(pt.title, pr.product_id::text),
    coalesce(u.email, '')::text,
    pr.rating,
    pr.title,
    pr.body,
    pr.status,
    pr.version,
    pr.created_at,
    pr.updated_at,
    rar.body,
    rar.version,
    rar.updated_at
  from public.product_reviews pr
  join auth.users u on u.id = pr.user_id
  left join public.product_translations pt
    on pt.product_id = pr.product_id
   and pt.locale = 'en'
  left join public.review_admin_replies rar on rar.review_id = pr.id
  where p_status is null or pr.status = p_status
  order by
    case pr.status when 'pending' then 0 when 'approved' then 1 when 'hidden' then 2 else 3 end,
    pr.updated_at desc;
end;
$$;

create or replace view public.approved_product_reviews
with (security_invoker = false)
as
select
  pr.id,
  pr.product_id,
  pr.rating,
  pr.title,
  pr.body,
  public.mask_review_author(coalesce(u.email, '')) as masked_author,
  true as verified_purchase,
  pr.approved_at,
  pr.created_at,
  pr.updated_at,
  rar.body as shop_reply_body,
  rar.updated_at as shop_reply_updated_at
from public.product_reviews pr
join auth.users u
  on u.id = pr.user_id
left join public.review_admin_replies rar
  on rar.review_id = pr.id
where pr.status = 'approved'
  and pr.approved_at is not null;

revoke all on function public.moderate_product_review(uuid, integer, text, text, text) from public, anon;
revoke all on function public.upsert_review_admin_reply(uuid, integer, text, text) from public, anon;
revoke all on function public.remove_review_admin_reply(uuid, integer, text, integer) from public, anon;
revoke all on function public.get_admin_product_reviews(text) from public, anon;

grant execute on function public.moderate_product_review(uuid, integer, text, text, text) to authenticated;
grant execute on function public.upsert_review_admin_reply(uuid, integer, text, text) to authenticated;
grant execute on function public.remove_review_admin_reply(uuid, integer, text, integer) to authenticated;
grant execute on function public.get_admin_product_reviews(text) to authenticated;
