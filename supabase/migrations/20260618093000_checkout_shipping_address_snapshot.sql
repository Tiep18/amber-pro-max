alter table public.checkout_orders
  add column if not exists shipping_address jsonb;

alter table public.checkout_orders
  drop constraint if exists checkout_orders_shipping_address_shape_check;

alter table public.checkout_orders
  add constraint checkout_orders_shipping_address_shape_check
  check (
    shipping_address is null
    or (
      jsonb_typeof(shipping_address) = 'object'
      and coalesce(shipping_address->>'recipientName', '') <> ''
      and coalesce(shipping_address->>'phoneNumber', '') <> ''
      and coalesce(shipping_address->>'addressLine1', '') <> ''
      and coalesce(shipping_address->>'countryCode', '') ~ '^[A-Z]{2}$'
    )
  );

create or replace function private.prevent_checkout_order_shipping_address_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.shipping_address is distinct from new.shipping_address then
    raise exception 'checkout order shipping address is immutable' using errcode = '23000';
  end if;

  return new;
end;
$$;

drop trigger if exists checkout_orders_immutable_shipping_address on public.checkout_orders;

create trigger checkout_orders_immutable_shipping_address
before update on public.checkout_orders
for each row
execute function private.prevent_checkout_order_shipping_address_update();

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
  shipping_address jsonb := p_payload->'shippingAddress';
  has_physical_lines boolean := false;
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

  select exists (
    select 1
    from jsonb_array_elements(quote->'lines') as quoted(line)
    where quoted.line->>'fulfillmentType' = 'physical'
      and coalesce((quoted.line->>'quantity')::integer, 0) > 0
      and quoted.line->>'status' in ('ready', 'quantity_capped')
  )
  into has_physical_lines;

  if has_physical_lines then
    if jsonb_typeof(shipping_address) <> 'object'
      or coalesce(shipping_address->>'recipientName', '') = ''
      or coalesce(shipping_address->>'phoneNumber', '') = ''
      or coalesce(shipping_address->>'addressLine1', '') = ''
      or coalesce(shipping_address->>'countryCode', '') !~ '^[A-Z]{2}$'
      or coalesce(shipping_address->>'countryCode', '') <> coalesce(quote->'shipping'->>'countryCode', '') then
      return jsonb_build_object('status', 'invalid', 'code', 'shipping_address_required');
    end if;
  else
    shipping_address := null;
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
    shipping_address,
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
    shipping_address,
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
      coalesce((line_item->>'lineSubtotalMinor')::bigint, 0),
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

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'order_payment_statuses'
      and column_name = 'payment_intent'
  ) then
    execute $view$
      create or replace view public.order_payment_statuses
      with (security_invoker = true)
      as
      select
        co.id as order_id,
        co.order_number,
        co.owner_user_id,
        co.guest_secret_hash,
        co.contact_email,
        co.locale,
        co.market,
        co.payment_intent,
        co.currency_code,
        co.total_minor,
        co.reservation_expires_at,
        p.id as payment_id,
        p.provider,
        effective.status as payment_status,
        private.payment_customer_status(effective.status) as customer_payment_status,
        case
          when effective.status in ('paid', 'partially_refunded', 'refunded') then 'eligible'
          when effective.status = 'review_required' then 'review_required'
          else 'locked'
        end as fulfillment_gate_status,
        p.digital_fulfillment_status,
        p.physical_fulfillment_status,
        p.refund_status,
        p.refunded_amount_minor,
        coalesce(p.review_reason, co.review_reason) as review_reason,
        p.created_at,
        p.updated_at,
        co.shipping_address
      from public.checkout_orders co
      join public.payments p on p.order_id = co.id
      cross join lateral (
        select private.payment_effective_status(p.status, co.paid_gate_status, coalesce(p.review_reason, co.review_reason)) as status
      ) effective
    $view$;
  else
    execute $view$
      create or replace view public.order_payment_statuses
      with (security_invoker = true)
      as
      select
        co.id as order_id,
        co.order_number,
        co.owner_user_id,
        co.guest_secret_hash,
        co.contact_email,
        co.locale,
        co.market,
        co.currency_code,
        co.total_minor,
        co.reservation_expires_at,
        p.id as payment_id,
        p.provider,
        effective.status as payment_status,
        private.payment_customer_status(effective.status) as customer_payment_status,
        case
          when effective.status in ('paid', 'partially_refunded', 'refunded') then 'eligible'
          when effective.status = 'review_required' then 'review_required'
          else 'locked'
        end as fulfillment_gate_status,
        p.digital_fulfillment_status,
        p.physical_fulfillment_status,
        p.refund_status,
        p.refunded_amount_minor,
        coalesce(p.review_reason, co.review_reason) as review_reason,
        p.created_at,
        p.updated_at,
        co.payment_intent,
        co.shipping_address
      from public.checkout_orders co
      join public.payments p on p.order_id = co.id
      cross join lateral (
        select private.payment_effective_status(p.status, co.paid_gate_status, coalesce(p.review_reason, co.review_reason)) as status
      ) effective
    $view$;
  end if;
end;
$$;

create or replace function public.get_order_payment_status(p_order_number text, p_guest_secret_hash text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  row_data public.order_payment_statuses%rowtype;
begin
  select *
  into row_data
  from public.order_payment_statuses ops
  where ops.order_number = p_order_number
    and (
      (auth.uid() is not null and ops.owner_user_id = auth.uid())
      or (
        p_guest_secret_hash is not null
        and ops.guest_secret_hash = p_guest_secret_hash
      )
      or private.is_admin()
    );

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object(
    'status', 'found',
    'orderNumber', row_data.order_number,
    'market', row_data.market,
    'paymentIntent', row_data.payment_intent,
    'provider', row_data.provider,
    'paymentStatus', row_data.payment_status,
    'customerPaymentStatus', row_data.customer_payment_status,
    'fulfillmentGateStatus', row_data.fulfillment_gate_status,
    'amountMinor', row_data.total_minor,
    'currencyCode', row_data.currency_code,
    'reservationExpiresAt', row_data.reservation_expires_at,
    'shippingAddress', row_data.shipping_address
  );
end;
$$;

revoke all on function private.prevent_checkout_order_shipping_address_update() from public, anon, authenticated;
