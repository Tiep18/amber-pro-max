create or replace function public.admin_catalog_collection_next_orders(
  target_collection_ids uuid[]
)
returns table (
  collection_id uuid,
  next_display_order integer
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if target_collection_ids is null or cardinality(target_collection_ids) > 500 then
    raise exception 'invalid target collection ids' using errcode = '22023';
  end if;

  if exists (
    select 1
    from (
      select distinct requested_id
      from unnest(target_collection_ids) as requested(requested_id)
    ) requested
    left join public.collections collection on collection.id = requested.requested_id
    where requested.requested_id is null or collection.id is null
  ) then
    raise exception 'invalid target collection ids' using errcode = '22023';
  end if;

  return query
  with requested as (
    select distinct requested_id
    from unnest(target_collection_ids) as input(requested_id)
  )
  select
    requested.requested_id,
    coalesce(max(membership.display_order::bigint) + 1, 0)::integer
  from requested
  join public.collections collection on collection.id = requested.requested_id
  left join public.collection_products membership
    on membership.collection_id = requested.requested_id
  group by requested.requested_id
  order by requested.requested_id;
end;
$$;

revoke all on function public.admin_catalog_collection_next_orders(uuid[])
from public, anon, authenticated;
grant execute on function public.admin_catalog_collection_next_orders(uuid[])
to authenticated;
