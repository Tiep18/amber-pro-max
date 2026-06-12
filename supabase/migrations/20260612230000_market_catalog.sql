create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_type text not null
    check (product_type in ('pdf_pattern', 'physical_finished')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'published' and published_at is not null)
    or status <> 'published'
  )
);

create table public.product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) > 0),
  description text not null,
  specifications jsonb not null default '{}'::jsonb
    check (jsonb_typeof(specifications) = 'object'),
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, locale),
  unique (locale, slug),
  check (
    (social_image_bucket is null and social_image_path is null)
    or (
      length(btrim(social_image_bucket)) > 0
      and length(btrim(social_image_path)) > 0
    )
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  unique (category_id, locale),
  unique (locale, slug),
  check (
    (social_image_bucket is null and social_image_path is null)
    or (
      length(btrim(social_image_bucket)) > 0
      and length(btrim(social_image_path)) > 0
    )
  )
);

create table public.techniques (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.technique_translations (
  id uuid primary key default gen_random_uuid(),
  technique_id uuid not null references public.techniques(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  unique (technique_id, locale)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tag_translations (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  name text not null check (length(btrim(name)) > 0),
  unique (tag_id, locale)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_translations (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  unique (collection_id, locale),
  unique (locale, slug),
  check (
    (social_image_bucket is null and social_image_path is null)
    or (
      length(btrim(social_image_bucket)) > 0
      and length(btrim(social_image_path)) > 0
    )
  )
);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table public.product_techniques (
  product_id uuid not null references public.products(id) on delete cascade,
  technique_id uuid not null references public.techniques(id) on delete cascade,
  primary key (product_id, technique_id)
);

create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  display_order integer not null check (display_order >= 0),
  primary key (collection_id, product_id),
  unique (collection_id, display_order)
);

create table public.product_market_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  market_code text not null check (market_code in ('vn', 'intl')),
  enabled boolean not null default false,
  currency_code text not null,
  price_minor bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, market_code),
  check (
    (market_code = 'vn' and currency_code = 'VND')
    or (market_code = 'intl' and currency_code = 'USD')
  ),
  check (price_minor is null or price_minor >= 0),
  check (not enabled or price_minor is not null)
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  bucket_id text not null check (length(btrim(bucket_id)) > 0),
  object_path text not null check (length(btrim(object_path)) > 0),
  alt_text_vi text not null default '',
  alt_text_en text not null default '',
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path),
  unique (product_id, display_order)
);

create unique index product_media_one_primary_idx
on public.product_media (product_id)
where is_primary;

create table public.product_digital_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  bucket_id text not null check (length(btrim(bucket_id)) > 0),
  object_path text not null check (length(btrim(object_path)) > 0),
  file_name text not null check (lower(file_name) like '%.pdf'),
  content_type text not null default 'application/pdf'
    check (content_type = 'application/pdf'),
  byte_size bigint not null check (byte_size > 0),
  checksum_sha256 text
    check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  is_private boolean not null default true check (is_private),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

create index products_status_type_idx
on public.products (status, product_type);

create index product_translations_locale_slug_idx
on public.product_translations (locale, slug);

create index category_translations_locale_slug_idx
on public.category_translations (locale, slug);

create index collection_translations_locale_slug_idx
on public.collection_translations (locale, slug);

create index product_market_offers_market_idx
on public.product_market_offers (market_code, enabled, product_id);

create index product_categories_category_idx
on public.product_categories (category_id, product_id);

create index product_techniques_technique_idx
on public.product_techniques (technique_id, product_id);

create index product_tags_tag_idx
on public.product_tags (tag_id, product_id);

create index collection_products_product_idx
on public.collection_products (product_id, collection_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique check (length(btrim(sku)) > 0),
  attributes jsonb not null
    check (
      jsonb_typeof(attributes) = 'object'
      and attributes <> '{}'::jsonb
    ),
  media_id uuid references public.product_media(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_variants_product_idx
on public.product_variants (product_id);

create table public.variant_market_offers (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  market_code text not null check (market_code in ('vn', 'intl')),
  enabled boolean not null default true,
  currency_code text not null,
  price_minor bigint not null check (price_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, market_code),
  check (
    (market_code = 'vn' and currency_code = 'VND')
    or (market_code = 'intl' and currency_code = 'USD')
  )
);

create index variant_market_offers_market_idx
on public.variant_market_offers (market_code, enabled, variant_id);

create table public.inventory_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((product_id is null) <> (variant_id is null)),
  unique (product_id),
  unique (variant_id)
);

create or replace function private.enforce_product_variant_owner()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
declare
  owner_type text;
  media_product_id uuid;
begin
  select product_type
  into owner_type
  from public.products
  where id = new.product_id;

  if owner_type <> 'physical_finished' then
    raise exception 'only physical products can own variants'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.inventory_records
    where product_id = new.product_id
  ) then
    raise exception 'remove product-level inventory before adding variants'
      using errcode = '23514';
  end if;

  if new.media_id is not null then
    select product_id
    into media_product_id
    from public.product_media
    where id = new.media_id;

    if media_product_id is distinct from new.product_id then
      raise exception 'variant media must belong to the same product'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger product_variants_enforce_owner
