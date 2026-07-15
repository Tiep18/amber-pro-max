create or replace function public.admin_reorder_product_media(
  p_product_id uuid,
  p_media_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  current_count integer;
  submitted_count integer;
  temporary_offset integer;
begin
  if not private.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  perform 1 from public.products where id = p_product_id for update;
  if not found then
    raise exception 'catalog product not found' using errcode = 'P2001';
  end if;

  if p_media_ids is null or array_position(p_media_ids, null) is not null then
    raise exception 'media order must contain non-null identifiers' using errcode = 'P2002';
  end if;

  perform 1
  from public.product_media
  where product_id = p_product_id
  order by id
  for update;

  select count(*) into current_count
  from public.product_media
  where product_id = p_product_id;

  submitted_count := cardinality(p_media_ids);
  if submitted_count <> current_count
    or (select count(distinct media_id) from unnest(p_media_ids) as media_id) <> submitted_count
    or exists (
      select 1 from unnest(p_media_ids) as submitted(media_id)
      left join public.product_media media
        on media.id = submitted.media_id and media.product_id = p_product_id
      where media.id is null
    ) then
    raise exception 'media order must be an exact product permutation' using errcode = 'P2003';
  end if;

  select coalesce(max(display_order), -1) + current_count + 1
  into temporary_offset
  from public.product_media
  where product_id = p_product_id;

  update public.product_media
  set display_order = display_order + temporary_offset
  where product_id = p_product_id;

  update public.product_media media
  set display_order = submitted.ordinality - 1
  from unnest(p_media_ids) with ordinality as submitted(media_id, ordinality)
  where media.id = submitted.media_id
    and media.product_id = p_product_id;
end;
$$;

revoke all on function public.admin_reorder_product_media(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_reorder_product_media(uuid, uuid[]) to authenticated;
