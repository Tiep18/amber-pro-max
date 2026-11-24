insert into public.categories (id)
values ('c0e579db-bb57-4b35-879e-11dfef9e822e')
on conflict do nothing;

insert into public.category_translations (
  category_id, locale, slug, name, description, seo_title, seo_description,
  social_image_bucket, social_image_path
)
values
  ('c0e579db-bb57-4b35-879e-11dfef9e822e', 'vi', 'gau-bong', 'Gau bong', 'Thu bong moc tay.', 'Gau bong handmade', 'Gau bong handmade.', 'product-media', 'seed/category-vi.jpg'),
  ('c0e579db-bb57-4b35-879e-11dfef9e822e', 'en', 'stuffed-animals', 'Stuffed animals', 'Hand-crocheted stuffed animals.', 'Stuffed animals', 'Handmade stuffed animals.', 'product-media', 'seed/category-en.jpg')
on conflict do nothing;

insert into public.collections (id)
values ('73b2a0a8-5659-4cd9-8905-fd4a6338aec4')
on conflict do nothing;

insert into public.collection_translations (
  collection_id, locale, slug, name, description, seo_title, seo_description,
  social_image_bucket, social_image_path
)
values
  ('73b2a0a8-5659-4cd9-8905-fd4a6338aec4', 'vi', 'qua-tang', 'Qua tang', 'Qua tang moc tay.', 'Qua tang handmade', 'Qua tang handmade.', 'product-media', 'seed/collection-vi.jpg'),
  ('73b2a0a8-5659-4cd9-8905-fd4a6338aec4', 'en', 'gifts', 'Gifts', 'Gift-ready crochet pieces.', 'Handmade gifts', 'Handmade crochet gifts.', 'product-media', 'seed/collection-en.jpg')
on conflict do nothing;

insert into public.products (id, product_type, status, published_at)
values
  ('a16b23a8-88f8-4f77-b199-9783e5a7a7a8', 'pdf_pattern', 'published', '2026-01-01T00:00:00Z'),
  ('c90377bd-042f-4d04-add5-8275549a9787', 'physical_finished', 'published', '2026-01-02T00:00:00Z'),
  ('f1d1b9fb-b691-48de-b482-5882a163d32a', 'physical_finished', 'published', '2026-01-03T00:00:00Z')
on conflict do nothing;

insert into public.product_translations (
  product_id, locale, slug, title, description, specifications,
  seo_title, seo_description, social_image_bucket, social_image_path
)
values
  ('a16b23a8-88f8-4f77-b199-9783e5a7a7a8', 'vi', 'mau-gau-vn', 'Mau gau Viet Nam', 'Mau PDF chi ban tai Viet Nam.', '{"difficulty":"easy","file":"PDF","languages":["vi","en"]}', 'Mau gau Viet Nam', 'Tai mau gau PDF.', 'product-media', 'seed/vn-pattern.jpg'),
  ('a16b23a8-88f8-4f77-b199-9783e5a7a7a8', 'en', 'vn-bear-pattern', 'VN bear pattern', 'Vietnam-only PDF pattern.', '{"difficulty":"easy","file":"PDF","languages":["vi","en"]}', 'VN bear pattern', 'Download the VN bear pattern.', 'product-media', 'seed/vn-pattern.jpg'),
  ('c90377bd-042f-4d04-add5-8275549a9787', 'vi', 'gau-quoc-te', 'Gau quoc te', 'Gau chi ban quoc te.', '{}', 'Gau quoc te', 'Gau handmade cho khach quoc te.', 'product-media', 'seed/intl-bear.jpg'),
  ('c90377bd-042f-4d04-add5-8275549a9787', 'en', 'intl-bear', 'International bear', 'International-only handmade bear.', '{}', 'International bear', 'Shop the international handmade bear.', 'product-media', 'seed/intl-bear.jpg'),
  ('f1d1b9fb-b691-48de-b482-5882a163d32a', 'vi', 'gau-ca-hai', 'Gau ca hai thi truong', 'Gau ban ca hai thi truong.', '{}', 'Gau ca hai thi truong', 'Gau handmade ban ca hai thi truong.', 'product-media', 'seed/both-bear.jpg'),
  ('f1d1b9fb-b691-48de-b482-5882a163d32a', 'en', 'both-market-bear', 'Both-market bear', 'Bear sold in both markets.', '{}', 'Both-market bear', 'Shop the bear in your market.', 'product-media', 'seed/both-bear.jpg')
