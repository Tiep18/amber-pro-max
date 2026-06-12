import Link from 'next/link';
import {requireAdmin} from '@/auth/guards';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {getAdminProducts} from './catalog-data';

export const dynamic = 'force-dynamic';

export default async function AdminCatalogPage() {
  await requireAdmin();
  const products = await getAdminProducts();

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin catalog</p>
          <h1 className="text-3xl font-semibold">Products</h1>
        </div>
        <Link
          href="/admin/catalog/new"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          New product
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Catalog drafts and published products</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">No catalog products yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {products.map((product) => (
                <Link key={product.id} href={`/admin/catalog/${product.id}`} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto]">
                  <span className="font-semibold">{product.title}</span>
                  <span className="text-[var(--muted-foreground)]">{product.productType}</span>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold">{product.status}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
