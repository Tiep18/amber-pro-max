-- Phase 08: shipping quotes are advisory. The checkout transaction resolves the
-- destination again and persists the exact allocation evidence it accepted.

create or replace function public.get_checkout_shipping_quote_v2(
  p_lines jsonb,
  p_country_code text,
  p_currency_code text,
  p_region_code text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  resolved jsonb;
begin
  resolved := private.resolve_checkout_shipping_allocations_v2(
    p_lines,
    p_country_code,
    p_currency_code,
    p_region_code
  );

  if resolved ->> 'status' = 'ready' then
    return jsonb_build_object(
      'version', 2,
      'status', 'ready',
      'countryCode', resolved -> 'countryCode',
      'currencyCode', resolved -> 'currencyCode',
      'regionCode', resolved -> 'regionCode',
      'allocations', coalesce(resolved -> 'allocations', '[]'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'version', 2,
    'status', 'error',
    'code', case resolved ->> 'code'
      when 'unsupported_destination' then 'unsupported_destination'
      when 'invalid_country' then 'invalid_country'
      when 'invalid_currency' then 'invalid_currency'
      when 'invalid_region' then 'invalid_region'
      when 'invalid_lines' then 'invalid_lines'
      else 'resolver_invariant'
    end,
    'unsupportedLineIds', case
      when resolved ->> 'code' = 'unsupported_destination'
        then coalesce(resolved -> 'unsupportedLineIds', '[]'::jsonb)
      else '[]'::jsonb
    end
  );
exception when others then
  return jsonb_build_object('version', 2, 'status', 'error', 'code', 'resolver_invariant');
end;
$$;

alter function public.get_checkout_shipping_quote_v2(jsonb, text, text, text) owner to postgres;
revoke all on function public.get_checkout_shipping_quote_v2(jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.get_checkout_shipping_quote_v2(jsonb, text, text, text) to anon, authenticated, service_role;

alter function public.submit_checkout(jsonb) rename to submit_checkout_legacy_v1;
revoke all on function public.submit_checkout_legacy_v1(jsonb) from public, anon, authenticated;

create or replace function public.submit_checkout(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quote jsonb := p_payload -> 'acceptedQuote';
  shipping_address jsonb := p_payload -> 'shippingAddress';
  physical_lines jsonb;
  resolved jsonb;
  allocation jsonb;
  accepted_allocation jsonb;
  authoritative_shipping_minor bigint := 0;
  authoritative_allocations jsonb := '[]'::jsonb;
  winner_line_id text;
  result jsonb;
  created_order_id uuid;
  order_line_id uuid;
  expected_line_count integer;
  accepted_line_count integer;
begin
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(quote) <> 'object' then
    return jsonb_build_object('status', 'invalid', 'code', 'invalid_checkout_submit');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId', line ->> 'lineId',
    'productId', line ->> 'productId',
    'variantId', case when line ? 'variantId' then line -> 'variantId' else 'null'::jsonb end,
    'quantity', line -> 'quantity'
  ) order by line ->> 'lineId'), '[]'::jsonb)
  into physical_lines
  from jsonb_array_elements(coalesce(quote -> 'lines', '[]'::jsonb)) as lines(line)
  where line ->> 'fulfillmentType' = 'physical'
    and line ->> 'status' in ('ready', 'quantity_capped')
    and coalesce((line ->> 'quantity')::integer, 0) > 0;

  if jsonb_array_length(physical_lines) = 0 then
    return public.submit_checkout_legacy_v1(p_payload);
  end if;

  if jsonb_typeof(shipping_address) <> 'object'
    or coalesce(shipping_address ->> 'countryCode', '') !~ '^[A-Z]{2}$'
    or coalesce(shipping_address ->> 'countryCode', '') <> coalesce(quote -> 'shipping' ->> 'countryCode', '') then
    return jsonb_build_object('status', 'invalid', 'code', 'shipping_address_required');
  end if;

  if shipping_address ->> 'countryCode' = 'US'
    and (
      coalesce(upper(btrim(shipping_address ->> 'region')), '') !~ '^[A-Z]{2}$'
      or length(btrim(coalesce(shipping_address ->> 'postalCode', ''))) = 0
    ) then
    return jsonb_build_object('status', 'invalid', 'code', 'us_shipping_address_incomplete');
  end if;

  resolved := private.resolve_checkout_shipping_allocations_v2(
    physical_lines,
    shipping_address ->> 'countryCode',
    quote ->> 'currencyCode',
    nullif(upper(btrim(coalesce(shipping_address ->> 'region', ''))), '')
  );
  if resolved ->> 'status' <> 'ready' then
    return jsonb_build_object('status', 'stale', 'code', 'stale_shipping_quote', 'dimensions', jsonb_build_array('shipping'));
  end if;

  select candidate ->> 'lineId'
  into winner_line_id
  from jsonb_array_elements(coalesce(resolved -> 'allocations', '[]'::jsonb)) as candidates(candidate)
  order by (candidate ->> 'finalFirstItemFeeMinor')::bigint desc, candidate ->> 'lineId'
  limit 1;

  select coalesce(sum(
    case when allocation ->> 'lineId' = winner_line_id
      then (allocation ->> 'finalFirstItemFeeMinor')::bigint
        + (((allocation ->> 'quantity')::integer - 1) * (allocation ->> 'finalAdditionalItemFeeMinor')::bigint)
      else (allocation ->> 'quantity')::integer * (allocation ->> 'finalAdditionalItemFeeMinor')::bigint
    end
  ), 0)
  into authoritative_shipping_minor
  from jsonb_array_elements(coalesce(resolved -> 'allocations', '[]'::jsonb)) as rows(allocation);

  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId', allocation ->> 'lineId',
    'source', allocation ->> 'source',
    'shippingProfileId', allocation ->> 'shippingProfileId',
    'shippingRuleId', allocation ->> 'shippingRuleId',
    'regionAdjustmentId', allocation -> 'regionAdjustmentId',
    'regionMode', allocation -> 'regionMode',
    'finalFirstItemFeeMinor', allocation -> 'finalFirstItemFeeMinor',
    'finalAdditionalItemFeeMinor', allocation -> 'finalAdditionalItemFeeMinor'
  ) order by allocation ->> 'lineId'), '[]'::jsonb)
  into authoritative_allocations
  from jsonb_array_elements(coalesce(resolved -> 'allocations', '[]'::jsonb)) as rows(allocation);

  select count(*) into expected_line_count
  from jsonb_array_elements(authoritative_allocations);
  select count(*) into accepted_line_count
  from jsonb_array_elements(coalesce(quote -> 'shipping' -> 'allocations', '[]'::jsonb));

  if quote -> 'shipping' ->> 'status' <> 'ready'
    or coalesce((quote -> 'shipping' ->> 'amountMinor')::bigint, -1) <> authoritative_shipping_minor
    or accepted_line_count <> expected_line_count
    or exists (
      select 1
      from jsonb_array_elements(authoritative_allocations) as expected(value)
      where not exists (
        select 1
        from jsonb_array_elements(coalesce(quote -> 'shipping' -> 'allocations', '[]'::jsonb)) as accepted(value)
        where accepted.value ->> 'lineId' = expected.value ->> 'lineId'
          and accepted.value ->> 'source' = expected.value ->> 'source'
          and accepted.value ->> 'shippingProfileId' = expected.value ->> 'shippingProfileId'
          and accepted.value ->> 'shippingRuleId' = expected.value ->> 'shippingRuleId'
          and accepted.value -> 'regionAdjustmentId' is not distinct from expected.value -> 'regionAdjustmentId'
          and accepted.value -> 'regionMode' is not distinct from expected.value -> 'regionMode'
          and accepted.value -> 'finalFirstItemFeeMinor' = expected.value -> 'finalFirstItemFeeMinor'
          and accepted.value -> 'finalAdditionalItemFeeMinor' = expected.value -> 'finalAdditionalItemFeeMinor'
      )
    ) then
    return jsonb_build_object('status', 'stale', 'code', 'stale_shipping_quote', 'dimensions', jsonb_build_array('shipping'));
  end if;

  result := public.submit_checkout_legacy_v1(p_payload);
  if result ->> 'status' <> 'success' then
    return result;
  end if;

  created_order_id := (result ->> 'orderId')::uuid;
  for allocation in select value from jsonb_array_elements(resolved -> 'allocations')
  loop
    select id into order_line_id
    from public.checkout_order_lines
    where checkout_order_lines.order_id = created_order_id
      and checkout_order_lines.line_id = allocation ->> 'lineId';

    if order_line_id is null then
      raise exception 'checkout shipping allocation line missing' using errcode = 'P0001';
    end if;

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
      (allocation ->> 'quantity')::integer,
      case when allocation ->> 'lineId' = winner_line_id then 1 else 0 end,
      case when allocation ->> 'lineId' = winner_line_id
        then (allocation ->> 'finalFirstItemFeeMinor')::bigint + (((allocation ->> 'quantity')::integer - 1) * (allocation ->> 'finalAdditionalItemFeeMinor')::bigint)
        else (allocation ->> 'quantity')::integer * (allocation ->> 'finalAdditionalItemFeeMinor')::bigint end
    );
  end loop;

  if (
    select coalesce(sum(snapshot.allocated_shipping_minor), 0)
    from public.checkout_order_shipping_allocations snapshot
    where snapshot.order_id = created_order_id
  ) <> authoritative_shipping_minor then
    raise exception 'checkout shipping allocation total mismatch' using errcode = 'P0001';
  end if;

  return result;
end;
$$;

alter function public.submit_checkout(jsonb) owner to postgres;
revoke all on function public.submit_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.submit_checkout(jsonb) to anon, authenticated, service_role;