before insert or update on public.product_variants
for each row execute function private.enforce_product_variant_owner();

create or replace function private.enforce_inventory_owner()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
declare
  owner_product_id uuid;
  owner_type text;
begin
  if new.product_id is not null then
    owner_product_id := new.product_id;

    select product_type
    into owner_type
    from public.products
    where id = owner_product_id;

    if owner_type <> 'physical_finished' then
      raise exception 'only physical products can own inventory'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from public.product_variants
      where product_id = owner_product_id
    ) then
      raise exception 'products with variants require variant-level inventory'
        using errcode = '23514';
    end if;
  else
    select product_id
    into owner_product_id
    from public.product_variants
    where id = new.variant_id;

    select product_type
    into owner_type
    from public.products
    where id = owner_product_id;

    if owner_type <> 'physical_finished' then
      raise exception 'only physical variants can own inventory'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from public.inventory_records
      where product_id = owner_product_id
        and id <> new.id
    ) then
      raise exception 'variant inventory cannot coexist with product inventory'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger inventory_records_enforce_owner
before insert or update on public.inventory_records
for each row execute function private.enforce_inventory_owner();

create or replace function private.enforce_digital_asset_owner()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
declare
  owner_type text;
begin
  select product_type
  into owner_type
  from public.products
  where id = new.product_id;

  if owner_type <> 'pdf_pattern' then
    raise exception 'only PDF pattern products can own digital assets'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger product_digital_assets_enforce_owner
before insert or update on public.product_digital_assets
for each row execute function private.enforce_digital_asset_owner();

revoke all on function private.enforce_product_variant_owner() from public;
revoke all on function private.enforce_product_variant_owner() from anon;
revoke all on function private.enforce_product_variant_owner() from authenticated;
revoke all on function private.enforce_inventory_owner() from public;
revoke all on function private.enforce_inventory_owner() from anon;
revoke all on function private.enforce_inventory_owner() from authenticated;
revoke all on function private.enforce_digital_asset_owner() from public;
revoke all on function private.enforce_digital_asset_owner() from anon;
revoke all on function private.enforce_digital_asset_owner() from authenticated;

alter table public.products enable row level security;
alter table public.product_translations enable row level security;
alter table public.categories enable row level security;
alter table public.category_translations enable row level security;
alter table public.techniques enable row level security;
alter table public.technique_translations enable row level security;
alter table public.tags enable row level security;
alter table public.tag_translations enable row level security;
alter table public.collections enable row level security;
alter table public.collection_translations enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_techniques enable row level security;
alter table public.product_tags enable row level security;
alter table public.collection_products enable row level security;
alter table public.product_market_offers enable row level security;
alter table public.product_media enable row level security;
alter table public.product_digital_assets enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_market_offers enable row level security;
alter table public.inventory_records enable row level security;

revoke all on table public.products from anon, authenticated;
revoke all on table public.product_translations from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.category_translations from anon, authenticated;
revoke all on table public.techniques from anon, authenticated;
revoke all on table public.technique_translations from anon, authenticated;
revoke all on table public.tags from anon, authenticated;
revoke all on table public.tag_translations from anon, authenticated;
revoke all on table public.collections from anon, authenticated;
revoke all on table public.collection_translations from anon, authenticated;
revoke all on table public.product_categories from anon, authenticated;
revoke all on table public.product_techniques from anon, authenticated;
revoke all on table public.product_tags from anon, authenticated;
revoke all on table public.collection_products from anon, authenticated;
revoke all on table public.product_market_offers from anon, authenticated;
revoke all on table public.product_media from anon, authenticated;
revoke all on table public.product_digital_assets from anon, authenticated;
revoke all on table public.product_variants from anon, authenticated;
revoke all on table public.variant_market_offers from anon, authenticated;
revoke all on table public.inventory_records from anon, authenticated;

