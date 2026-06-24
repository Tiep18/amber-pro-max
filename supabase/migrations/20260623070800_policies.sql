create table public.policy_pages (
  id uuid primary key default gen_random_uuid(),
  policy_kind text not null unique check (policy_kind in ('privacy', 'terms_of_sale', 'returns', 'digital_downloads')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'published' and published_at is not null) or status <> 'published')
);

create table public.policy_page_translations (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policy_pages(id) on delete cascade,
  locale text not null check (locale in ('vi', 'en')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) > 0),
  summary text not null default '',
  body text not null default '',
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  updated_at timestamptz not null default now(),
  unique (policy_id, locale),
  unique (locale, slug),
  check (
    (social_image_bucket is null and social_image_path is null)
    or (
      length(btrim(social_image_bucket)) > 0
      and length(btrim(social_image_path)) > 0
    )
  )
);

alter table public.policy_pages enable row level security;
alter table public.policy_page_translations enable row level security;

revoke all on table public.policy_pages from anon, authenticated;
revoke all on table public.policy_page_translations from anon, authenticated;

grant select, insert, update, delete on table public.policy_pages to authenticated, service_role;
grant select, insert, update, delete on table public.policy_page_translations to authenticated, service_role;

create policy policy_pages_admin_all on public.policy_pages
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy policy_page_translations_admin_all on public.policy_page_translations
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create or replace function public.policy_publish_issues(target_policy_id uuid)
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
  translation_row public.policy_page_translations%rowtype;
begin
  perform 1 from public.policy_pages where id = target_policy_id;
  if not found then
    raise no_data_found using message = 'policy page not found';
  end if;

  foreach required_locale in array array['vi', 'en']
  loop
    select *
    into translation_row
    from public.policy_page_translations
    where policy_id = target_policy_id
      and policy_page_translations.locale = required_locale;

    if not found then
      return query select 'missing_translation'::text, required_locale, 'translation is required'::text;
      continue;
    end if;

    if length(btrim(translation_row.slug)) = 0 then
      return query select 'missing_slug'::text, required_locale, 'slug is required'::text;
    end if;
    if length(btrim(translation_row.title)) = 0 then
      return query select 'missing_title'::text, required_locale, 'title is required'::text;
    end if;
    if length(btrim(translation_row.summary)) = 0 then
      return query select 'missing_summary'::text, required_locale, 'summary is required'::text;
    end if;
    if length(btrim(translation_row.body)) = 0 then
      return query select 'missing_body'::text, required_locale, 'body is required'::text;
    end if;
    if translation_row.seo_title is null or length(btrim(translation_row.seo_title)) = 0 then
      return query select 'missing_seo_title'::text, required_locale, 'seo title is required'::text;
    end if;
    if translation_row.seo_description is null or length(btrim(translation_row.seo_description)) = 0 then
      return query select 'missing_seo_description'::text, required_locale, 'seo description is required'::text;
    end if;
    if translation_row.social_image_bucket is null or translation_row.social_image_path is null then
      return query select 'missing_social_image'::text, required_locale, 'social image is required'::text;
    end if;
  end loop;
end;
$$;

create or replace function public.publish_policy_page(target_policy_id uuid)
returns table (
  published boolean
)
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if exists (select 1 from public.policy_publish_issues(target_policy_id)) then
    return query select false;
    return;
  end if;

  update public.policy_pages
  set status = 'published',
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = target_policy_id;

  return query select found;
end;
$$;

create or replace function public.get_published_policy_page_by_slug(
  target_locale text,
  target_slug text
)
returns table (
  policy_id uuid,
  policy_kind text,
  locale text,
  slug text,
  title text,
  summary text,
  body text,
  seo_title text,
  seo_description text,
  social_image_bucket text,
  social_image_path text,
  published_at timestamptz,
  localized_slugs jsonb
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    pp.id,
    pp.policy_kind,
    ppt.locale,
    ppt.slug,
    ppt.title,
    ppt.summary,
    ppt.body,
    ppt.seo_title,
    ppt.seo_description,
    ppt.social_image_bucket,
    ppt.social_image_path,
    pp.published_at,
    (
      select jsonb_object_agg(all_ppt.locale, all_ppt.slug)
      from public.policy_page_translations all_ppt
      where all_ppt.policy_id = pp.id
    ) as localized_slugs
  from public.policy_pages pp
  join public.policy_page_translations ppt on ppt.policy_id = pp.id
  where pp.status = 'published'
    and pp.published_at <= now()
    and ppt.locale = target_locale
    and ppt.slug = target_slug
$$;

revoke all on function public.policy_publish_issues(uuid) from public, anon, authenticated;
grant execute on function public.policy_publish_issues(uuid) to authenticated;
revoke all on function public.publish_policy_page(uuid) from public, anon, authenticated;
grant execute on function public.publish_policy_page(uuid) to authenticated;
revoke all on function public.get_published_policy_page_by_slug(text, text) from public;
grant execute on function public.get_published_policy_page_by_slug(text, text) to anon, authenticated;
