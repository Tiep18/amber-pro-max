create table public.checkout_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('ATB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  owner_user_id uuid references auth.users(id) on delete set null,
  guest_secret_hash text,
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  locale text not null check (locale in ('vi', 'en')),
  market text not null check (market in ('vn', 'intl')),
  currency_code text not null check (currency_code in ('VND', 'USD')),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'cancelled')),
  payment_intent text not null check (payment_intent in ('paypal_intent', 'vietqr_intent')),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  accepted_quote_hash text not null check (length(btrim(accepted_quote_hash)) > 0),
  quote_snapshot jsonb not null check (jsonb_typeof(quote_snapshot) = 'object'),
  cart_snapshot jsonb not null check (jsonb_typeof(cart_snapshot) = 'array'),
  idempotency_actor text not null check (length(btrim(idempotency_actor)) > 0),
  idempotency_key text not null check (length(btrim(idempotency_key)) >= 8),
  reservation_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_user_id is not null or guest_secret_hash is not null)
);

create table public.checkout_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  line_id text not null,
  product_title text not null,
  variant_label text,
  sku text,
  fulfillment_type text not null check (fulfillment_type in ('digital', 'physical')),
  market text not null check (market in ('vn', 'intl')),
  currency_code text not null check (currency_code in ('VND', 'USD')),
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  line_subtotal_minor bigint not null check (line_subtotal_minor >= 0),
  discount_allocation_minor bigint not null default 0 check (discount_allocation_minor >= 0),
  shipping_allocation_minor bigint not null default 0 check (shipping_allocation_minor >= 0),
  quote_line_snapshot jsonb not null check (jsonb_typeof(quote_line_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (order_id, line_id)
);

create table public.checkout_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.checkout_orders(id) on delete cascade,
  order_line_id uuid not null references public.checkout_order_lines(id) on delete cascade,
  inventory_record_id uuid not null references public.inventory_records(id) on delete restrict,
  quantity_reserved integer not null check (quantity_reserved > 0),
  status text not null default 'active' check (status in ('active', 'released', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  check (
    (status = 'active' and released_at is null)
    or (status in ('released', 'expired') and released_at is not null)
  )
);

create unique index checkout_orders_idempotency_unique_idx
on public.checkout_orders (idempotency_actor, idempotency_key);

create index checkout_orders_pending_deadline_idx
on public.checkout_orders (status, reservation_expires_at)
where status = 'pending_payment';

create index checkout_order_lines_order_idx
on public.checkout_order_lines (order_id);

create index checkout_inventory_reservations_active_idx
on public.checkout_inventory_reservations (inventory_record_id, expires_at)
where status = 'active';

create or replace function public.checkout_reservation_expires_at(p_payment_intent text, p_now timestamptz default now())
returns timestamptz
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if p_payment_intent = 'paypal_intent' then
    return p_now + interval '15 minutes';
  end if;

  if p_payment_intent = 'vietqr_intent' then
    return p_now + interval '24 hours';
  end if;

  raise exception 'unsupported payment intent' using errcode = '23514';
end;
$$;

create or replace function public.checkout_available_inventory(p_inventory_record_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select greatest(
    0,
    coalesce(ir.quantity_on_hand, 0) -
    coalesce((
      select sum(cir.quantity_reserved)::integer
      from public.checkout_inventory_reservations cir
      where cir.inventory_record_id = p_inventory_record_id
        and cir.status = 'active'
        and cir.expires_at > now()
    ), 0)
  )
  from public.inventory_records ir
  where ir.id = p_inventory_record_id
  union all
  select 0
  where not exists (select 1 from public.inventory_records where id = p_inventory_record_id)
  limit 1;
$$;

create or replace function private.prevent_checkout_line_snapshot_update()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  if old.product_id is distinct from new.product_id
    or old.variant_id is distinct from new.variant_id
    or old.product_title is distinct from new.product_title
    or old.variant_label is distinct from new.variant_label
    or old.sku is distinct from new.sku
    or old.fulfillment_type is distinct from new.fulfillment_type
    or old.market is distinct from new.market
    or old.currency_code is distinct from new.currency_code
    or old.quantity is distinct from new.quantity
    or old.unit_price_minor is distinct from new.unit_price_minor
    or old.line_subtotal_minor is distinct from new.line_subtotal_minor
    or old.discount_allocation_minor is distinct from new.discount_allocation_minor
    or old.shipping_allocation_minor is distinct from new.shipping_allocation_minor
    or old.quote_line_snapshot is distinct from new.quote_line_snapshot then
    raise exception 'checkout line commercial snapshots are immutable'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger checkout_order_lines_immutable_snapshots
before update on public.checkout_order_lines
for each row execute function private.prevent_checkout_line_snapshot_update();

create or replace function public.submit_checkout(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid := auth.uid();
  actor text;
  existing_order public.checkout_orders%rowtype;
  order_row public.checkout_orders%rowtype;
  line_item jsonb;
  created_line_id uuid;
  inventory_id uuid;
  available_units integer;
  reservation_deadline timestamptz;
  guest_token text := encode(extensions.gen_random_bytes(32), 'hex');
  guest_hash text;
  payment_intent text := p_payload->>'paymentIntent';
  quote jsonb := p_payload->'acceptedQuote';
  lines jsonb := coalesce(p_payload->'lines', '[]'::jsonb);
  contact_email text := lower(btrim(coalesce(p_payload->>'contactEmail', '')));
  idem_key text := coalesce(p_payload->>'idempotencyKey', '');
  accepted_hash text := coalesce(p_payload->>'acceptedQuoteHash', '');
begin
  if jsonb_typeof(p_payload) <> 'object'
    or length(idem_key) < 8
    or length(accepted_hash) = 0
    or contact_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or payment_intent not in ('paypal_intent', 'vietqr_intent')
    or jsonb_typeof(quote) <> 'object'
    or coalesce(quote->>'status', '') <> 'ready'
    or jsonb_typeof(lines) <> 'array'
    or jsonb_array_length(lines) = 0 then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_checkout_submit');
  end if;

  if coalesce(quote->>'hash', '') <> accepted_hash then
    return jsonb_build_object('status', 'stale', 'code', 'stale_quote');
  end if;

  if quote->'shipping'->>'status' = 'not_calculated'
    or quote->'shipping'->>'status' = 'unsupported_destination' then
    return jsonb_build_object('status', 'stale', 'code', 'shipping_required');
  end if;

  actor := coalesce(actor_user_id::text, 'guest:' || encode(extensions.digest(coalesce(p_payload->>'guestCartId', idem_key), 'sha256'), 'hex'));

  select *
  into existing_order
  from public.checkout_orders
  where idempotency_actor = actor
    and idempotency_key = idem_key;

  if found then
    return jsonb_build_object(
      'status', 'success',
      'orderId', existing_order.id,
      'orderNumber', existing_order.order_number,
      'reservationExpiresAt', existing_order.reservation_expires_at,
      'guestAccessToken', case when existing_order.owner_user_id is null then null else null end
    );
  end if;

  reservation_deadline := public.checkout_reservation_expires_at(payment_intent, now());
  guest_hash := case when actor_user_id is null then encode(extensions.digest(guest_token, 'sha256'), 'hex') else null end;

  insert into public.checkout_orders (
    owner_user_id,
    guest_secret_hash,
    contact_email,
    locale,
    market,
    currency_code,
    payment_intent,
    subtotal_minor,
    discount_minor,
    shipping_minor,
    total_minor,
    accepted_quote_hash,
    quote_snapshot,
    cart_snapshot,
    idempotency_actor,
    idempotency_key,
    reservation_expires_at
  )
  values (
    actor_user_id,
    guest_hash,
    contact_email,
    coalesce(p_payload->>'locale', quote->>'locale'),
    quote->>'market',
    quote->>'currencyCode',
    payment_intent,
    (quote->>'subtotalMinor')::bigint,
    coalesce((quote->'discount'->>'amountMinor')::bigint, 0),
    case when quote->'shipping'->>'status' = 'ready' then coalesce((quote->'shipping'->>'amountMinor')::bigint, 0) else 0 end,
    (quote->>'totalMinor')::bigint,
    accepted_hash,
    quote,
    lines,
    actor,
    idem_key,
    reservation_deadline
  )
  returning * into order_row;

  for line_item in select * from jsonb_array_elements(quote->'lines')
  loop
    if coalesce(line_item->>'status', '') not in ('ready', 'quantity_capped') then
      continue;
    end if;

    insert into public.checkout_order_lines (
      order_id,
      product_id,
      variant_id,
      line_id,
      product_title,
      variant_label,
      sku,
      fulfillment_type,
      market,
      currency_code,
      quantity,
      unit_price_minor,
      line_subtotal_minor,
      discount_allocation_minor,
      shipping_allocation_minor,
      quote_line_snapshot
    )
    values (
      order_row.id,
      (line_item->>'productId')::uuid,
      nullif(line_item->>'variantId', '')::uuid,
      line_item->>'lineId',
      line_item->>'title',
      nullif(line_item->>'variantLabel', ''),
      null,
      line_item->>'fulfillmentType',
      quote->>'market',
      line_item->>'currencyCode',
      (line_item->>'quantity')::integer,
      (line_item->>'unitPriceMinor')::bigint,
      (line_item->>'lineSubtotalMinor')::bigint,
      coalesce((line_item->>'discountAllocationMinor')::bigint, 0),
      case
        when quote->'shipping'->>'status' = 'ready'
          and line_item->>'lineId' = quote->'shipping'->>'firstItemLineId'
        then coalesce((quote->'shipping'->>'amountMinor')::bigint, 0)
        else 0
      end,
      line_item
    )
    returning id into created_line_id;

    if line_item->>'fulfillmentType' = 'physical' then
      select ir.id
      into inventory_id
      from public.inventory_records ir
      where (
        (line_item->>'variantId' is not null and ir.variant_id = (line_item->>'variantId')::uuid)
        or
        ((line_item->>'variantId' is null or line_item->>'variantId' = '') and ir.product_id = (line_item->>'productId')::uuid)
      )
      order by ir.id
      for update;

      if inventory_id is null then
        raise exception 'inventory missing' using errcode = 'P0001';
      end if;

      available_units := public.checkout_available_inventory(inventory_id);
      if available_units < (line_item->>'quantity')::integer then
        raise exception 'inventory unavailable' using errcode = 'P0001';
      end if;

      insert into public.checkout_inventory_reservations (
        order_id,
        order_line_id,
        inventory_record_id,
        quantity_reserved,
        expires_at
      )
      values (
        order_row.id,
        created_line_id,
        inventory_id,
        (line_item->>'quantity')::integer,
        reservation_deadline
      );
    end if;
  end loop;

  return jsonb_build_object(
    'status', 'success',
    'orderId', order_row.id,
    'orderNumber', order_row.order_number,
    'reservationExpiresAt', order_row.reservation_expires_at,
    'guestAccessToken', guest_token
  );
exception
  when unique_violation then
    select *
    into existing_order
    from public.checkout_orders
    where idempotency_actor = actor
      and idempotency_key = idem_key;

    if found then
      return jsonb_build_object(
        'status', 'success',
        'orderId', existing_order.id,
        'orderNumber', existing_order.order_number,
        'reservationExpiresAt', existing_order.reservation_expires_at,
        'guestAccessToken', null
      );
    end if;
    return jsonb_build_object('status', 'conflict', 'code', 'duplicate_submit');
  when serialization_failure or deadlock_detected then
    return jsonb_build_object('status', 'retryable', 'code', 'retryable_checkout_conflict');
  when others then
    return jsonb_build_object('status', 'conflict', 'code', 'checkout_unavailable');
end;
$$;

alter table public.checkout_orders enable row level security;
alter table public.checkout_order_lines enable row level security;
alter table public.checkout_inventory_reservations enable row level security;

revoke all on table public.checkout_orders from public, anon, authenticated;
revoke all on table public.checkout_order_lines from public, anon, authenticated;
revoke all on table public.checkout_inventory_reservations from public, anon, authenticated;

grant select on table public.checkout_orders to authenticated;
grant select on table public.checkout_order_lines to authenticated;
grant select, insert, update, delete on table public.checkout_orders to service_role;
grant select, insert, update, delete on table public.checkout_order_lines to service_role;
grant select, insert, update, delete on table public.checkout_inventory_reservations to service_role;

create policy "checkout orders are owner readable"
on public.checkout_orders
for select to authenticated
using (owner_user_id = (select auth.uid()));

create policy "checkout orders are admin managed"
on public.checkout_orders
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "checkout order lines are owner readable"
on public.checkout_order_lines
for select to authenticated
using (
  exists (
    select 1
    from public.checkout_orders co
    where co.id = checkout_order_lines.order_id
      and co.owner_user_id = (select auth.uid())
  )
);

create policy "checkout order lines are admin managed"
on public.checkout_order_lines
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "checkout reservations are admin managed"
on public.checkout_inventory_reservations
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on function public.checkout_reservation_expires_at(text, timestamptz) from public, anon, authenticated;
revoke all on function public.checkout_available_inventory(uuid) from public, anon, authenticated;
revoke all on function private.prevent_checkout_line_snapshot_update() from public, anon, authenticated;
revoke all on function public.submit_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.submit_checkout(jsonb) to anon, authenticated;
