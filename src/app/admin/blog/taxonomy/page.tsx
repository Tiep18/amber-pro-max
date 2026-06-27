import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { TaxonomyManager } from '@/components/admin/taxonomy/taxonomy-manager';
import { blogTaxonomySections, getTaxonomyTerms } from '@/admin/taxonomy-admin';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; invalid?: string; error?: string }>;

export default async function AdminBlogTaxonomyPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin({ next: '/admin/blog/taxonomy' });
  const params = await searchParams;
  const sections = await Promise.all(
    blogTaxonomySections.map(async (config) => ({
      config,
      terms: await getTaxonomyTerms(config)
    }))
  );

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin content"
        title="Blog taxonomy"
        description="Manage blog categories and tags used by localized editorial content."
      />
      <TaxonomyManager
        sections={sections}
        saved={params.saved === '1'}
        invalid={params.invalid === '1'}
        error={params.error === '1'}
      />
    </AdminPageShell>
  );
}
