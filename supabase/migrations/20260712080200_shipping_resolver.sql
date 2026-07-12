-- D-01..D-06 / SHIP-09 / SHIP-10: resolve every physical line through one
-- authoritative six-tier chain and return complete, same-currency evidence.
create or replace function private.resolve_checkout_shipping_allocations_v2(
  p_lines jsonb,
  p_country_code text,
  p_currency_code text,
  p_region_code text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = private, public, pg_temp
as $$
declare
  normalized_country text := upper(btrim(p_country_code));
  normalized_currency text := upper(btrim(p_currency_code));
  normalized_region text := case when p_region_code is null then null else upper(btrim(p_region_code)) end;
  line_record record;
  selected_record record;
  adjustment_id uuid;
  adjustment_mode text;
  adjustment_first integer;
  adjustment_additional integer;
  allocations jsonb := '[]'::jsonb;
  unsupported_line_ids jsonb := '[]'::jsonb;
  final_first bigint;
  final_additional bigint;
begin
  if normalized_country is null or normalized_country !~ '^[A-Z]{2}$' then
    return jsonb_build_object('status', 'error', 'code', 'invalid_country');
  end if;

  if normalized_currency is null or normalized_currency not in ('VND', 'USD') then
    return jsonb_build_object('status', 'error', 'code', 'invalid_currency');
  end if;

  if normalized_region is not null and normalized_region !~ '^[A-Z]{2}$' then
    return jsonb_build_object('status', 'error', 'code', 'invalid_region');
  end if;

  if p_lines is null
    or jsonb_typeof(p_lines) <> 'array'
    or jsonb_array_length(p_lines) not between 1 and 100
    or exists (
      select 1
      from jsonb_array_elements(p_lines) as item(value)
      where jsonb_typeof(value) <> 'object'
        or length(btrim(value ->> 'lineId')) not between 1 and 200
        or coalesce(value ->> 'productId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or (
          value ? 'variantId'
          and value -> 'variantId' <> 'null'::jsonb
          and coalesce(value ->> 'variantId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
        or jsonb_typeof(value -> 'quantity') <> 'number'
        or (value ->> 'quantity') !~ '^[1-9][0-9]*$'
        or (value ->> 'quantity')::numeric > 1000
    )
    or exists (
      select 1
      from jsonb_array_elements(p_lines) as item(value)
      group by btrim(value ->> 'lineId')
      having count(*) > 1
    )
  then
    return jsonb_build_object('status', 'error', 'code', 'invalid_lines');
  end if;

  for line_record in
    select
      btrim(value ->> 'lineId') as line_id,
      (value ->> 'productId')::uuid as product_id,
      case when value -> 'variantId' is null or value -> 'variantId' = 'null'::jsonb
        then null else (value ->> 'variantId')::uuid end as variant_id,
      (value ->> 'quantity')::integer as quantity,
      ordinality
    from jsonb_array_elements(p_lines) with ordinality as item(value, ordinality)
    order by ordinality
  loop
    if not exists (
      select 1
      from public.products p
      where p.id = line_record.product_id
        and p.product_type = 'physical_finished'
        and (
          line_record.variant_id is null
          or exists (
            select 1 from public.product_variants pv
            where pv.id = line_record.variant_id
              and pv.product_id = p.id
          )
        )
    ) then
      unsupported_line_ids := unsupported_line_ids || jsonb_build_array(line_record.line_id);
      continue;
    end if;

    selected_record := null;
    select candidate.*
    into selected_record
    from (
      select
        1 as precedence,
        'variant'::text as source,
        sp.id as profile_id,
        sp.name as profile_name,
        sr.id as rule_id,
        sr.match_kind,
        sr.first_item_fee_minor,
        sr.additional_item_fee_minor
      from public.variant_shipping_profiles vsp
      join public.shipping_profiles sp on sp.id = vsp.profile_id and sp.active
      join public.shipping_rules sr on sr.profile_id = sp.id and sr.active
      where line_record.variant_id is not null
        and vsp.variant_id = line_record.variant_id
        and sr.currency_code = normalized_currency
        and sr.match_kind = 'exact_country'
        and sr.country_code = normalized_country

      union all

      select 2, 'variant', sp.id, sp.name, sr.id, sr.match_kind,
        sr.first_item_fee_minor, sr.additional_item_fee_minor
      from public.variant_shipping_profiles vsp
      join public.shipping_profiles sp on sp.id = vsp.profile_id and sp.active
      join public.shipping_rules sr on sr.profile_id = sp.id and sr.active
      where line_record.variant_id is not null
        and vsp.variant_id = line_record.variant_id
        and sr.currency_code = normalized_currency
        and sr.match_kind = 'fallback'
        and sr.country_code is null

      union all

      select 3, 'product', sp.id, sp.name, sr.id, sr.match_kind,
        sr.first_item_fee_minor, sr.additional_item_fee_minor
      from public.product_shipping_profiles psp
      join public.shipping_profiles sp on sp.id = psp.profile_id and sp.active
      join public.shipping_rules sr on sr.profile_id = sp.id and sr.active
      where psp.product_id = line_record.product_id
        and sr.currency_code = normalized_currency
        and sr.match_kind = 'exact_country'
        and sr.country_code = normalized_country

      union all

      select 4, 'product', sp.id, sp.name, sr.id, sr.match_kind,
        sr.first_item_fee_minor, sr.additional_item_fee_minor
      from public.product_shipping_profiles psp
      join public.shipping_profiles sp on sp.id = psp.profile_id and sp.active
      join public.shipping_rules sr on sr.profile_id = sp.id and sr.active
      where psp.product_id = line_record.product_id
        and sr.currency_code = normalized_currency
        and sr.match_kind = 'fallback'
        and sr.country_code is null

      union all

      select 5, 'store_default', sp.id, sp.name, sr.id, sr.match_kind,
        sr.first_item_fee_minor, sr.additional_item_fee_minor
      from public.shipping_store_defaults ssd
      join public.shipping_profiles sp on sp.id = ssd.shipping_profile_id and sp.active
      join public.shipping_rules sr on sr.profile_id = sp.id and sr.active
      where ssd.active
        and sr.currency_code = normalized_currency
        and sr.match_kind = 'exact_country'
        and sr.country_code = normalized_country

      union all

      select 6, 'store_default', sp.id, sp.name, sr.id, sr.match_kind,
        sr.first_item_fee_minor, sr.additional_item_fee_minor
      from public.shipping_store_defaults ssd
      join public.shipping_profiles sp on sp.id = ssd.shipping_profile_id and sp.active
      join public.shipping_rules sr on sr.profile_id = sp.id and sr.active
      where ssd.active
        and sr.currency_code = normalized_currency
        and sr.match_kind = 'fallback'
        and sr.country_code is null
    ) candidate
    order by candidate.precedence, candidate.rule_id
    limit 1;

    if selected_record.rule_id is null then
      unsupported_line_ids := unsupported_line_ids || jsonb_build_array(line_record.line_id);
      continue;
    end if;

    adjustment_id := null;
    adjustment_mode := null;
    adjustment_first := null;
    adjustment_additional := null;
    if normalized_region is not null then
      select
        sra.id,
        sra.mode,
        sra.first_item_fee_minor,
        sra.additional_item_fee_minor
      into adjustment_id, adjustment_mode, adjustment_first, adjustment_additional
      from public.shipping_region_adjustments sra
      where sra.shipping_rule_id = selected_record.rule_id
        and sra.country_code = normalized_country
        and sra.region_code = normalized_region
        and sra.active
      order by sra.id
      limit 1;
    end if;

    final_first := case
      when adjustment_id is null then selected_record.first_item_fee_minor::bigint
      when adjustment_mode = 'replace' then adjustment_first::bigint
      else selected_record.first_item_fee_minor::bigint + adjustment_first::bigint
    end;
    final_additional := case
      when adjustment_id is null then selected_record.additional_item_fee_minor::bigint
      when adjustment_mode = 'replace' then adjustment_additional::bigint
      else selected_record.additional_item_fee_minor::bigint + adjustment_additional::bigint
    end;

    if final_first not between 0 and 2147483647 or final_additional not between 0 and 2147483647 then
      return jsonb_build_object('status', 'error', 'code', 'resolver_invariant');
    end if;

    allocations := allocations || jsonb_build_array(jsonb_build_object(
      'lineId', line_record.line_id,
      'productId', line_record.product_id,
      'variantId', line_record.variant_id,
      'quantity', line_record.quantity,
      'source', selected_record.source,
      'shippingProfileId', selected_record.profile_id,
      'profileName', selected_record.profile_name,
      'shippingRuleId', selected_record.rule_id,
      'ruleMatchKind', selected_record.match_kind,
      'destinationCountryCode', normalized_country,
      'currencyCode', normalized_currency,
      'baseFirstItemFeeMinor', selected_record.first_item_fee_minor,
      'baseAdditionalItemFeeMinor', selected_record.additional_item_fee_minor,
      'regionAdjustmentId', adjustment_id,
      'regionCode', case when adjustment_id is null then null else normalized_region end,
      'regionMode', adjustment_mode,
      'regionFirstItemFeeMinor', adjustment_first,
      'regionAdditionalItemFeeMinor', adjustment_additional,
      'finalFirstItemFeeMinor', final_first,
      'finalAdditionalItemFeeMinor', final_additional
    ));
  end loop;

  if jsonb_array_length(unsupported_line_ids) > 0 then
    return jsonb_build_object(
      'status', 'error',
      'code', 'unsupported_destination',
      'unsupportedLineIds', (
        select jsonb_agg(value order by value)
        from jsonb_array_elements_text(unsupported_line_ids) unsupported(value)
      )
    );
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'countryCode', normalized_country,
    'currencyCode', normalized_currency,
    'regionCode', normalized_region,
    'allocations', allocations
  );
exception
  when data_exception or integrity_constraint_violation then
    return jsonb_build_object('status', 'error', 'code', 'resolver_invariant');
end;
$$;

alter function private.resolve_checkout_shipping_allocations_v2(jsonb, text, text, text) owner to postgres;
revoke all on function private.resolve_checkout_shipping_allocations_v2(jsonb, text, text, text) from public, anon, authenticated;
grant execute on function private.resolve_checkout_shipping_allocations_v2(jsonb, text, text, text) to service_role;

-- T-08-02-PRIV: browser roles enter only through this constrained definer.
create or replace function public.get_checkout_shipping_quote_v2(
  p_lines jsonb,
  p_country_code text,
  p_currency_code text,
  p_region_code text
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
      'status', 'ready',
      'countryCode', resolved -> 'countryCode',
      'currencyCode', resolved -> 'currencyCode',
      'regionCode', resolved -> 'regionCode',
      'allocations', coalesce(resolved -> 'allocations', '[]'::jsonb)
    );
  end if;

  if resolved ->> 'code' = 'unsupported_destination' then
    return jsonb_build_object(
      'status', 'error',
      'code', 'unsupported_destination',
      'unsupportedLineIds', coalesce(resolved -> 'unsupportedLineIds', '[]'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'status', 'error',
    'code', case resolved ->> 'code'
      when 'invalid_country' then 'invalid_country'
      when 'invalid_currency' then 'invalid_currency'
      when 'invalid_region' then 'invalid_region'
      when 'invalid_lines' then 'invalid_lines'
      else 'resolver_invariant'
    end
  );
exception
  when others then
    return jsonb_build_object('status', 'error', 'code', 'resolver_invariant');
end;
$$;

alter function public.get_checkout_shipping_quote_v2(jsonb, text, text, text) owner to postgres;
revoke all on function public.get_checkout_shipping_quote_v2(jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.get_checkout_shipping_quote_v2(jsonb, text, text, text) to anon, authenticated, service_role;
