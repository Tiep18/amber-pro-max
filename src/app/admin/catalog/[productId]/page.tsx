import Link from 'next/link';
import {requireAdmin} from '@/auth/guards';
import {ProductForm} from '@/components/admin/catalog/product-form';
import {getCatalogOptions, getProductForForm} from '../catalog-data';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
  searchParams
}: {
  params: Promise<{productId: string}>;
  searchParams: Promise<{saved?: string}>;
}) {
  await requireAdmin();
  const {productId} = await params;
  const {saved} = await searchParams;
  const [options, initialProduct] = await Promise.all([getCatalogOptions(), getProductForForm(productId)]);

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
      <Link href="/admin/catalog" className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]">
        Back to products
      </Link>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">{initialProduct.status ?? 'draft'}</p>
        <h1 className="text-3xl font-semibold">Edit product</h1>
      </div>
      <ProductForm {...options} initialProduct={initialProduct} initialNotice={saved === '1' ? 'saved' : undefined} />
    </main>
  );
}
