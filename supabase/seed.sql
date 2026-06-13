insert into public.categories (id)
values ('51000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.category_translations (
  category_id, locale, slug, name, description, seo_title, seo_description,
  social_image_bucket, social_image_path
)
values
  ('51000000-0000-0000-0000-000000000001', 'vi', 'gau-bong', 'Gau bong', 'Thu bong moc tay.', 'Gau bong handmade', 'Gau bong handmade.', 'product-media', 'seed/category-vi.jpg'),
  ('51000000-0000-0000-0000-000000000001', 'en', 'stuffed-animals', 'Stuffed animals', 'Hand-crocheted stuffed animals.', 'Stuffed animals', 'Handmade stuffed animals.', 'product-media', 'seed/category-en.jpg')
on conflict do nothing;

insert into public.collections (id)
values ('52000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.collection_translations (
  collection_id, locale, slug, name, description, seo_title, seo_description,
  social_image_bucket, social_image_path
)
values
  ('52000000-0000-0000-0000-000000000001', 'vi', 'qua-tang', 'Qua tang', 'Qua tang moc tay.', 'Qua tang handmade', 'Qua tang handmade.', 'product-media', 'seed/collection-vi.jpg'),
  ('52000000-0000-0000-0000-000000000001', 'en', 'gifts', 'Gifts', 'Gift-ready crochet pieces.', 'Handmade gifts', 'Handmade crochet gifts.', 'product-media', 'seed/collection-en.jpg')
on conflict do nothing;

insert into public.products (id, product_type, status, published_at)
values
  ('50000000-0000-0000-0000-000000000001', 'pdf_pattern', 'published', '2026-01-01T00:00:00Z'),
  ('50000000-0000-0000-0000-000000000002', 'physical_finished', 'published', '2026-01-02T00:00:00Z'),
  ('50000000-0000-0000-0000-000000000003', 'physical_finished', 'published', '2026-01-03T00:00:00Z')
on conflict do nothing;

insert into public.product_translations (
  product_id, locale, slug, title, description, specifications,
  seo_title, seo_description, social_image_bucket, social_image_path
)
values
  ('50000000-0000-0000-0000-000000000001', 'vi', 'mau-gau-vn', 'Mau gau Viet Nam', 'Mau PDF chi ban tai Viet Nam.', '{"difficulty":"easy","file":"PDF","languages":["vi","en"]}', 'Mau gau Viet Nam', 'Tai mau gau PDF.', 'product-media', 'seed/vn-pattern.jpg'),
  ('50000000-0000-0000-0000-000000000001', 'en', 'vn-bear-pattern', 'VN bear pattern', 'Vietnam-only PDF pattern.', '{"difficulty":"easy","file":"PDF","languages":["vi","en"]}', 'VN bear pattern', 'Download the VN bear pattern.', 'product-media', 'seed/vn-pattern.jpg'),
  ('50000000-0000-0000-0000-000000000002', 'vi', 'gau-quoc-te', 'Gau quoc te', 'Gau chi ban quoc te.', '{}', 'Gau quoc te', 'Gau handmade cho khach quoc te.', 'product-media', 'seed/intl-bear.jpg'),
  ('50000000-0000-0000-0000-000000000002', 'en', 'intl-bear', 'International bear', 'International-only handmade bear.', '{}', 'International bear', 'Shop the international handmade bear.', 'product-media', 'seed/intl-bear.jpg'),
  ('50000000-0000-0000-0000-000000000003', 'vi', 'gau-ca-hai', 'Gau ca hai thi truong', 'Gau ban ca hai thi truong.', '{}', 'Gau ca hai thi truong', 'Gau handmade ban ca hai thi truong.', 'product-media', 'seed/both-bear.jpg'),
  ('50000000-0000-0000-0000-000000000003', 'en', 'both-market-bear', 'Both-market bear', 'Bear sold in both markets.', '{}', 'Both-market bear', 'Shop the bear in your market.', 'product-media', 'seed/both-bear.jpg')
on conflict do nothing;

insert into public.product_media (
  id, product_id, bucket_id, object_path, alt_text_vi, alt_text_en, display_order, is_primary
)
values
  ('53000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'product-media', 'seed/vn-pattern.jpg', 'Mau gau Viet Nam', 'VN bear pattern', 0, true),
  ('53000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'product-media', 'seed/intl-bear.jpg', 'Gau quoc te', 'International bear', 0, true),
  ('53000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'product-media', 'seed/both-bear.jpg', 'Gau ca hai thi truong', 'Both-market bear', 0, true)
on conflict do nothing;

insert into public.product_digital_assets (product_id, bucket_id, object_path, file_name, byte_size)
values ('50000000-0000-0000-0000-000000000001', 'pattern-pdfs', 'seed/private/vn-pattern.pdf', 'vn-pattern.pdf', 1024)
on conflict do nothing;

insert into public.product_market_offers (product_id, market_code, enabled, currency_code, price_minor)
values
  ('50000000-0000-0000-0000-000000000001', 'vn', true, 'VND', 125000),
  ('50000000-0000-0000-0000-000000000002', 'intl', true, 'USD', 2400),
  ('50000000-0000-0000-0000-000000000003', 'vn', true, 'VND', 320000),
  ('50000000-0000-0000-0000-000000000003', 'intl', true, 'USD', 2800)
on conflict do nothing;

insert into public.product_categories (product_id, category_id)
values
  ('50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.collection_products (collection_id, product_id, display_order)
values
  ('52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 1),
  ('52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 2),
  ('52000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 3)
on conflict do nothing;

insert into public.inventory_records (product_id, quantity_on_hand)
values ('50000000-0000-0000-0000-000000000002', 0)
on conflict do nothing;

insert into public.product_variants (id, product_id, sku, attributes, display_order)
values
  ('54000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'BOTH-SMALL', '{"size":"small"}', 1),
  ('54000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', 'BOTH-LARGE', '{"size":"large"}', 2)
on conflict do nothing;

insert into public.inventory_records (variant_id, quantity_on_hand)
values
  ('54000000-0000-0000-0000-000000000001', 4),
  ('54000000-0000-0000-0000-000000000002', 0)
on conflict do nothing;

insert into public.variant_market_offers (variant_id, market_code, enabled, currency_code, price_minor)
values
  ('54000000-0000-0000-0000-000000000001', 'intl', true, 'USD', 3100),
  ('54000000-0000-0000-0000-000000000002', 'intl', true, 'USD', 3300)
on conflict do nothing;
