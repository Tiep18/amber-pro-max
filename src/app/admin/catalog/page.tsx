import Link from 'next/link';
import { ArrowRight, Boxes, Plus, Search } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminProducts } from './catalog-data';

export const dynamic = 'force-dynamic';

export default async function AdminCatalogPage() {
  await requireAdmin();
  const products = await getAdminProducts();
  const publishedCount = products.filter((product) => product.status === 'published').length;
  const draftCount = products.filter((product) => product.status !== 'published').length;

  return (
    <main className="grid w-full gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin catalog</p>
          <h1 className="text-[28px] font-semibold leading-tight sm:text-4xl">Products</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Maintain bilingual product listings, market availability, media, and purchasable
            inventory from one queue.
          </p>
        </div>
        <Link
          href="/admin/catalog/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Plus className="size-4" aria-hidden="true" />
          New product
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">Total products</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{products.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">Published</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{publishedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">Draft or hidden</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{draftCount}</p>
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <CardHeader className="m-0 border-b border-[var(--border)] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="size-5 text-[var(--accent)]" aria-hidden="true" />
                <CardTitle>Catalog queue</CardTitle>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Scan publication state, product type, and edit the listing that needs work.
              </p>
            </div>
            <div className="flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm text-[var(--muted-foreground)]">
              <Search className="size-4" aria-hidden="true" />
              Search-ready layout
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
              <Boxes className="size-10 text-[var(--accent)]" aria-hidden="true" />
              <p className="font-semibold">No catalog products yet.</p>
              <p className="max-w-md text-sm text-[var(--muted-foreground)]">
                Create the first product to start building your storefront catalog.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-[var(--surface-muted)]"
                    >
                      <td className="px-6 py-4 align-top">
                        <p className="font-semibold">{product.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Manage details, media, pricing, and variants
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">
                          {product.productType}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right align-top">
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
    </main>
  );
}
