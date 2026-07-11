import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Boxes, ImageIcon, Plus } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { AdminEmptyState, AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { CatalogListControls } from '@/components/admin/catalog/catalog-list-controls';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getAdminProducts } from './catalog-data';

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
    return 'published' as const;
  }
  if (status === 'archived') {
    return 'archived' as const;
  }
  return 'draft' as const;
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

function productTypeTone(type: string) {
  return type === 'pdf_pattern' ? 'pdf' : 'handmade';
}

function CatalogBadge({
  children,
  tone
}: {
  children: ReactNode;
  tone: 'pdf' | 'handmade' | 'published' | 'draft' | 'archived' | 'marketOn' | 'marketOff';
}) {
  const tones = {
    pdf: 'border-[#d8c4e2] bg-[#f5eef8] text-[#6a4777]',
    handmade: 'border-[#e6c8b8] bg-[#fbf0ea] text-[#8a5137]',
    published: 'border-[#bedecd] bg-[var(--success-surface)] text-[var(--success)]',
    draft: 'border-[#ead6aa] bg-[var(--warning-surface)] text-[var(--warning)]',
    archived: 'border-[#ecc0ba] bg-[var(--destructive-surface)] text-[var(--destructive)]',
    marketOn: 'border-[#bedecd] bg-[#edf8f1] text-[#28724b]',
    marketOff: 'border-[#dfd8cf] bg-[#f7f3ee] text-[#8a7a68]'
  };

  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-control)] border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
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
    <AdminPageShell className="gap-4 py-4 sm:py-5">
      <AdminPageHeader
        eyebrow="Admin catalog"
        title="Products"
        description="Manage product content, media, availability, pricing, and publishing state."
        action={
          <Link
            href="/admin/catalog/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Plus className="size-4" aria-hidden="true" />
            New product
          </Link>
        }
      />

      <Card className="overflow-hidden p-0">
        <CardHeader className="m-0 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="size-4 text-[var(--accent)]" aria-hidden="true" />
                <h2 className="text-base font-semibold">Catalog workspace</h2>
              </div>
            </div>
            <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold tabular-nums">
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
          stats={catalog.stats}
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
                            <p className="max-w-[360px] truncate font-semibold">{product.title}</p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              Details, media, pricing, variants
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <CatalogBadge tone={productTypeTone(product.productType)}>
                          {productTypeLabel(product.productType)}
                        </CatalogBadge>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <CatalogBadge tone={statusTone(product.status)}>
                          {product.status}
                        </CatalogBadge>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <CatalogBadge tone={product.markets.vn ? 'marketOn' : 'marketOff'}>
                            VN
                          </CatalogBadge>
                          <CatalogBadge tone={product.markets.intl ? 'marketOn' : 'marketOff'}>
                            INTL
                          </CatalogBadge>
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
