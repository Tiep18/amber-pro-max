import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  ImageIcon,
  Package,
  Plus,
  Tag
} from 'lucide-react';
import {requireAdmin} from '@/auth/guards';
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusPill
} from '@/components/admin/admin-page';
import {CatalogListControls} from '@/components/admin/catalog/catalog-list-controls';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {getAdminProducts} from './catalog-data';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value) ?? '1', 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

function productTypeLabel(type: string) {
  if (type === 'pdf_pattern') {
    return 'PDF pattern';
  }
  if (type === 'physical_finished') {
    return 'Handmade';
  }
  return type;
}

function statusTone(status: string) {
  if (status === 'published') {
    return 'success' as const;
  }
  if (status === 'archived') {
    return 'danger' as const;
  }
  return 'warning' as const;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not updated';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export default async function AdminCatalogPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filters = {
    search: firstParam(params.search)?.trim() ?? '',
    status: firstParam(params.status) ?? 'all',
    type: firstParam(params.type) ?? 'all',
    page: parsePage(params.page)
  };
  const catalog = await getAdminProducts(filters);
  const hasFilters = Boolean(filters.search || filters.status !== 'all' || filters.type !== 'all');

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin catalog"
        title="Products"
        description="Find, review, and edit product readiness across content, media, market offers, and inventory."
        action={
          <Link
            href="/admin/catalog/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Plus className="size-4" aria-hidden="true" />
            New product
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminMetricCard
          label="Total products"
          value={catalog.stats.total}
          description="All catalog records"
          icon={Boxes}
        />
        <AdminMetricCard
          label="Published"
          value={catalog.stats.published}
          description="Visible when market-ready"
          icon={Package}
        />
        <AdminMetricCard
          label="Draft or hidden"
          value={catalog.stats.draftOrHidden}
          description="Needs review or archived"
          icon={Tag}
        />
      </section>

      <Card className="overflow-hidden p-0">
        <CardHeader className="m-0 border-b border-[var(--border)] p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="size-5 text-[var(--accent)]" aria-hidden="true" />
                <CardTitle>Catalog workspace</CardTitle>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
                Scan product identity, publication state, market availability, and recent updates
                before opening the full editor.
              </p>
            </div>
            <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold tabular-nums">
              {catalog.total} result{catalog.total === 1 ? '' : 's'}
            </div>
          </div>
        </CardHeader>
        <CatalogListControls
          search={filters.search}
          status={filters.status}
          type={filters.type}
          page={catalog.page}
          totalPages={catalog.totalPages}
          total={catalog.total}
          pageSize={catalog.pageSize}
        />
        <CardContent className="p-0">
          {catalog.products.length === 0 ? (
            <AdminEmptyState
              icon={Boxes}
              title={hasFilters ? 'No products match these filters.' : 'No catalog products yet.'}
              description={
                hasFilters
                  ? 'Clear search or choose a broader filter to return to the full catalog.'
                  : 'Create the first product to start building your storefront catalog.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Markets</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {catalog.products.map((product) => (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-[var(--surface-muted)]"
                    >
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-4">
                          {product.thumbnailUrl ? (
                            <img
                              src={product.thumbnailUrl}
                              alt={product.thumbnailAlt}
                              className="size-16 shrink-0 rounded-[var(--radius-control)] border border-[var(--border)] object-cover"
                            />
                          ) : (
                            <div className="flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]">
                              <ImageIcon className="size-5" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[360px] truncate font-semibold">
                              {product.title}
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              Details, media, pricing, variants
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <AdminStatusPill>{productTypeLabel(product.productType)}</AdminStatusPill>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <AdminStatusPill tone={statusTone(product.status)}>
                          {product.status}
                        </AdminStatusPill>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <AdminStatusPill tone={product.markets.vn ? 'success' : 'default'}>
                            VN
                          </AdminStatusPill>
                          <AdminStatusPill tone={product.markets.intl ? 'success' : 'default'}>
                            INTL
                          </AdminStatusPill>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle text-sm text-[var(--muted-foreground)]">
                        {formatDate(product.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right align-middle">
                        <Link
                          href={`/admin/catalog/${product.id}`}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          Edit
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
