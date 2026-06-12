insert into storage.buckets (
  id,
  name,
  "public",
  file_size_limit,
  allowed_mime_types
)
values
  (
    'product-media',
    'product-media',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'pattern-pdfs',
    'pattern-pdfs',
    false,
    52428800,
    array['application/pdf']
  )
on conflict (id) do update
set
  name = excluded.name,
  "public" = excluded."public",
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

alter table public.product_media
  add constraint product_media_uses_public_bucket
  check (bucket_id = 'product-media');

alter table public.product_digital_assets
  add constraint product_digital_assets_use_private_pdf_bucket
  check (bucket_id = 'pattern-pdfs');

alter table public.product_translations
  add constraint product_translations_social_images_use_public_bucket
  check (social_image_bucket is null or social_image_bucket = 'product-media');

alter table public.category_translations
  add constraint category_translations_social_images_use_public_bucket
  check (social_image_bucket is null or social_image_bucket = 'product-media');

alter table public.collection_translations
  add constraint collection_translations_social_images_use_public_bucket
  check (social_image_bucket is null or social_image_bucket = 'product-media');

grant select on table storage.objects to anon, authenticated;
grant insert, update, delete on table storage.objects to authenticated;

create policy product_media_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-media');

create policy catalog_storage_admin_read
on storage.objects
for select
to authenticated
using (
  bucket_id in ('product-media', 'pattern-pdfs')
  and private.is_admin()
);

create policy catalog_storage_admin_insert
on storage.objects
for insert
to authenticated
with check (
  private.is_admin()
  and (
    (
      bucket_id = 'product-media'
      and coalesce(metadata->>'mimetype', '') in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      )
      and coalesce((metadata->>'size')::bigint, 0) between 1 and 10485760
    )
    or (
      bucket_id = 'pattern-pdfs'
      and coalesce(metadata->>'mimetype', '') = 'application/pdf'
      and coalesce((metadata->>'size')::bigint, 0) between 1 and 52428800
    )
  )
);

create policy catalog_storage_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id in ('product-media', 'pattern-pdfs')
  and private.is_admin()
)
with check (
  private.is_admin()
  and (
    (
      bucket_id = 'product-media'
      and coalesce(metadata->>'mimetype', '') in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      )
      and coalesce((metadata->>'size')::bigint, 0) between 1 and 10485760
    )
    or (
      bucket_id = 'pattern-pdfs'
      and coalesce(metadata->>'mimetype', '') = 'application/pdf'
      and coalesce((metadata->>'size')::bigint, 0) between 1 and 52428800
    )
  )
);

create policy catalog_storage_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('product-media', 'pattern-pdfs')
  and private.is_admin()
);
