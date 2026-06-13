alter table public.product_variants
add column display_order integer not null default 0 check (display_order >= 0);

create index product_variants_product_display_order_idx
on public.product_variants (product_id, display_order, sku);
