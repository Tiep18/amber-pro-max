import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { AdminEmptyState, AdminMetricCard, AdminStatusPill } from '@/components/admin/admin-page';
import type {
  AdminOperationalError,
  AdminOperationalErrorFilters
} from '@/operations/admin-queries';
import { formatAdminDate } from '@/components/admin/orders/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkErrorResolvedButton } from './mark-error-resolved-button';

const statuses: Array<{ value: AdminOperationalErrorFilters['status']; label: string }> = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' }
];

const areas: Array<{ value: AdminOperationalErrorFilters['area']; label: string }> = [
  { value: 'all', label: 'All areas' },
  { value: 'application', label: 'Application' },
  { value: 'payment', label: 'Payment' },
  { value: 'email', label: 'Email' },
  { value: 'fulfillment', label: 'Fulfillment' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'admin', label: 'Admin' }
];

function filterHref(
  filters: Required<AdminOperationalErrorFilters>,
  next: AdminOperationalErrorFilters
) {
  const params = new URLSearchParams();
  params.set('status', next.status ?? filters.status);
  params.set('area', next.area ?? filters.area);
  return `/admin/operations?${params.toString()}`;
}

function factEntries(error: AdminOperationalError) {
  return Object.entries(error.sanitizedFacts).map(
    ([key, value]) =>
      [key, typeof value === 'object' ? JSON.stringify(value) : String(value)] as const
  );
}

export function ErrorQueue({
  errors,
  filters
}: {
  errors: AdminOperationalError[];
  filters: Required<AdminOperationalErrorFilters>;
}) {
  const unresolvedCount = errors.filter((error) => error.status === 'unresolved').length;
  const totalOccurrences = errors.reduce((total, error) => total + error.occurrenceCount, 0);

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Visible errors"
          value={errors.length}
          description="matching filters"
        />
        <AdminMetricCard label="Unresolved" value={unresolvedCount} description="needs review" />
        <AdminMetricCard
          label="Occurrences"
          value={totalOccurrences}
          description="combined count"
        />
      </section>

      <Card className="overflow-hidden p-0">
        <CardHeader className="m-0 border-b border-[var(--border)] p-6">
          <CardTitle>Operational error queue</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Sanitized operational error review. Raw provider payloads, signatures, secrets, tokens,
            signed URLs, full addresses, and unnecessary PII are not shown.
          </p>
          <div className="flex flex-wrap gap-2" aria-label="Operational error status filter">
            {statuses.map((status) => (
              <Link
                key={status.value}
                href={filterHref(filters, { status: status.value })}
                aria-current={filters.status === status.value ? 'page' : undefined}
                className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-sm font-semibold aria-[current=page]:bg-[var(--accent)] aria-[current=page]:text-white"
              >
                {status.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Operational error area filter">
            {areas.map((area) => (
              <Link
                key={area.value}
                href={filterHref(filters, { area: area.value })}
                aria-current={filters.area === area.value ? 'page' : undefined}
                className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 text-sm font-semibold aria-[current=page]:bg-[var(--surface-muted)]"
              >
                {area.label}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {errors.length === 0 ? (
            <AdminEmptyState
              icon={AlertTriangle}
              title="No unresolved operational errors"
              description="New sanitized errors will appear here when they need review."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {errors.map((error) => (
                <div key={error.id} className="grid gap-4 p-6 lg:grid-cols-[1fr_auto]">
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase text-[var(--accent)]">
                          {error.area} / {error.severity}
                        </p>
                        <h2 className="text-xl font-semibold">{error.summary}</h2>
                      </div>
                      <AdminStatusPill tone={error.status === 'unresolved' ? 'warning' : 'success'}>
                        {error.status}
                      </AdminStatusPill>
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="font-semibold">Error code</dt>
                        <dd>{error.errorCode}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Occurrences</dt>
                        <dd>{error.occurrenceCount}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">First seen</dt>
                        <dd>{formatAdminDate(error.firstSeenAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Last seen</dt>
                        <dd>{formatAdminDate(error.lastSeenAt)}</dd>
                      </div>
                    </dl>
                    <details className="rounded-[var(--radius-control)] border border-[var(--border)] p-3">
                      <summary className="cursor-pointer font-semibold">Sanitized facts</summary>
                      {factEntries(error).length === 0 ? (
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                          No safe context was stored.
                        </p>
                      ) : (
                        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          {factEntries(error).map(([key, value]) => (
                            <div key={key}>
                              <dt className="font-semibold">{key}</dt>
                              <dd className="break-words">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </details>
                  </div>
                  <div className="flex items-start">
                    {error.status === 'unresolved' ? (
                      <MarkErrorResolvedButton errorId={error.id} />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
