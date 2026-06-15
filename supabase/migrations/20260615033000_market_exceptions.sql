create table public.market_exception_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_note text not null default '',
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  market text not null check (market in ('vn', 'intl')),
  destination_country_code text not null check (destination_country_code ~ '^[A-Z]{2}$'),
  locale text not null check (locale in ('vi', 'en')),
  admin_note text,
  rejection_reason text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending' and decided_at is null)
    or (status in ('approved', 'rejected') and decided_at is not null)
  )
);

create table public.market_exception_grants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.market_exception_requests(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  market text not null check (market in ('vn', 'intl')),
  destination_country_code text not null check (destination_country_code ~ '^[A-Z]{2}$'),
  shipping_fee_minor bigint not null check (shipping_fee_minor >= 0),
  currency_code text not null check (currency_code in ('VND', 'USD')),
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'revoked')),
  expires_at timestamptz not null,
  consumed_order_id uuid references public.checkout_orders(id) on delete set null,
  consumed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (status = 'active' and consumed_at is null)
    or (status = 'used' and consumed_at is not null and consumed_order_id is not null)
    or status in ('expired', 'revoked')
  )
);

create index market_exception_requests_admin_idx
on public.market_exception_requests (status, created_at desc);

create index market_exception_grants_token_idx
on public.market_exception_grants (token_hash, status, expires_at);

create or replace function public.create_market_exception_request(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_id uuid;
  target_product_type text;
begin
  if jsonb_typeof(p_payload) <> 'object'
    or coalesce(p_payload->>'contactEmail', '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or coalesce(p_payload->>'destinationCountryCode', '') !~ '^[A-Z]{2}$'
    or coalesce(p_payload->>'market', '') not in ('vn', 'intl')
    or coalesce(p_payload->>'locale', '') not in ('vi', 'en')
    or coalesce(p_payload->>'productId', '') = '' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_exception_request');
  end if;

  select product_type
  into target_product_type
  from public.products
  where id = (p_payload->>'productId')::uuid;

  if target_product_type is distinct from 'physical_finished' then
    return jsonb_build_object('status', 'invalid', 'code', 'physical_only');
  end if;

  insert into public.market_exception_requests (
    contact_email,
    customer_note,
    product_id,
    variant_id,
    market,
    destination_country_code,
    locale
  )
  values (
    lower(btrim(p_payload->>'contactEmail')),
    left(coalesce(p_payload->>'customerNote', ''), 1000),
    (p_payload->>'productId')::uuid,
    nullif(p_payload->>'variantId', '')::uuid,
    p_payload->>'market',
    upper(p_payload->>'destinationCountryCode'),
    p_payload->>'locale'
  )
  returning id into request_id;

  return jsonb_build_object('status', 'created', 'requestId', request_id);
exception
  when others then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_exception_request');
end;
$$;

create or replace function public.validate_market_exception_grant(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  grant_row public.market_exception_grants%rowtype;
begin
  select *
  into grant_row
  from public.market_exception_grants
  where token_hash = p_token_hash
    and status = 'active'
    and expires_at > now();

  if not found then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_or_expired');
  end if;

  return jsonb_build_object(
    'status', 'valid',
    'grantId', grant_row.id,
    'expiresAt', grant_row.expires_at,
    'productId', grant_row.product_id,
    'variantId', grant_row.variant_id,
    'market', grant_row.market,
    'destinationCountryCode', grant_row.destination_country_code,
    'shippingFeeMinor', grant_row.shipping_fee_minor,
    'currencyCode', grant_row.currency_code
  );
end;
$$;

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
  exception_token text := nullif(btrim(coalesce(p_payload->>'exceptionGrantToken', '')), '');
  exception_token_hash text;
  exception_grant public.market_exception_grants%rowtype;
  exception_line_matches boolean := false;
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

  if exception_token is not null then
    exception_token_hash := encode(extensions.digest(exception_token, 'sha256'), 'hex');

    select *
    into exception_grant
    from public.market_exception_grants
    where token_hash = exception_token_hash
      and status = 'active'
      and expires_at > now()
    for update;

    if not found then
      return jsonb_build_object('status', 'invalid', 'code', 'invalid_or_expired_exception_grant');
    end if;

    select exists (
      select 1
      from jsonb_array_elements(quote->'lines') as quoted(line)
      where quoted.line->>'fulfillmentType' = 'physical'
        and quoted.line->>'status' in ('ready', 'quantity_capped')
        and (quoted.line->>'productId')::uuid = exception_grant.product_id
        and nullif(quoted.line->>'variantId', '')::uuid is not distinct from exception_grant.variant_id
    )
    into exception_line_matches;

    if not exception_line_matches
      or quote->>'market' <> exception_grant.market
      or quote->>'currencyCode' <> exception_grant.currency_code
      or coalesce(quote->'shipping'->>'countryCode', '') <> exception_grant.destination_country_code
      or quote->'shipping'->>'status' <> 'ready'
      or coalesce((quote->'shipping'->>'amountMinor')::bigint, -1) <> exception_grant.shipping_fee_minor then
      return jsonb_build_object('status', 'invalid', 'code', 'exception_grant_scope_mismatch');
    end if;
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

  if exception_token is not null then
    update public.market_exception_grants
    set status = 'used',
      consumed_order_id = order_row.id,
      consumed_at = now()
    where id = exception_grant.id
      and status = 'active';

    if not found then
      raise exception 'exception grant already consumed' using errcode = '40001';
    end if;
  end if;

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

alter table public.market_exception_requests enable row level security;
alter table public.market_exception_grants enable row level security;

revoke all on table public.market_exception_requests from public, anon, authenticated;
revoke all on table public.market_exception_grants from public, anon, authenticated;

grant select, insert, update on table public.market_exception_requests to authenticated;
grant select, insert, update on table public.market_exception_grants to authenticated;
grant select, insert, update, delete on table public.market_exception_requests to service_role;
grant select, insert, update, delete on table public.market_exception_grants to service_role;

create policy "market exception requests are admin managed"
on public.market_exception_requests
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "market exception grants are admin managed"
on public.market_exception_grants
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on function public.create_market_exception_request(jsonb) from public, anon, authenticated;
revoke all on function public.validate_market_exception_grant(text) from public, anon, authenticated;
grant execute on function public.create_market_exception_request(jsonb) to anon, authenticated;
grant execute on function public.validate_market_exception_grant(text) to anon, authenticated;
