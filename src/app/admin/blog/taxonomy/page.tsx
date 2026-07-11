import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { TaxonomyManager } from '@/components/admin/taxonomy/taxonomy-manager';
import { blogTaxonomySections, getTaxonomyTerms } from '@/admin/taxonomy-admin';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  saved?: string;
  deleted?: string;
  blocked?: string;
  invalid?: string;
  error?: string;
}>;

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
        description="Manage localized categories and tags."
        action={
          <Link
            href="/admin/blog"
            className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold hover:bg-[var(--surface-muted)]"
          >
            <FileText className="size-4" aria-hidden="true" />
            View posts
          </Link>
        }
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
import Link from 'next/link';
import { FileText } from 'lucide-react';
