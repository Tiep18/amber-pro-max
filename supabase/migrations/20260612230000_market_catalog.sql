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
