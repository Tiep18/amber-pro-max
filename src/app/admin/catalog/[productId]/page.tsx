import Link from 'next/link';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { ProductForm } from '@/components/admin/catalog/product-form';
import { getCatalogOptions, getProductForForm } from '../catalog-data';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
  searchParams
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { productId } = await params;
  const { saved } = await searchParams;
  const [options, initialProduct] = await Promise.all([
    getCatalogOptions(),
    getProductForForm(productId)
  ]);

  return (
    <AdminPageShell className="mx-auto max-w-[1040px]">
      <Link
        href="/admin/catalog"
        className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]"
      >
        Back to products
      </Link>
      <AdminPageHeader
        eyebrow={initialProduct.status ?? 'draft'}
        title="Edit product"
        description="Update product content, taxonomy, market offers, and storefront metadata."
      />
      <ProductForm
        {...options}
        initialProduct={initialProduct}
        initialNotice={saved === '1' ? 'saved' : undefined}
      />
    </AdminPageShell>
  );
}
