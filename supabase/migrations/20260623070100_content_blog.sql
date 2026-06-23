create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blog_category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.blog_categories(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  unique (category_id, locale),
  unique (locale, slug)
);

create table public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blog_tag_translations (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  unique (tag_id, locale),
  unique (locale, slug)
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  category_id uuid references public.blog_categories(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'published' and published_at is not null)
    or status <> 'published'
  )
);

create table public.blog_post_translations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  body text not null default '',
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, locale),
  unique (locale, slug),
  check (
    (social_image_bucket is null and social_image_path is null)
    or (
      length(btrim(social_image_bucket)) > 0
      and length(btrim(social_image_path)) > 0
    )
  )
);

create table public.blog_post_tags (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table public.blog_related_products (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  display_order integer not null default 0 check (display_order >= 0),
  primary key (post_id, product_id),
  unique (post_id, display_order)
);

alter table public.blog_categories enable row level security;
alter table public.blog_category_translations enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_tag_translations enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_translations enable row level security;
alter table public.blog_post_tags enable row level security;
alter table public.blog_related_products enable row level security;

revoke all on table public.blog_categories from anon, authenticated;
revoke all on table public.blog_category_translations from anon, authenticated;
revoke all on table public.blog_tags from anon, authenticated;
revoke all on table public.blog_tag_translations from anon, authenticated;
revoke all on table public.blog_posts from anon, authenticated;
revoke all on table public.blog_post_translations from anon, authenticated;
revoke all on table public.blog_post_tags from anon, authenticated;
revoke all on table public.blog_related_products from anon, authenticated;

grant select, insert, update, delete on table public.blog_categories to authenticated;
grant select, insert, update, delete on table public.blog_category_translations to authenticated;
grant select, insert, update, delete on table public.blog_tags to authenticated;
grant select, insert, update, delete on table public.blog_tag_translations to authenticated;
grant select, insert, update, delete on table public.blog_posts to authenticated;
grant select, insert, update, delete on table public.blog_post_translations to authenticated;
grant select, insert, update, delete on table public.blog_post_tags to authenticated;
grant select, insert, update, delete on table public.blog_related_products to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'blog_categories',
    'blog_category_translations',
    'blog_tags',
    'blog_tag_translations',
    'blog_posts',
    'blog_post_translations',
    'blog_post_tags',
    'blog_related_products'
  ]
  loop
    execute format(
      'create policy blog_admin_all on public.%I
       for all to authenticated
       using (private.is_admin())
       with check (private.is_admin())',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.blog_publish_issues(target_post_id uuid)
returns table (
  issue_code text,
  locale text,
  detail text
)
language plpgsql
stable
set search_path = public, private, pg_temp
as $$
declare
  required_locale text;
  translation_row public.blog_post_translations%rowtype;
begin
  perform 1
  from public.blog_posts
  where id = target_post_id;

  if not found then
    raise no_data_found using message = 'blog post not found';
  end if;

  if not exists (
    select 1
    from public.blog_posts
    where id = target_post_id
      and category_id is not null
  ) then
    return query
    select 'missing_category'::text, null::text, 'category is required'::text;
  end if;

  foreach required_locale in array array['vi', 'en']
  loop
    select *
    into translation_row
    from public.blog_post_translations
    where post_id = target_post_id
      and blog_post_translations.locale = required_locale;

    if not found then
      return query
      select
        'missing_translation'::text,
        required_locale,
        'translation is required'::text;
    else
      if length(btrim(translation_row.slug)) = 0 then
        return query
        select 'missing_slug'::text, required_locale, 'localized slug is required'::text;
      end if;

      if length(btrim(translation_row.title)) = 0 then
        return query
        select 'missing_title'::text, required_locale, 'localized title is required'::text;
      end if;

      if length(btrim(translation_row.description)) = 0 then
        return query
        select
          'missing_description'::text,
          required_locale,
          'localized description is required'::text;
      end if;

      if translation_row.social_image_bucket is null
        or translation_row.social_image_path is null then
        return query
        select
          'missing_social_image'::text,
          required_locale,
          'localized social image is required'::text;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.publish_blog_post(
  target_post_id uuid,
  target_published_at timestamptz default now()
)
returns table (published boolean)
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  issue_count integer;
begin
  perform 1
  from public.blog_posts
  where id = target_post_id
  for update;

  if not found then
    raise no_data_found using message = 'blog post not found';
  end if;

  select count(*)::integer
  into issue_count
  from public.blog_publish_issues(target_post_id);

  if issue_count > 0 then
    return query select false;
    return;
  end if;

  update public.blog_posts
  set
    status = 'published',
    published_at = target_published_at,
    updated_at = now()
  where id = target_post_id;

  return query select true;
end;
$$;

create or replace function public.list_published_blog_posts(target_locale text)
returns table (
  post_id uuid,
  slug text,
  title text,
  description text,
  published_at timestamptz,
  category_slug text,
  category_name text
)
language sql
stable
set search_path = public, private, pg_temp
as $$
  select
    bp.id,
    bpt.slug,
    bpt.title,
    bpt.description,
    bp.published_at,
    bct.slug,
    bct.name
  from public.blog_posts bp
  join public.blog_post_translations bpt
    on bpt.post_id = bp.id
   and bpt.locale = target_locale
  join public.blog_categories bc
    on bc.id = bp.category_id
  join public.blog_category_translations bct
    on bct.category_id = bc.id
   and bct.locale = target_locale
  where bp.status = 'published'
    and bp.published_at is not null
    and bp.published_at <= now()
  order by bp.published_at desc;
$$;

create or replace function public.get_published_blog_post_by_slug(
  target_locale text,
  target_slug text
)
returns table (
  post_id uuid,
  slug text,
  title text,
  description text,
  body text,
  published_at timestamptz,
  category_slug text,
  category_name text
)
language sql
stable
set search_path = public, private, pg_temp
as $$
  select
    bp.id,
    bpt.slug,
    bpt.title,
    bpt.description,
    bpt.body,
    bp.published_at,
    bct.slug,
    bct.name
  from public.blog_posts bp
  join public.blog_post_translations bpt
    on bpt.post_id = bp.id
   and bpt.locale = target_locale
   and bpt.slug = target_slug
  join public.blog_categories bc
    on bc.id = bp.category_id
  join public.blog_category_translations bct
    on bct.category_id = bc.id
   and bct.locale = target_locale
  where bp.status = 'published'
    and bp.published_at is not null
    and bp.published_at <= now();
$$;

revoke all on function public.blog_publish_issues(uuid) from public;
revoke all on function public.blog_publish_issues(uuid) from anon;
revoke all on function public.blog_publish_issues(uuid) from authenticated;
grant execute on function public.blog_publish_issues(uuid) to authenticated;

revoke all on function public.publish_blog_post(uuid, timestamptz) from public;
revoke all on function public.publish_blog_post(uuid, timestamptz) from anon;
revoke all on function public.publish_blog_post(uuid, timestamptz) from authenticated;
grant execute on function public.publish_blog_post(uuid, timestamptz) to authenticated;

revoke all on function public.list_published_blog_posts(text) from public;
grant execute on function public.list_published_blog_posts(text) to anon, authenticated;

revoke all on function public.get_published_blog_post_by_slug(text, text) from public;
grant execute on function public.get_published_blog_post_by_slug(text, text) to anon, authenticated;
