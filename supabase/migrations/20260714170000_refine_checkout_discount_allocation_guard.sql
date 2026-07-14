-- Refine the commercial verifier without rewriting deployed migration history.
-- The zero-discount path never enters discount-rule allocation SQL.

create or replace function private.checkout_commercial_quote_is_current_v1(
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

  -- Zero discounts are validated directly. The proportional allocation query
  -- is reachable only for a concrete positive discount rule and subtotal.
  if expected_discount = 0 then
    for quote_line in select value from jsonb_array_elements(quote -> 'lines')
    loop
      if (quote_line ->> 'discountAllocationMinor')::bigint <> 0 then
        return false;
      end if;
    end loop;
  else
    if discount_rule.id is null or eligible_subtotal <= 0 then
      return false;
    end if;

    -- Keep the TypeScript proportional floor + largest-remainder formula exact.
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
          case when eligible then (expected_discount * line_subtotal) / eligible_subtotal else 0 end as base,
          row_number() over (order by
            case when eligible then mod(expected_discount * line_subtotal, eligible_subtotal) else -1 end desc,
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
  end if;

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

alter function private.checkout_commercial_quote_is_current_v1(jsonb, uuid) owner to postgres;
revoke all on function private.checkout_commercial_quote_is_current_v1(jsonb, uuid) from public, anon, authenticated;

