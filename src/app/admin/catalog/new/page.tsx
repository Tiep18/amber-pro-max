import Link from 'next/link';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { ProductForm } from '@/components/admin/catalog/product-form';
import { getCatalogOptions } from '../catalog-data';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  await requireAdmin();
  const options = await getCatalogOptions();

  return (
    <AdminPageShell className="mx-auto max-w-[1280px]">
      <Link
        href="/admin/catalog"
        className="mb-4 inline-flex text-sm font-semibold text-[var(--accent)]"
      >
        Back to products
      </Link>
      <AdminPageHeader
        eyebrow="Admin catalog"
        title="New product"
        description="Create a bilingual product listing with market-specific availability and pricing."
      />
      <ProductForm {...options} />
    </AdminPageShell>
  );
}