on conflict do nothing;

insert into public.product_media (
  id, product_id, bucket_id, object_path, alt_text_vi, alt_text_en, display_order, is_primary
)
values
  ('fe938575-3d83-462b-ba84-6c4e19af9bee', 'a16b23a8-88f8-4f77-b199-9783e5a7a7a8', 'product-media', 'seed/vn-pattern.jpg', 'Mau gau Viet Nam', 'VN bear pattern', 0, true),
  ('085c426f-0df4-46c0-bca4-7f3edc819333', 'c90377bd-042f-4d04-add5-8275549a9787', 'product-media', 'seed/intl-bear.jpg', 'Gau quoc te', 'International bear', 0, true),
  ('ee018113-e95c-461d-a544-2933bf5fd6c3', 'f1d1b9fb-b691-48de-b482-5882a163d32a', 'product-media', 'seed/both-bear.jpg', 'Gau ca hai thi truong', 'Both-market bear', 0, true)
on conflict do nothing;

insert into public.product_digital_assets (product_id, bucket_id, object_path, file_name, byte_size)
values ('a16b23a8-88f8-4f77-b199-9783e5a7a7a8', 'pattern-pdfs', 'seed/private/vn-pattern.pdf', 'vn-pattern.pdf', 1024)
on conflict do nothing;

insert into public.product_market_offers (product_id, market_code, enabled, currency_code, price_minor)
values
  ('a16b23a8-88f8-4f77-b199-9783e5a7a7a8', 'vn', true, 'VND', 125000),
  ('c90377bd-042f-4d04-add5-8275549a9787', 'intl', true, 'USD', 2400),
  ('f1d1b9fb-b691-48de-b482-5882a163d32a', 'vn', true, 'VND', 320000),
  ('f1d1b9fb-b691-48de-b482-5882a163d32a', 'intl', true, 'USD', 2800)
on conflict do nothing;

insert into public.product_categories (product_id, category_id)
values
  ('a16b23a8-88f8-4f77-b199-9783e5a7a7a8', 'c0e579db-bb57-4b35-879e-11dfef9e822e'),
  ('c90377bd-042f-4d04-add5-8275549a9787', 'c0e579db-bb57-4b35-879e-11dfef9e822e'),
  ('f1d1b9fb-b691-48de-b482-5882a163d32a', 'c0e579db-bb57-4b35-879e-11dfef9e822e')
on conflict do nothing;

insert into public.collection_products (collection_id, product_id, display_order)
values
  ('73b2a0a8-5659-4cd9-8905-fd4a6338aec4', 'f1d1b9fb-b691-48de-b482-5882a163d32a', 1),
  ('73b2a0a8-5659-4cd9-8905-fd4a6338aec4', 'c90377bd-042f-4d04-add5-8275549a9787', 2),
  ('73b2a0a8-5659-4cd9-8905-fd4a6338aec4', 'a16b23a8-88f8-4f77-b199-9783e5a7a7a8', 3)
on conflict do nothing;

insert into public.inventory_records (product_id, quantity_on_hand)
values ('c90377bd-042f-4d04-add5-8275549a9787', 0)
on conflict do nothing;

insert into public.product_variants (id, product_id, sku, attributes, display_order)
values
  ('95319842-4549-42a4-902b-17e5f8d177d9', 'f1d1b9fb-b691-48de-b482-5882a163d32a', 'BOTH-SMALL', '{"size":"small"}', 1),
  ('9260d631-ed2b-49c6-8397-2d1510b5c058', 'f1d1b9fb-b691-48de-b482-5882a163d32a', 'BOTH-LARGE', '{"size":"large"}', 2)
on conflict do nothing;

insert into public.inventory_records (variant_id, quantity_on_hand)
values
  ('95319842-4549-42a4-902b-17e5f8d177d9', 4),
  ('9260d631-ed2b-49c6-8397-2d1510b5c058', 0)
on conflict do nothing;

insert into public.variant_market_offers (variant_id, market_code, enabled, currency_code, price_minor)
values
  ('95319842-4549-42a4-902b-17e5f8d177d9', 'intl', true, 'USD', 3100),
  ('9260d631-ed2b-49c6-8397-2d1510b5c058', 'intl', true, 'USD', 3300)
on conflict do nothing;
