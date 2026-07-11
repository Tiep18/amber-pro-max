import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Megaphone,
  PackageOpen,
  PenLine,
  ShieldCheck
} from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { getAdminDashboard } from '@/admin/dashboard-queries';
import type { AdminDashboardItem } from '@/admin/dashboard-model';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const priorityIds = new Set(['orders', 'failed-emails', 'reviews', 'operations', 'launch']);

function itemTone(item: AdminDashboardItem) {
  if (item.count === 0) return 'border-[var(--border)] bg-[var(--surface)]';
  if (item.id === 'failed-emails' || item.id === 'operations' || item.id === 'launch') {
    return 'border-[var(--warning)] bg-[var(--warning-surface)]';
  }
  return 'border-[var(--accent)] bg-[var(--surface)]';
}

function queueIcon(item: AdminDashboardItem) {
  if (item.id === 'orders') return PackageOpen;
  if (item.id === 'reviews') return PenLine;
  if (item.id === 'newsletter') return Megaphone;
  if (item.id === 'blog' || item.id === 'scheduled-blog') return PenLine;
  if (item.id === 'launch') return ShieldCheck;
  if (item.id === 'failed-emails' || item.id === 'operations') return AlertTriangle;
  return LayoutDashboard;
}

export default async function AdminPage() {
  await requireAdmin({ next: '/admin' });
  const result = await getAdminDashboard({ requireAdmin: async () => true });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Today"
        title="Operational dashboard"
        description="Triage payments, reviews, content, launch gates, and operational exceptions."
        action={
          <Link
            href="/admin/orders"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Open orders
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      {result.status === 'success' ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="size-5 text-[var(--accent)]" aria-hidden="true" />
                  <CardTitle>Need attention</CardTitle>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Queues that can block payment confirmation, fulfillment, or launch readiness.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {result.items
                  .filter((item) => priorityIds.has(item.id))
                  .map((item) => {
                    const Icon = queueIcon(item);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`grid gap-3 rounded-[var(--radius-card)] border p-4 transition-colors hover:border-[var(--accent)] sm:grid-cols-[auto_minmax(0,1fr)_auto] ${itemTone(item)}`}
                      >
                        <span className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--background)]">
                          <Icon className="size-5 text-[var(--accent)]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-base font-semibold">{item.label}</span>
                          <span className="block text-sm text-[var(--muted-foreground)]">
                            {item.description}
                          </span>
                        </span>
                        <span className="flex items-center gap-3 font-semibold">
                          <span className="rounded-full bg-[var(--background)] px-3 py-1 text-sm tabular-nums">
                            {item.count}
                          </span>
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </span>
                      </Link>
                    );
                  })}
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Store pulse</CardTitle>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Current non-blocking work counts.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {result.items
                  .filter((item) => !priorityIds.has(item.id))
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-control)] p-2 hover:bg-[var(--surface-muted)]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{item.label}</span>
                        <span className="block truncate text-sm text-[var(--muted-foreground)]">
                          {item.description}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold tabular-nums">
                        {item.count}
                      </span>
                    </Link>
                  ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            {result.items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums">{item.count}</p>
                  </div>
                  {item.count === 0 ? (
                    <CheckCircle2 className="size-5 text-[var(--success)]" aria-hidden="true" />
                  ) : null}
                </div>
              </Card>
            ))}
          </section>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Admin dashboard could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">
            Refresh the page or inspect server logs with sensitive data redacted.
          </p>
        </Alert>
      )}
    </AdminPageShell>
  );
}
