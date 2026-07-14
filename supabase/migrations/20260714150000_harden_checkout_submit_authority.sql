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
  expected_line_discount bigint;
  line_eligible boolean;
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

  -- Hold the commercial rows used below until order persistence completes.
  -- Inventory is locked for update because reservation availability is also a
  -- mutable input and the legacy persistence function reuses the same lock.
  perform 1 from public.products
  where id in (select (value ->> 'productId')::uuid from jsonb_array_elements(quote -> 'lines'))
  for share;
  perform 1 from public.product_market_offers
  where product_id in (select (value ->> 'productId')::uuid from jsonb_array_elements(quote -> 'lines'))
    and market_code = quote ->> 'market'
  for share;
  perform 1 from public.product_variants
  where id in (select nullif(value ->> 'variantId', '')::uuid from jsonb_array_elements(quote -> 'lines'))
  for share;
  perform 1 from public.variant_market_offers
  where variant_id in (select nullif(value ->> 'variantId', '')::uuid from jsonb_array_elements(quote -> 'lines'))
    and market_code = quote ->> 'market'
  for share;
  perform 1 from public.inventory_records
  where product_id in (select (value ->> 'productId')::uuid from jsonb_array_elements(quote -> 'lines'))
     or variant_id in (select nullif(value ->> 'variantId', '')::uuid from jsonb_array_elements(quote -> 'lines'))
  for update;

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
        (case when product_kind = 'pdf_pattern' then 'digital' else 'physical' end)
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
        line_eligible := not exists (
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
        if line_eligible then
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
  new.shipping_allocation_minor := coalesce(
    (nullif(current_setting('app.checkout_shipping_allocations', true), '')::jsonb ->> new.line_id)::bigint,
    0
  );
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
  accepted_quote jsonb := p_payload -> 'acceptedQuote';
  quote jsonb := p_payload -> 'acceptedQuote';
  shipping_address jsonb := p_payload -> 'shippingAddress';
  physical_lines jsonb;
  resolved jsonb;
  allocation jsonb;
  authoritative_shipping_minor bigint := 0;
  authoritative_allocations jsonb := '[]'::jsonb;
  canonical_shipping_allocations jsonb := '[]'::jsonb;
  shipping_allocation_map jsonb := '{}'::jsonb;
  canonical_lines jsonb;
  canonical_discount jsonb;
  server_quote_hash text;
  winner_line_id text;
  result jsonb;
  created_order_id uuid;
  created_order_line_id uuid;
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

  -- Rebuild every persisted line snapshot from locked database rows. The
  -- browser quote is used only for already-verified quantities and discount
  -- allocations; descriptive metadata is never copied from the caller.
  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId', source.line ->> 'lineId',
    'productId', p.id,
    'variantId', pv.id,
    'slug', pt.slug,
    'title', pt.title,
    'fulfillmentType', case when p.product_type = 'pdf_pattern' then 'digital' else 'physical' end,
    'status', source.line ->> 'status',
    'quantity', (source.line ->> 'quantity')::integer,
    'requestedQuantity', (source.line ->> 'requestedQuantity')::integer,
    'marketAtAdd', accepted_quote ->> 'market',
    'currencyCode', coalesce(vmo.currency_code, pmo.currency_code),
    'unitPriceMinor', coalesce(vmo.price_minor, pmo.price_minor),
    'lineSubtotalMinor', coalesce(vmo.price_minor, pmo.price_minor) * (source.line ->> 'quantity')::integer,
    'excludedSubtotalMinor', coalesce(vmo.price_minor, pmo.price_minor)
      * ((source.line ->> 'requestedQuantity')::integer - (source.line ->> 'quantity')::integer),
    'variantLabel', case when pv.id is null then null else coalesce(
      (select string_agg(attribute.value, ' / ' order by attribute.key) from jsonb_each_text(pv.attributes) attribute),
      pv.sku
    ) end,
    'sku', pv.sku,
    'imageUrl', null,
    'categoryIds', coalesce((select jsonb_agg(pc.category_id order by pc.category_id) from public.product_categories pc where pc.product_id = p.id), '[]'::jsonb),
    'collectionIds', coalesce((select jsonb_agg(cp.collection_id order by cp.collection_id) from public.collection_products cp where cp.product_id = p.id), '[]'::jsonb),
    'discountAllocationMinor', (source.line ->> 'discountAllocationMinor')::bigint,
    'change', null
  ) order by source.line ->> 'lineId'), '[]'::jsonb)
  into canonical_lines
  from jsonb_array_elements(accepted_quote -> 'lines') source(line)
  join public.products p on p.id = (source.line ->> 'productId')::uuid
  join public.product_translations pt on pt.product_id = p.id and pt.locale = p_payload ->> 'locale'
  join public.product_market_offers pmo on pmo.product_id = p.id and pmo.market_code = accepted_quote ->> 'market'
  left join public.product_variants pv on pv.id = nullif(source.line ->> 'variantId', '')::uuid
  left join public.variant_market_offers vmo on vmo.variant_id = pv.id and vmo.market_code = accepted_quote ->> 'market';

  if jsonb_array_length(canonical_lines) <> jsonb_array_length(accepted_quote -> 'lines') then
    return jsonb_build_object('status', 'stale', 'code', 'stale_commercial_quote', 'dimensions', jsonb_build_array('catalog'));
  end if;

  canonical_discount := case
    when coalesce((accepted_quote -> 'discount' ->> 'amountMinor')::bigint, 0) > 0 then
      jsonb_build_object(
        'status', 'applied', 'code', upper(btrim(p_payload ->> 'discountCode')),
        'amountMinor', (accepted_quote -> 'discount' ->> 'amountMinor')::bigint,
        'allocations', (select coalesce(jsonb_agg(jsonb_build_object(
          'lineId', line ->> 'lineId', 'amountMinor', (line ->> 'discountAllocationMinor')::bigint
        ) order by line ->> 'lineId') filter (where (line ->> 'discountAllocationMinor')::bigint > 0), '[]'::jsonb)
          from jsonb_array_elements(canonical_lines) rows(line))
      )
    when nullif(btrim(coalesce(p_payload ->> 'discountCode', '')), '') is not null then
      jsonb_build_object('status', 'not_eligible', 'code', upper(btrim(p_payload ->> 'discountCode')), 'amountMinor', 0)
    else jsonb_build_object('status', 'not_applied', 'code', null, 'amountMinor', 0)
  end;

  quote := jsonb_build_object(
    'status', 'ready', 'locale', p_payload ->> 'locale',
    'market', accepted_quote ->> 'market', 'currencyCode', accepted_quote ->> 'currencyCode',
    'lines', canonical_lines,
    'subtotalMinor', (accepted_quote ->> 'subtotalMinor')::bigint,
    'excludedSubtotalMinor', (select coalesce(sum((line ->> 'excludedSubtotalMinor')::bigint), 0) from jsonb_array_elements(canonical_lines) rows(line)),
    'discount', canonical_discount,
    'shipping', jsonb_build_object('status', 'no_shipping_required', 'amountMinor', 0, 'countryCode', null),
    'totalMinor', (accepted_quote ->> 'totalMinor')::bigint,
    'changes', '[]'::jsonb,
    'quotedAt', statement_timestamp()
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId', line ->> 'lineId', 'productId', line ->> 'productId',
    'variantId', case when line ? 'variantId' then line -> 'variantId' else 'null'::jsonb end,
    'quantity', line -> 'quantity'
  ) order by line ->> 'lineId'), '[]'::jsonb)
  into physical_lines
  from jsonb_array_elements(canonical_lines) as lines(line)
  where line ->> 'fulfillmentType' = 'physical'
    and line ->> 'status' in ('ready', 'quantity_capped')
    and (line ->> 'quantity')::integer > 0;

  if jsonb_array_length(physical_lines) = 0 then
    server_quote_hash := encode(extensions.digest(quote::text, 'sha256'), 'hex');
    quote := quote || jsonb_build_object('hash', server_quote_hash);
    p_payload := jsonb_set(jsonb_set(p_payload, '{acceptedQuote}', quote), '{acceptedQuoteHash}', to_jsonb(server_quote_hash));
    perform set_config('app.checkout_shipping_allocations', '{}'::jsonb::text, true);
    return public.submit_checkout_legacy_v1(p_payload);
  end if;

  if jsonb_typeof(shipping_address) <> 'object'
    or coalesce(shipping_address ->> 'countryCode', '') !~ '^[A-Z]{2}$'
    or shipping_address ->> 'countryCode' is distinct from accepted_quote -> 'shipping' ->> 'countryCode' then
    return jsonb_build_object('status', 'invalid', 'code', 'shipping_address_required');
  end if;
  if shipping_address ->> 'countryCode' = 'US' and (
    coalesce(upper(btrim(shipping_address ->> 'region')), '') !~ '^[A-Z]{2}$'
    or length(btrim(coalesce(shipping_address ->> 'postalCode', ''))) = 0
  ) then
    return jsonb_build_object('status', 'invalid', 'code', 'us_shipping_address_incomplete');
  end if;

  resolved := private.resolve_checkout_shipping_allocations_v2(
    physical_lines, shipping_address ->> 'countryCode', accepted_quote ->> 'currencyCode',
    case when shipping_address ->> 'countryCode' = 'US'
      then nullif(upper(btrim(coalesce(shipping_address ->> 'region', ''))), '')
      else null end
  );
  if resolved ->> 'status' <> 'ready' then
    return jsonb_build_object('status', 'stale', 'code', 'stale_shipping_quote', 'dimensions', jsonb_build_array('shipping'));
  end if;

  -- Lock selected shipping configuration and resolve again after the locks so
  -- an update cannot land between verification and immutable persistence.
  perform 1 from public.shipping_profiles
  where id in (select (value ->> 'shippingProfileId')::uuid from jsonb_array_elements(resolved -> 'allocations'))
  for share;
  perform 1 from public.shipping_rules
  where id in (select (value ->> 'shippingRuleId')::uuid from jsonb_array_elements(resolved -> 'allocations'))
  for share;
  perform 1 from public.shipping_region_adjustments
  where id in (select nullif(value ->> 'regionAdjustmentId', '')::uuid from jsonb_array_elements(resolved -> 'allocations'))
  for share;
  resolved := private.resolve_checkout_shipping_allocations_v2(
    physical_lines, shipping_address ->> 'countryCode', accepted_quote ->> 'currencyCode',
    case when shipping_address ->> 'countryCode' = 'US'
      then nullif(upper(btrim(coalesce(shipping_address ->> 'region', ''))), '') else null end
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

  if accepted_quote -> 'shipping' ->> 'status' <> 'ready'
    or (accepted_quote -> 'shipping' ->> 'amountMinor')::bigint <> authoritative_shipping_minor
    or authoritative_allocations is distinct from (
      select coalesce(jsonb_agg(jsonb_build_object(
        'lineId', value ->> 'lineId', 'source', value ->> 'source',
        'shippingProfileId', value ->> 'shippingProfileId', 'shippingRuleId', value ->> 'shippingRuleId',
        'regionAdjustmentId', value -> 'regionAdjustmentId', 'regionMode', value -> 'regionMode',
        'finalFirstItemFeeMinor', value -> 'finalFirstItemFeeMinor',
        'finalAdditionalItemFeeMinor', value -> 'finalAdditionalItemFeeMinor'
      ) order by value ->> 'lineId'), '[]'::jsonb)
      from jsonb_array_elements(coalesce(accepted_quote -> 'shipping' -> 'allocations', '[]'::jsonb))
    ) then
    return jsonb_build_object('status', 'stale', 'code', 'stale_shipping_quote', 'dimensions', jsonb_build_array('shipping'));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId', a.value ->> 'lineId', 'productId', a.value -> 'productId', 'variantId', a.value -> 'variantId',
    'quantity', (a.value ->> 'quantity')::integer, 'source', a.value ->> 'source',
    'shippingProfileId', a.value ->> 'shippingProfileId', 'profileName', a.value ->> 'profileName',
    'shippingRuleId', a.value ->> 'shippingRuleId', 'ruleMatchKind', a.value ->> 'ruleMatchKind',
    'destinationCountryCode', a.value ->> 'destinationCountryCode', 'currencyCode', a.value ->> 'currencyCode',
    'baseFirstItemFeeMinor', (a.value ->> 'baseFirstItemFeeMinor')::integer,
    'baseAdditionalItemFeeMinor', (a.value ->> 'baseAdditionalItemFeeMinor')::integer,
    'regionAdjustmentId', a.value -> 'regionAdjustmentId', 'regionCode', a.value -> 'regionCode',
    'regionMode', a.value -> 'regionMode', 'regionFirstItemFeeMinor', a.value -> 'regionFirstItemFeeMinor',
    'regionAdditionalItemFeeMinor', a.value -> 'regionAdditionalItemFeeMinor',
    'finalFirstItemFeeMinor', (a.value ->> 'finalFirstItemFeeMinor')::integer,
    'finalAdditionalItemFeeMinor', (a.value ->> 'finalAdditionalItemFeeMinor')::integer,
    'firstItemWinnerUnits', case when a.value ->> 'lineId' = winner_line_id then 1 else 0 end,
    'allocatedShippingMinor', case when a.value ->> 'lineId' = winner_line_id
      then (a.value ->> 'finalFirstItemFeeMinor')::bigint
        + (((a.value ->> 'quantity')::integer - 1) * (a.value ->> 'finalAdditionalItemFeeMinor')::bigint)
      else (a.value ->> 'quantity')::integer * (a.value ->> 'finalAdditionalItemFeeMinor')::bigint end
  ) order by a.value ->> 'lineId'), '[]'::jsonb)
  into canonical_shipping_allocations
  from jsonb_array_elements(resolved -> 'allocations') a;

  select coalesce(jsonb_object_agg(
    value ->> 'lineId', (value ->> 'allocatedShippingMinor')::bigint
  ), '{}'::jsonb) into shipping_allocation_map
  from jsonb_array_elements(canonical_shipping_allocations);
  perform set_config('app.checkout_shipping_allocations', shipping_allocation_map::text, true);

  quote := jsonb_set(quote, '{shipping}', jsonb_build_object(
    'status', 'ready', 'version', 2, 'amountMinor', authoritative_shipping_minor,
    'countryCode', shipping_address ->> 'countryCode',
    'regionCode', case when shipping_address ->> 'countryCode' = 'US' then upper(btrim(shipping_address ->> 'region')) else null end,
    'firstItemLineId', winner_line_id,
    'chargeableUnitCount', (select coalesce(sum((value ->> 'quantity')::integer), 0) from jsonb_array_elements(resolved -> 'allocations')),
    'allocations', canonical_shipping_allocations
  ));
  server_quote_hash := encode(extensions.digest(quote::text, 'sha256'), 'hex');
  quote := quote || jsonb_build_object('hash', server_quote_hash);
  p_payload := jsonb_set(jsonb_set(p_payload, '{acceptedQuote}', quote), '{acceptedQuoteHash}', to_jsonb(server_quote_hash));

  result := public.submit_checkout_legacy_v1(p_payload);
  if result ->> 'status' <> 'success' then return result; end if;
  created_order_id := (result ->> 'orderId')::uuid;

  for allocation in select value from jsonb_array_elements(resolved -> 'allocations')
  loop
    select id into created_order_line_id from public.checkout_order_lines
    where order_id = created_order_id and line_id = allocation ->> 'lineId';
    insert into public.checkout_order_shipping_allocations (
      order_id, order_line_id, source_tier, shipping_profile_id, profile_name, shipping_rule_id,
      rule_match_kind, destination_country_code, currency_code, base_first_item_fee_minor,
      base_additional_item_fee_minor, region_adjustment_id, region_code, region_mode,
      region_first_item_fee_minor, region_additional_item_fee_minor, final_first_item_fee_minor,
      final_additional_item_fee_minor, quantity, first_item_winner_units, allocated_shipping_minor
    ) values (
      created_order_id, created_order_line_id, allocation ->> 'source', (allocation ->> 'shippingProfileId')::uuid,
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
