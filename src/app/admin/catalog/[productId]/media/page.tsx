import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/auth/guards';
import { mediaProductIdSchema, PRODUCT_MEDIA_BUCKET } from '@/catalog/media-schemas';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import {
  MediaManager,
  type MediaManagerAsset,
  type MediaManagerImage
} from '@/components/admin/catalog/media-manager';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ProductRow = {
  id: string;
  product_type: string;
  status: string;
  product_translations: Array<{
    locale: string;
    title: string;
    social_image_path: string | null;
  }>;
};

function titleFor(product: ProductRow) {
  return (
    product.product_translations.find((translation) => translation.locale === 'en')?.title ??
    product.product_translations[0]?.title ??
    'Untitled product'
  );
}

export default async function ProductMediaPage({
  params
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdmin();
  const { productId } = await params;
  const parsed = mediaProductIdSchema.safeParse(productId);
  if (!parsed.success) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const [productResult, mediaResult, assetResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, product_type, status, product_translations(locale,title,social_image_path)')
      .eq('id', parsed.data)
      .maybeSingle(),
    supabase
      .from('product_media')
      .select('id, object_path, alt_text_vi, alt_text_en, display_order, is_primary')
      .eq('product_id', parsed.data)
      .order('display_order', { ascending: true }),
    supabase
      .from('product_digital_assets')
      .select('file_name, content_type, byte_size, checksum_sha256, updated_at')
      .eq('product_id', parsed.data)
      .maybeSingle()
  ]);

  if (productResult.error || !productResult.data) {
    notFound();
  }

  const product = productResult.data as ProductRow;
  const images: MediaManagerImage[] = (mediaResult.data ?? []).map((image) => ({
    id: image.id,
    objectPath: image.object_path,
    publicUrl: supabase.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(image.object_path).data
      .publicUrl,
    altTextVi: image.alt_text_vi,
    altTextEn: image.alt_text_en,
    displayOrder: image.display_order,
    isPrimary: image.is_primary,
    socialLocales: product.product_translations
      .filter((translation) => translation.social_image_path === image.object_path)
      .map((translation) => translation.locale as 'vi' | 'en')
  }));
  const asset: MediaManagerAsset | null = assetResult.data
    ? {
        fileName: assetResult.data.file_name,
        contentType: assetResult.data.content_type,
        byteSize: assetResult.data.byte_size,
        checksumSha256: assetResult.data.checksum_sha256,
        updatedAt: assetResult.data.updated_at
      }
    : null;

  return (
    <AdminPageShell className="mx-auto max-w-[1040px]">
      <Link
        href={`/admin/catalog/${product.id}`}
        className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]"
      >
        Back to product
      </Link>
      <AdminPageHeader
        eyebrow={product.status}
        title="Media and private PDF"
        description={titleFor(product)}
      />
      <MediaManager
        productId={product.id}
        productType={product.product_type}
        images={images}
        asset={asset}
      />
    </AdminPageShell>
  );
}
