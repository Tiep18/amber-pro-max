-- Checkout submission hardening: accepted quotes remain UX evidence, while
-- catalog, discount, shipping and arithmetic facts are verified in Postgres.

create or replace function private.checkout_commercial_quote_is_current(
  p_payload jsonb,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quote jsonb := p_payload -> 'acceptedQuote';
  quote_line jsonb;
  intent_line jsonb;
  offer_price bigint;
  offer_currency text;
  product_kind text;
  available_quantity integer;
  expected_quantity integer;
  expected_status text;
  expected_subtotal bigint := 0;
  expected_discount bigint := 0;
  expected_shipping bigint := 0;
  discount_code text := nullif(upper(btrim(coalesce(p_payload ->> 'discountCode', ''))), '');
  discount_rule public.discount_codes%rowtype;
  eligible_subtotal bigint := 0;
  remaining_discount bigint := 0;
  expected_line_discount bigint;
  eligible boolean;
  line_count integer;
begin
  if jsonb_typeof(quote) <> 'object'
    or jsonb_typeof(quote -> 'lines') <> 'array'
    or jsonb_typeof(p_payload -> 'lines') <> 'array'
    or quote ->> 'market' is distinct from p_payload ->> 'market'
    or quote ->> 'currencyCode' not in ('USD', 'VND')
    or not (
      (quote ->> 'market' = 'intl' and quote ->> 'currencyCode' = 'USD'
        and p_payload ->> 'paymentIntent' = 'paypal_intent')
      or (quote ->> 'market' = 'vn' and quote ->> 'currencyCode' = 'VND'
        and p_payload ->> 'paymentIntent' = 'vietqr_intent')
    ) then
    return false;
  end if;

  select count(*) into line_count from jsonb_array_elements(quote -> 'lines');
  if line_count <> jsonb_array_length(p_payload -> 'lines') or line_count = 0 then
    return false;
  end if;

  for quote_line in select value from jsonb_array_elements(quote -> 'lines')
  loop
    if coalesce(quote_line ->> 'productId', '') !~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or coalesce(quote_line ->> 'quantity', '') !~ '^[0-9]+$'
      or coalesce(quote_line ->> 'requestedQuantity', '') !~ '^[0-9]+$'
      or coalesce(quote_line ->> 'unitPriceMinor', '') !~ '^[0-9]+$'
      or coalesce(quote_line ->> 'lineSubtotalMinor', '') !~ '^[0-9]+$'
      or coalesce(quote_line ->> 'discountAllocationMinor', '') !~ '^[0-9]+$' then
      return false;
    end if;

    select value into intent_line
    from jsonb_array_elements(p_payload -> 'lines')
    where value ->> 'productId' = quote_line ->> 'productId'
      and nullif(value ->> 'variantId', '') is not distinct from nullif(quote_line ->> 'variantId', '')
    limit 1;

    if intent_line is null
      or (intent_line ->> 'quantity')::integer <> (quote_line ->> 'requestedQuantity')::integer
      or intent_line ->> 'marketAtAdd' is distinct from quote_line ->> 'marketAtAdd'
      or quote_line ->> 'lineId' is distinct from
        ((quote_line ->> 'productId') || '::' || coalesce(nullif(quote_line ->> 'variantId', ''), 'product')) then
      return false;
    end if;

    select
      p.product_type,
      coalesce(vmo.price_minor, pmo.price_minor),
      coalesce(vmo.currency_code, pmo.currency_code),
      case
        when p.product_type = 'pdf_pattern' then null
        else public.checkout_available_inventory(ir.id)
      end
    into product_kind, offer_price, offer_currency, available_quantity
    from public.products p
    join public.product_market_offers pmo
      on pmo.product_id = p.id
     and pmo.market_code = quote ->> 'market'
     and pmo.enabled
    left join public.product_variants pv
      on pv.id = nullif(quote_line ->> 'variantId', '')::uuid
     and pv.product_id = p.id
    left join public.variant_market_offers vmo
      on vmo.variant_id = pv.id
     and vmo.market_code = quote ->> 'market'
     and vmo.enabled
    left join public.inventory_records ir
      on (pv.id is not null and ir.variant_id = pv.id)
      or (pv.id is null and ir.product_id = p.id)
    where p.id = (quote_line ->> 'productId')::uuid
      and p.status = 'published'
      and ((quote_line ->> 'variantId') is null or vmo.id is not null);

    if not found or offer_price is null or offer_currency is distinct from quote ->> 'currencyCode' then
      return false;
    end if;

    if product_kind = 'physical_finished' and available_quantity is null then
      return false;
    end if;
    expected_quantity := case
      when product_kind = 'physical_finished'
        then least((intent_line ->> 'quantity')::integer, available_quantity)
      else (intent_line ->> 'quantity')::integer
    end;
    expected_status := case
      when expected_quantity < (intent_line ->> 'quantity')::integer then 'quantity_capped'
      else 'ready'
    end;

    if expected_quantity <= 0
      or quote_line ->> 'status' is distinct from expected_status
      or (quote_line ->> 'fulfillmentType') is distinct from
        case when product_kind = 'pdf_pattern' then 'digital' else 'physical' end
      or (quote_line ->> 'quantity')::integer <> expected_quantity
      or (quote_line ->> 'unitPriceMinor')::bigint <> offer_price
      or (quote_line ->> 'lineSubtotalMinor')::bigint <> offer_price * expected_quantity
      or quote_line ->> 'currencyCode' is distinct from offer_currency then
      return false;
    end if;
    expected_subtotal := expected_subtotal + (offer_price * expected_quantity);
  end loop;

  if discount_code is not null then
    select * into discount_rule
    from public.discount_codes
    where code = discount_code
    for update;

    if found
      and discount_rule.active
      and (discount_rule.starts_at is null or discount_rule.starts_at <= now())
      and (discount_rule.ends_at is null or discount_rule.ends_at >= now())
      and (discount_rule.usage_limit is null or discount_rule.used_count < discount_rule.usage_limit)
      and (discount_rule.market is null or discount_rule.market = quote ->> 'market')
      and (discount_rule.discount_type <> 'fixed' or discount_rule.currency_code = quote ->> 'currencyCode')
      and expected_subtotal >= discount_rule.minimum_subtotal_minor
      and (
        not exists (select 1 from public.discount_code_customers where discount_code_id = discount_rule.id)
        or exists (
          select 1 from public.discount_code_customers
          where discount_code_id = discount_rule.id and user_id = p_actor_user_id
        )
      ) then
      for quote_line in select value from jsonb_array_elements(quote -> 'lines')
      loop
        eligible := not exists (
          select 1 from public.discount_code_products where discount_code_id = discount_rule.id
          union all select 1 from public.discount_code_categories where discount_code_id = discount_rule.id
          union all select 1 from public.discount_code_collections where discount_code_id = discount_rule.id
        ) or exists (
          select 1 from public.discount_code_products
          where discount_code_id = discount_rule.id
            and product_id = (quote_line ->> 'productId')::uuid
          union all
          select 1 from public.discount_code_categories dcc
          join public.product_categories pc on pc.category_id = dcc.category_id
          where dcc.discount_code_id = discount_rule.id
            and pc.product_id = (quote_line ->> 'productId')::uuid
          union all
          select 1 from public.discount_code_collections dcc
          join public.collection_products cp on cp.collection_id = dcc.collection_id
          where dcc.discount_code_id = discount_rule.id
            and cp.product_id = (quote_line ->> 'productId')::uuid
        );
        if eligible then
          eligible_subtotal := eligible_subtotal + (quote_line ->> 'lineSubtotalMinor')::bigint;
        end if;
      end loop;

      if eligible_subtotal > 0 then
        expected_discount := case
          when discount_rule.discount_type = 'percentage'
            then (eligible_subtotal * discount_rule.percentage_bps) / 10000
          else least(discount_rule.amount_minor::bigint, eligible_subtotal)
        end;
      end if;
    end if;
  end if;

  -- Match the exact proportional floor + largest-remainder allocation used by
  -- the TypeScript quote path. This also verifies every line allocation.
  remaining_discount := expected_discount;
  for quote_line in
    with candidates as (
      select
        value,
        (value ->> 'lineSubtotalMinor')::bigint as line_subtotal,
        not exists (
          select 1 from public.discount_code_products where discount_code_id = discount_rule.id
          union all select 1 from public.discount_code_categories where discount_code_id = discount_rule.id
          union all select 1 from public.discount_code_collections where discount_code_id = discount_rule.id
        ) or exists (
          select 1 from public.discount_code_products
          where discount_code_id = discount_rule.id and product_id = (value ->> 'productId')::uuid
          union all
          select 1 from public.discount_code_categories dcc join public.product_categories pc using (category_id)
          where dcc.discount_code_id = discount_rule.id and pc.product_id = (value ->> 'productId')::uuid
          union all
          select 1 from public.discount_code_collections dcc join public.collection_products cp using (collection_id)
          where dcc.discount_code_id = discount_rule.id and cp.product_id = (value ->> 'productId')::uuid
        ) as eligible
      from jsonb_array_elements(quote -> 'lines')
    ), ranked as (
      select *,
        case when expected_discount > 0 and eligible then (expected_discount * line_subtotal) / eligible_subtotal else 0 end as base,
        row_number() over (order by
          case when expected_discount > 0 and eligible then mod(expected_discount * line_subtotal, eligible_subtotal) else -1 end desc,
          value ->> 'lineId') as remainder_rank
      from candidates
    ), totals as (
      select coalesce(sum(base), 0) as base_total from ranked
    )
    select value || jsonb_build_object(
      '_expectedDiscount', base + case
        when eligible and remainder_rank <= expected_discount - totals.base_total then 1 else 0 end
    )
    from ranked cross join totals
  loop
    expected_line_discount := (quote_line ->> '_expectedDiscount')::bigint;
    if (quote_line ->> 'discountAllocationMinor')::bigint <> expected_line_discount then
      return false;
    end if;
  end loop;

  expected_shipping := case
    when quote -> 'shipping' ->> 'status' = 'ready'
      then coalesce((quote -> 'shipping' ->> 'amountMinor')::bigint, 0)
    when quote -> 'shipping' ->> 'status' = 'no_shipping_required' then 0
    else -1
  end;

  return expected_shipping >= 0
    and (quote ->> 'subtotalMinor')::bigint = expected_subtotal
    and coalesce((quote -> 'discount' ->> 'amountMinor')::bigint, 0) = expected_discount
    and (quote ->> 'totalMinor')::bigint = expected_subtotal - expected_discount + expected_shipping;
exception when others then
  return false;
end;
$$;

alter function private.checkout_commercial_quote_is_current(jsonb, uuid) owner to postgres;
revoke all on function private.checkout_commercial_quote_is_current(jsonb, uuid) from public, anon, authenticated;

create or replace function private.set_checkout_line_server_shipping_allocation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.quote_line_snapshot ? '_serverShippingAllocationMinor' then
    new.shipping_allocation_minor := (new.quote_line_snapshot ->> '_serverShippingAllocationMinor')::bigint;
    new.quote_line_snapshot := new.quote_line_snapshot - '_serverShippingAllocationMinor';
  end if;
  return new;
end;
$$;

revoke all on function private.set_checkout_line_server_shipping_allocation() from public, anon, authenticated;

drop trigger if exists checkout_order_lines_server_shipping_allocation on public.checkout_order_lines;
create trigger checkout_order_lines_server_shipping_allocation
before insert on public.checkout_order_lines
for each row execute function private.set_checkout_line_server_shipping_allocation();

alter table public.checkout_orders
  add constraint checkout_orders_authoritative_arithmetic_check
  check (
    discount_minor <= subtotal_minor
    and total_minor = subtotal_minor - discount_minor + shipping_minor
  ) not valid;

alter table public.checkout_orders
  validate constraint checkout_orders_authoritative_arithmetic_check;

create or replace function public.submit_checkout(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid := auth.uid();
  actor text;
  idem_key text := coalesce(p_payload ->> 'idempotencyKey', '');
  existing_order public.checkout_orders%rowtype;
  quote jsonb := p_payload -> 'acceptedQuote';
  shipping_address jsonb := p_payload -> 'shippingAddress';
  physical_lines jsonb;
  resolved jsonb;
  allocation jsonb;
  authoritative_shipping_minor bigint := 0;
  authoritative_allocations jsonb := '[]'::jsonb;
  winner_line_id text;
  result jsonb;
  created_order_id uuid;
  order_line_id uuid;
  enriched_lines jsonb;
begin
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(quote) <> 'object' or length(idem_key) < 8 then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_checkout_submit');
  end if;

  actor := coalesce(actor_user_id::text, 'guest:' || encode(
    extensions.digest(coalesce(p_payload ->> 'guestCartId', idem_key), 'sha256'), 'hex'
  ));
  select * into existing_order
  from public.checkout_orders
  where idempotency_actor = actor and idempotency_key = idem_key;
  if found then
    return jsonb_build_object(
      'status', 'success', 'orderId', existing_order.id,
      'orderNumber', existing_order.order_number,
      'reservationExpiresAt', existing_order.reservation_expires_at,
      'guestAccessToken', null
    );
  end if;

  if not private.checkout_commercial_quote_is_current(p_payload, actor_user_id) then
    return jsonb_build_object(
      'status', 'stale', 'code', 'stale_commercial_quote',
      'dimensions', jsonb_build_array('catalog', 'discount', 'totals')
    );
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId', line ->> 'lineId', 'productId', line ->> 'productId',
    'variantId', case when line ? 'variantId' then line -> 'variantId' else 'null'::jsonb end,
    'quantity', line -> 'quantity'
  ) order by line ->> 'lineId'), '[]'::jsonb)
  into physical_lines
  from jsonb_array_elements(quote -> 'lines') as lines(line)
  where line ->> 'fulfillmentType' = 'physical'
    and line ->> 'status' in ('ready', 'quantity_capped')
    and (line ->> 'quantity')::integer > 0;

  if jsonb_array_length(physical_lines) = 0 then
    return public.submit_checkout_legacy_v1(p_payload);
  end if;

  if jsonb_typeof(shipping_address) <> 'object'
    or coalesce(shipping_address ->> 'countryCode', '') !~ '^[A-Z]{2}$'
    or shipping_address ->> 'countryCode' is distinct from quote -> 'shipping' ->> 'countryCode' then
    return jsonb_build_object('status', 'invalid', 'code', 'shipping_address_required');
  end if;
  if shipping_address ->> 'countryCode' = 'US' and (
    coalesce(upper(btrim(shipping_address ->> 'region')), '') !~ '^[A-Z]{2}$'
    or length(btrim(coalesce(shipping_address ->> 'postalCode', ''))) = 0
  ) then
    return jsonb_build_object('status', 'invalid', 'code', 'us_shipping_address_incomplete');
  end if;

  resolved := private.resolve_checkout_shipping_allocations_v2(
    physical_lines, shipping_address ->> 'countryCode', quote ->> 'currencyCode',
    case when shipping_address ->> 'countryCode' = 'US'
      then nullif(upper(btrim(coalesce(shipping_address ->> 'region', ''))), '')
      else null end
  );
  if resolved ->> 'status' <> 'ready' then
    return jsonb_build_object('status', 'stale', 'code', 'stale_shipping_quote', 'dimensions', jsonb_build_array('shipping'));
  end if;

  select value ->> 'lineId' into winner_line_id
  from jsonb_array_elements(resolved -> 'allocations')
  order by (value ->> 'finalFirstItemFeeMinor')::bigint desc, value ->> 'lineId'
  limit 1;

  select coalesce(sum(case when value ->> 'lineId' = winner_line_id
    then (value ->> 'finalFirstItemFeeMinor')::bigint
      + (((value ->> 'quantity')::integer - 1) * (value ->> 'finalAdditionalItemFeeMinor')::bigint)
    else (value ->> 'quantity')::integer * (value ->> 'finalAdditionalItemFeeMinor')::bigint end), 0)
  into authoritative_shipping_minor
  from jsonb_array_elements(resolved -> 'allocations');

  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId', value ->> 'lineId', 'source', value ->> 'source',
    'shippingProfileId', value ->> 'shippingProfileId', 'shippingRuleId', value ->> 'shippingRuleId',
    'regionAdjustmentId', value -> 'regionAdjustmentId', 'regionMode', value -> 'regionMode',
    'finalFirstItemFeeMinor', value -> 'finalFirstItemFeeMinor',
    'finalAdditionalItemFeeMinor', value -> 'finalAdditionalItemFeeMinor'
  ) order by value ->> 'lineId'), '[]'::jsonb)
  into authoritative_allocations
  from jsonb_array_elements(resolved -> 'allocations');

  if quote -> 'shipping' ->> 'status' <> 'ready'
    or (quote -> 'shipping' ->> 'amountMinor')::bigint <> authoritative_shipping_minor
    or authoritative_allocations is distinct from (
      select coalesce(jsonb_agg(jsonb_build_object(
        'lineId', value ->> 'lineId', 'source', value ->> 'source',
        'shippingProfileId', value ->> 'shippingProfileId', 'shippingRuleId', value ->> 'shippingRuleId',
        'regionAdjustmentId', value -> 'regionAdjustmentId', 'regionMode', value -> 'regionMode',
        'finalFirstItemFeeMinor', value -> 'finalFirstItemFeeMinor',
        'finalAdditionalItemFeeMinor', value -> 'finalAdditionalItemFeeMinor'
      ) order by value ->> 'lineId'), '[]'::jsonb)
      from jsonb_array_elements(coalesce(quote -> 'shipping' -> 'allocations', '[]'::jsonb))
    ) then
    return jsonb_build_object('status', 'stale', 'code', 'stale_shipping_quote', 'dimensions', jsonb_build_array('shipping'));
  end if;

  select jsonb_agg(line || jsonb_build_object('_serverShippingAllocationMinor', coalesce((
    select case when a.value ->> 'lineId' = winner_line_id
      then (a.value ->> 'finalFirstItemFeeMinor')::bigint
        + (((a.value ->> 'quantity')::integer - 1) * (a.value ->> 'finalAdditionalItemFeeMinor')::bigint)
      else (a.value ->> 'quantity')::integer * (a.value ->> 'finalAdditionalItemFeeMinor')::bigint end
    from jsonb_array_elements(resolved -> 'allocations') a
    where a.value ->> 'lineId' = line ->> 'lineId'
  ), 0)) order by line ->> 'lineId')
  into enriched_lines
  from jsonb_array_elements(quote -> 'lines') lines(line);
  quote := jsonb_set(quote, '{lines}', enriched_lines);
  p_payload := jsonb_set(p_payload, '{acceptedQuote}', quote);

  result := public.submit_checkout_legacy_v1(p_payload);
  if result ->> 'status' <> 'success' then return result; end if;
  created_order_id := (result ->> 'orderId')::uuid;

  for allocation in select value from jsonb_array_elements(resolved -> 'allocations')
  loop
    select id into order_line_id from public.checkout_order_lines
    where order_id = created_order_id and line_id = allocation ->> 'lineId';
    insert into public.checkout_order_shipping_allocations (
      order_id, order_line_id, source_tier, shipping_profile_id, profile_name, shipping_rule_id,
      rule_match_kind, destination_country_code, currency_code, base_first_item_fee_minor,
      base_additional_item_fee_minor, region_adjustment_id, region_code, region_mode,
      region_first_item_fee_minor, region_additional_item_fee_minor, final_first_item_fee_minor,
      final_additional_item_fee_minor, quantity, first_item_winner_units, allocated_shipping_minor
    ) values (
      created_order_id, order_line_id, allocation ->> 'source', (allocation ->> 'shippingProfileId')::uuid,
      allocation ->> 'profileName', (allocation ->> 'shippingRuleId')::uuid,
      allocation ->> 'ruleMatchKind', allocation ->> 'destinationCountryCode', allocation ->> 'currencyCode',
      (allocation ->> 'baseFirstItemFeeMinor')::integer, (allocation ->> 'baseAdditionalItemFeeMinor')::integer,
      nullif(allocation ->> 'regionAdjustmentId', '')::uuid, nullif(allocation ->> 'regionCode', ''),
      nullif(allocation ->> 'regionMode', ''), nullif(allocation ->> 'regionFirstItemFeeMinor', '')::integer,
      nullif(allocation ->> 'regionAdditionalItemFeeMinor', '')::integer,
      (allocation ->> 'finalFirstItemFeeMinor')::integer, (allocation ->> 'finalAdditionalItemFeeMinor')::integer,
      (allocation ->> 'quantity')::integer, case when allocation ->> 'lineId' = winner_line_id then 1 else 0 end,
      case when allocation ->> 'lineId' = winner_line_id
        then (allocation ->> 'finalFirstItemFeeMinor')::bigint + (((allocation ->> 'quantity')::integer - 1) * (allocation ->> 'finalAdditionalItemFeeMinor')::bigint)
        else (allocation ->> 'quantity')::integer * (allocation ->> 'finalAdditionalItemFeeMinor')::bigint end
    ) on conflict (order_line_id) do nothing;
  end loop;

  if exists (
    select 1 from public.checkout_order_lines l
    left join public.checkout_order_shipping_allocations a on a.order_line_id = l.id
    where l.order_id = created_order_id
      and l.shipping_allocation_minor <> coalesce(a.allocated_shipping_minor, 0)
  ) or (select coalesce(sum(shipping_allocation_minor), 0) from public.checkout_order_lines where order_id = created_order_id)
       <> authoritative_shipping_minor then
    raise exception 'checkout shipping allocation invariant failed' using errcode = 'P0001';
  end if;
  return result;
end;
$$;

alter function public.submit_checkout(jsonb) owner to postgres;
revoke all on function public.submit_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.submit_checkout(jsonb) to anon, authenticated, service_role;
