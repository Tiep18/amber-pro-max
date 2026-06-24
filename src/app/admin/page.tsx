import Link from 'next/link';
import {ExternalLink, LayoutDashboard} from 'lucide-react';
import {requireAdmin} from '@/auth/guards';
import {getAdminDashboard} from '@/admin/dashboard-queries';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdmin({next: '/admin'});
  const result = await getAdminDashboard({requireAdmin: async () => true});

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin</p>
        <h1 className="text-[28px] font-semibold leading-tight">Operational dashboard</h1>
        <p className="text-[var(--muted-foreground)]">
          Actionable queues for catalog, orders, reviews, newsletter, blog, policies, launch, and operations.
        </p>
      </div>
      {result.status === 'success' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
              <CardTitle>Admin work queue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {result.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="grid gap-3 py-4 transition hover:text-[var(--accent)] sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span className="grid gap-1">
                    <span className="text-xl font-semibold">{item.label}</span>
                    <span className="text-sm text-[var(--muted-foreground)]">{item.description}</span>
                  </span>
                  <span className="flex items-center gap-3 font-semibold">
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 tabular-nums">{item.count}</span>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          Admin dashboard could not be loaded. Refresh the page or inspect server logs with sensitive data redacted.
        </p>
      )}
    </main>
  );
}
