import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { TaxonomyManager } from '@/components/admin/taxonomy/taxonomy-manager';
import { catalogTaxonomySections, getTaxonomyTerms } from '@/admin/taxonomy-admin';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  saved?: string;
  deleted?: string;
  blocked?: string;
  invalid?: string;
  error?: string;
}>;

export default async function AdminCatalogTaxonomyPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin({ next: '/admin/catalog/taxonomy' });
  const params = await searchParams;
  const sections = await Promise.all(
    catalogTaxonomySections.map(async (config) => ({
      config,
      terms: await getTaxonomyTerms(config)
    }))
  );

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin catalog"
        title="Catalog taxonomy"
        description="Manage product categories, tags, techniques, and collections in Vietnamese and English."
      />
      <TaxonomyManager
        sections={sections}
        saved={params.saved === '1'}
        deleted={params.deleted === '1'}
        blocked={params.blocked === '1'}
        invalid={params.invalid === '1'}
        error={params.error === '1'}
      />
    </AdminPageShell>
  );
}