grant select, insert, update, delete on table public.products to authenticated;
grant select, insert, update, delete on table public.product_translations to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.category_translations to authenticated;
grant select, insert, update, delete on table public.techniques to authenticated;
grant select, insert, update, delete on table public.technique_translations to authenticated;
grant select, insert, update, delete on table public.tags to authenticated;
grant select, insert, update, delete on table public.tag_translations to authenticated;
grant select, insert, update, delete on table public.collections to authenticated;
grant select, insert, update, delete on table public.collection_translations to authenticated;
grant select, insert, update, delete on table public.product_categories to authenticated;
grant select, insert, update, delete on table public.product_techniques to authenticated;
grant select, insert, update, delete on table public.product_tags to authenticated;
grant select, insert, update, delete on table public.collection_products to authenticated;
grant select, insert, update, delete on table public.product_market_offers to authenticated;
grant select, insert, update, delete on table public.product_media to authenticated;
grant select, insert, update, delete on table public.product_digital_assets to authenticated;
grant select, insert, update, delete on table public.product_variants to authenticated;
grant select, insert, update, delete on table public.variant_market_offers to authenticated;
grant select, insert, update, delete on table public.inventory_records to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'products',
    'product_translations',
    'categories',
    'category_translations',
    'techniques',
    'technique_translations',
    'tags',
    'tag_translations',
    'collections',
    'collection_translations',
    'product_categories',
    'product_techniques',
    'product_tags',
    'collection_products',
    'product_market_offers',
    'product_media',
    'product_digital_assets',
    'product_variants',
    'variant_market_offers',
    'inventory_records'
  ]
  loop
    execute format(
      'create policy catalog_admin_all on public.%I
       for all to authenticated
       using (private.is_admin())
       with check (private.is_admin())',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.catalog_publish_issues(target_product_id uuid)
returns table (
  issue_code text,
  locale text,
  market_code text,
  detail text
)
language plpgsql
stable
set search_path = public, private, pg_temp
as $$
declare
  target_type text;
  required_locale text;
  translation_row public.product_translations%rowtype;
begin
  select product_type
  into target_type
  from public.products
  where id = target_product_id;

  if not found then
    raise no_data_found using message = 'catalog product not found';
  end if;

  foreach required_locale in array array['vi', 'en']
  loop
    select *
    into translation_row
    from public.product_translations
    where product_id = target_product_id
      and product_translations.locale = required_locale;

    if not found then
      return query
      select
        'missing_translation'::text,
        required_locale,
        null::text,
        'translation is required'::text;
    else
      if length(btrim(translation_row.slug)) = 0 then
        return query
        select
          'missing_slug'::text,
          required_locale,
          null::text,
          'localized slug is required'::text;
      end if;

      if translation_row.seo_title is null
        or length(btrim(translation_row.seo_title)) = 0 then
        return query
        select
          'missing_seo_title'::text,
          required_locale,
          null::text,
          'localized SEO title is required'::text;
      end if;

      if translation_row.seo_description is null
        or length(btrim(translation_row.seo_description)) = 0 then
        return query
        select
          'missing_seo_description'::text,
          required_locale,
          null::text,
          'localized SEO description is required'::text;
      end if;

      if translation_row.social_image_bucket is null
        or translation_row.social_image_path is null then
        return query
        select
          'missing_social_image'::text,
          required_locale,
          null::text,
          'localized social image is required'::text;
      end if;
    end if;
  end loop;

  if not exists (
    select 1
    from public.product_media
    where product_id = target_product_id
      and is_primary
  ) then
    return query
    select
      'missing_primary_image'::text,
      null::text,
      null::text,
      'primary product image is required'::text;
  end if;

  if not exists (
    select 1
    from public.product_market_offers
    where product_id = target_product_id
      and enabled
      and price_minor is not null
  ) then
    return query
    select
      'missing_market_offer'::text,
      null::text,
      null::text,
      'at least one enabled market offer is required'::text;
  end if;

  if target_type = 'pdf_pattern'
    and not exists (
      select 1
      from public.product_digital_assets
      where product_id = target_product_id
        and is_private
        and content_type = 'application/pdf'
    ) then
    return query
    select
      'missing_private_pdf'::text,
      null::text,
      null::text,
      'private PDF metadata is required'::text;
  end if;

  if target_type = 'physical_finished' then
    if exists (
      select 1
      from public.product_variants
      where product_id = target_product_id
    ) then
      if exists (
        select 1
        from public.product_variants
        left join public.inventory_records
          on inventory_records.variant_id = product_variants.id
        where product_variants.product_id = target_product_id
          and inventory_records.id is null
      ) or exists (
        select 1
        from public.inventory_records
        where product_id = target_product_id
      ) then
        return query
        select
          'invalid_inventory'::text,
          null::text,
          null::text,
          'every variant requires variant-level inventory'::text;
      end if;
    elsif not exists (
      select 1
      from public.inventory_records
      where product_id = target_product_id
    ) then
      return query
      select
        'invalid_inventory'::text,
        null::text,
        null::text,
        'non-variant physical products require product-level inventory'::text;
    end if;
  end if;
end;
$$;

create or replace function public.publish_catalog_product(target_product_id uuid)
returns table (published boolean)
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  issue_count integer;
begin
  perform 1
  from public.products
  where id = target_product_id
  for update;

  if not found then
    raise no_data_found using message = 'catalog product not found';
  end if;

  select count(*)::integer
  into issue_count
  from public.catalog_publish_issues(target_product_id);

  if issue_count > 0 then
    return query select false;
    return;
  end if;

  update public.products
  set
    status = 'published',
    published_at = coalesce(published_at, now()),
    updated_at = now()
  where id = target_product_id;

  return query select true;
end;
$$;

revoke all on function public.catalog_publish_issues(uuid) from public;
revoke all on function public.catalog_publish_issues(uuid) from anon;
revoke all on function public.catalog_publish_issues(uuid) from authenticated;
grant execute on function public.catalog_publish_issues(uuid) to authenticated;

revoke all on function public.publish_catalog_product(uuid) from public;
revoke all on function public.publish_catalog_product(uuid) from anon;
revoke all on function public.publish_catalog_product(uuid) from authenticated;
grant execute on function public.publish_catalog_product(uuid) to authenticated;
