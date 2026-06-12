import Link from 'next/link';
import {requireAdmin} from '@/auth/guards';
import {ProductForm} from '@/components/admin/catalog/product-form';
import {getCatalogOptions} from '../catalog-data';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  await requireAdmin();
  const options = await getCatalogOptions();

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
      <Link href="/admin/catalog" className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]">
        Back to products
      </Link>
      <h1 className="mb-6 text-3xl font-semibold">New product</h1>
      <ProductForm {...options} />
    </main>
  );
}
