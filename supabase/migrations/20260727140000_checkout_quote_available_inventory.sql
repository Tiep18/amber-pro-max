-- Checkout quotes and checkout submission must use the same inventory
-- availability authority, including active unexpired reservations.

create or replace function public.get_checkout_inventory_availability(
  p_product_ids uuid[]
)
returns table (
  product_id uuid,
  variant_id uuid,
  available_quantity integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id as product_id,
    ir.variant_id,
    public.checkout_available_inventory(ir.id) as available_quantity
  from public.products p
  join public.inventory_records ir
    on ir.product_id = p.id
    or ir.variant_id in (
      select pv.id
      from public.product_variants pv
      where pv.product_id = p.id
    )
  where p.id = any(coalesce(p_product_ids, array[]::uuid[]))
    and p.status = 'published'
    and p.product_type = 'physical_finished'
    and cardinality(coalesce(p_product_ids, array[]::uuid[])) <= 100
  order by p.id, ir.variant_id nulls first;
$$;

revoke all on function public.get_checkout_inventory_availability(uuid[])
from public, anon, authenticated;
grant execute on function public.get_checkout_inventory_availability(uuid[])
to anon, authenticated;
