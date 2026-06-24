drop function if exists public.list_published_blog_posts(text);
drop function if exists public.get_published_blog_post_by_slug(text, text);

create or replace function public.list_published_blog_posts(target_locale text)
returns table (
  post_id uuid,
  slug text,
  title text,
  description text,
  published_at timestamptz,
  category_slug text,
  category_name text,
  social_image_bucket text,
  social_image_path text
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    bp.id,
    bpt.slug,
    bpt.title,
    bpt.description,
    bp.published_at,
    bct.slug,
    bct.name,
    bpt.social_image_bucket,
    bpt.social_image_path
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
  category_name text,
  social_image_bucket text,
  social_image_path text,
  localized_slugs jsonb,
  tags jsonb,
  related_products jsonb
)
language sql
stable
security definer
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
    bct.name,
    bpt.social_image_bucket,
    bpt.social_image_path,
    (
      select jsonb_object_agg(all_bpt.locale, all_bpt.slug)
      from public.blog_post_translations all_bpt
      where all_bpt.post_id = bp.id
    ) as localized_slugs,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slug', btt.slug,
            'name', btt.name
          )
          order by btt.name
        )
        from public.blog_post_tags bptag
        join public.blog_tag_translations btt
          on btt.tag_id = bptag.tag_id
         and btt.locale = target_locale
        where bptag.post_id = bp.id
      ),
      '[]'::jsonb
    ) as tags,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'productId', brp.product_id,
            'title', pt.title,
            'slug', pt.slug,
            'displayOrder', brp.display_order
          )
          order by brp.display_order
        )
        from public.blog_related_products brp
        join public.products p
          on p.id = brp.product_id
         and p.status = 'published'
        join public.product_translations pt
          on pt.product_id = brp.product_id
         and pt.locale = target_locale
        where brp.post_id = bp.id
      ),
      '[]'::jsonb
    ) as related_products
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

revoke all on function public.list_published_blog_posts(text) from public;
grant execute on function public.list_published_blog_posts(text) to anon, authenticated;
revoke all on function public.get_published_blog_post_by_slug(text, text) from public;
grant execute on function public.get_published_blog_post_by_slug(text, text) to anon, authenticated;
