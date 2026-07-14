-- Keep published catalog state aligned with the same requirements used by the
-- explicit publish boundary, and reject digital checkout without its asset.

alter function public.catalog_publish_issues(uuid)
  rename to catalog_publish_issues_v1;
alter function public.catalog_publish_issues_v1(uuid) set schema private;

create function public.catalog_publish_issues(target_product_id uuid)
returns table (
  issue_code text,
  locale text,
  market_code text,
  detail text
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  -- Preserve the former RLS-visible behavior: non-admin authenticated callers
  -- receive the same no-data result, while database/service maintenance can
  -- still enforce the invariant without a user JWT.
  if coalesce(auth.role(), '') not in ('', 'service_role')
    and not private.is_admin() then
    raise no_data_found using message = 'catalog product not found';
  end if;

  return query
  select *
  from private.catalog_publish_issues_v1(target_product_id)

  union all

  select
    'incompatible_product_data'::text,
    null::text,
    null::text,
    'remove data owned by the previous product type before publishing'::text
  from public.products p
  where p.id = target_product_id
    and (
      (
        p.product_type = 'pdf_pattern'
        and (
          exists (
            select 1 from public.product_variants pv
            where pv.product_id = p.id
          )
          or exists (
            select 1 from public.inventory_records ir
            where ir.product_id = p.id
          )
          or exists (
            select 1 from public.product_shipping_profiles psp
            where psp.product_id = p.id
          )
        )
      )
      or (
        p.product_type = 'physical_finished'
        and exists (
          select 1 from public.product_digital_assets pda
          where pda.product_id = p.id
        )
      )
    );
end;
$$;

revoke all on function public.catalog_publish_issues(uuid) from public, anon, authenticated;
grant execute on function public.catalog_publish_issues(uuid) to authenticated;
revoke all on function private.catalog_publish_issues_v1(uuid) from public, anon, authenticated;

create or replace function private.demote_catalog_product_if_ineligible(target_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not exists (
    select 1 from public.products p
    where p.id = target_product_id and p.status = 'published'
  ) then
    return;
  end if;

  update public.products p
  set status = 'draft', updated_at = now()
  where p.id = target_product_id
    and p.status = 'published'
    and exists (
      select 1
      from public.catalog_publish_issues(target_product_id)
    );
end;
$$;

create or replace function private.maintain_catalog_publish_invariant()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  old_product_id uuid;
  new_product_id uuid;
begin
  if tg_table_name = 'products' then
    old_product_id := old.id;
    new_product_id := new.id;
  elsif tg_table_name = 'inventory_records' then
    if tg_op <> 'INSERT' then
      old_product_id := old.product_id;
      if old_product_id is null then
        select pv.product_id into old_product_id
        from public.product_variants pv
        where pv.id = old.variant_id;
      end if;
    end if;

    if tg_op <> 'DELETE' then
      new_product_id := new.product_id;
      if new_product_id is null then
        select pv.product_id into new_product_id
        from public.product_variants pv
        where pv.id = new.variant_id;
      end if;
    end if;
  else
    if tg_op <> 'INSERT' then
      old_product_id := (to_jsonb(old) ->> 'product_id')::uuid;
    end if;
    if tg_op <> 'DELETE' then
      new_product_id := (to_jsonb(new) ->> 'product_id')::uuid;
    end if;
  end if;

  if old_product_id is not null then
    perform private.demote_catalog_product_if_ineligible(old_product_id);
  end if;
  if new_product_id is not null and new_product_id is distinct from old_product_id then
    perform private.demote_catalog_product_if_ineligible(new_product_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.demote_catalog_product_if_ineligible(uuid) from public, anon, authenticated;
revoke all on function private.maintain_catalog_publish_invariant() from public, anon, authenticated;

create trigger products_preserve_publish_invariant
after update of product_type on public.products
for each row
when (old.product_type is distinct from new.product_type)
execute function private.maintain_catalog_publish_invariant();

create trigger product_translations_preserve_publish_invariant_update
after update of product_id, locale, slug, seo_title, seo_description, social_image_bucket, social_image_path
on public.product_translations
for each row execute function private.maintain_catalog_publish_invariant();

create trigger product_translations_preserve_publish_invariant_delete
after delete on public.product_translations
for each row execute function private.maintain_catalog_publish_invariant();

create trigger product_market_offers_preserve_publish_invariant_update
after update of product_id, market_code, enabled, price_minor on public.product_market_offers
for each row
when (
  old.product_id is distinct from new.product_id
  or old.market_code is distinct from new.market_code
  or old.enabled is distinct from new.enabled
  or new.price_minor is null
)
execute function private.maintain_catalog_publish_invariant();

create trigger product_market_offers_preserve_publish_invariant_delete
after delete on public.product_market_offers
for each row execute function private.maintain_catalog_publish_invariant();

create trigger product_media_preserve_publish_invariant_update
after update of product_id, is_primary on public.product_media
for each row
when (
  old.product_id is distinct from new.product_id
  or old.is_primary is distinct from new.is_primary
)
execute function private.maintain_catalog_publish_invariant();

create trigger product_media_preserve_publish_invariant_delete
after delete on public.product_media
for each row execute function private.maintain_catalog_publish_invariant();

create trigger product_digital_assets_preserve_publish_invariant_update
after update of product_id, is_private, content_type on public.product_digital_assets
for each row
when (
  old.product_id is distinct from new.product_id
  or old.is_private is distinct from new.is_private
  or old.content_type is distinct from new.content_type
)
execute function private.maintain_catalog_publish_invariant();

create trigger product_digital_assets_preserve_publish_invariant_delete
after delete on public.product_digital_assets
for each row execute function private.maintain_catalog_publish_invariant();

create trigger product_variants_preserve_publish_invariant_update
after update of product_id on public.product_variants
for each row
when (old.product_id is distinct from new.product_id)
execute function private.maintain_catalog_publish_invariant();

create trigger product_variants_preserve_publish_invariant_insert
after insert on public.product_variants
for each row execute function private.maintain_catalog_publish_invariant();

create trigger product_variants_preserve_publish_invariant_delete
after delete on public.product_variants
for each row execute function private.maintain_catalog_publish_invariant();

create trigger inventory_records_preserve_publish_invariant_update
after update of product_id, variant_id on public.inventory_records
for each row
when (
  old.product_id is distinct from new.product_id
  or old.variant_id is distinct from new.variant_id
)
execute function private.maintain_catalog_publish_invariant();

create trigger inventory_records_preserve_publish_invariant_delete
after delete on public.inventory_records
for each row execute function private.maintain_catalog_publish_invariant();

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
  expected_discount bigint;
begin
  if coalesce(p_payload #>> '{acceptedQuote,discount,amountMinor}', '') !~ '^[0-9]+$' then
    return false;
  end if;
  expected_discount := (p_payload #>> '{acceptedQuote,discount,amountMinor}')::bigint;

  if expected_discount = 0 then
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload #> '{acceptedQuote,lines}', '[]'::jsonb)) line
      where coalesce(line ->> 'discountAllocationMinor', '') !~ '^[0-9]+$'
         or (line ->> 'discountAllocationMinor')::bigint <> 0
    ) then
      return false;
    end if;
  elsif nullif(btrim(coalesce(p_payload ->> 'discountCode', '')), '') is null then
    return false;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_payload #> '{acceptedQuote,lines}', '[]'::jsonb)) line
    join public.products p on p.id = (line ->> 'productId')::uuid
    where p.product_type = 'pdf_pattern'
      and not exists (
        select 1
        from public.product_digital_assets pda
        where pda.product_id = p.id
          and pda.is_private
          and pda.content_type = 'application/pdf'
      )
  ) then
    return false;
  end if;

  return private.checkout_commercial_quote_is_current_v1(p_payload, p_actor_user_id);
exception when others then
  return false;
end;
$$;

alter function private.checkout_commercial_quote_is_current(jsonb, uuid) owner to postgres;
revoke all on function private.checkout_commercial_quote_is_current(jsonb, uuid) from public, anon, authenticated;
