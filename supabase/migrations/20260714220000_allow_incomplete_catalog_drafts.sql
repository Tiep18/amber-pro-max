-- Allow incomplete catalog drafts while keeping publish eligibility authoritative.

alter table public.product_translations
  alter column slug drop not null;

alter table public.product_translations
  drop constraint if exists product_translations_title_check;

alter table public.product_market_offers
  drop constraint if exists product_market_offers_check1;

create or replace function public.catalog_publish_issues(target_product_id uuid)
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
  if coalesce(auth.role(), '') not in ('', 'service_role')
    and not private.is_admin() then
    raise no_data_found using message = 'catalog product not found';
  end if;

  return query
  select *
  from private.catalog_publish_issues_v1(target_product_id)

  union all

  select
    'missing_translation'::text,
    pt.locale,
    null::text,
    'localized title is required'::text
  from public.product_translations pt
  where pt.product_id = target_product_id
    and length(btrim(pt.title)) = 0

  union all

  select
    'missing_slug'::text,
    pt.locale,
    null::text,
    'localized slug is required'::text
  from public.product_translations pt
  where pt.product_id = target_product_id
    and (pt.slug is null or length(btrim(pt.slug)) = 0)

  union all

  select
    'invalid_market_offer'::text,
    null::text,
    pmo.market_code,
    'enabled market offer requires a price'::text
  from public.product_market_offers pmo
  where pmo.product_id = target_product_id
    and pmo.enabled
    and pmo.price_minor is null

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

drop trigger if exists product_translations_preserve_publish_invariant_update
  on public.product_translations;
create trigger product_translations_preserve_publish_invariant_update
after update of product_id, locale, title, slug, seo_title, seo_description,
  social_image_bucket, social_image_path
on public.product_translations
for each row execute function private.maintain_catalog_publish_invariant();

drop trigger if exists product_market_offers_preserve_publish_invariant_insert
  on public.product_market_offers;
create trigger product_market_offers_preserve_publish_invariant_insert
after insert on public.product_market_offers
for each row
when (new.enabled and new.price_minor is null)
execute function private.maintain_catalog_publish_invariant();

drop trigger if exists product_market_offers_preserve_publish_invariant_update
  on public.product_market_offers;
create trigger product_market_offers_preserve_publish_invariant_update
after update of product_id, market_code, enabled, price_minor
on public.product_market_offers
for each row
when (
  old.product_id is distinct from new.product_id
  or old.market_code is distinct from new.market_code
  or old.enabled is distinct from new.enabled
  or (old.price_minor is null) is distinct from (new.price_minor is null)
)
execute function private.maintain_catalog_publish_invariant();
