'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Bug, Search, ShieldAlert } from 'lucide-react';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { formatAdminDate } from '@/components/admin/orders/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type {
  AdminOperationalError,
  AdminOperationalErrorFilters
} from '@/operations/admin-queries';
import { cn } from '@/lib/utils';
import { MarkErrorResolvedButton } from './mark-error-resolved-button';

const statuses = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All statuses' }
] as const;
const areas = [
  { value: 'all', label: 'All areas' },
  { value: 'application', label: 'Application' },
  { value: 'storefront', label: 'Storefront' },
  { value: 'payment', label: 'Payment' },
  { value: 'email', label: 'Email' },
  { value: 'fulfillment', label: 'Fulfillment' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'admin', label: 'Admin' }
] as const;

function factEntries(error: AdminOperationalError) {
  return Object.entries(error.sanitizedFacts).map(
    ([key, value]) =>
      [key, typeof value === 'object' ? JSON.stringify(value) : String(value)] as const
  );
}

function ErrorRow({ error }: { error: AdminOperationalError }) {
  const facts = factEntries(error);
  return (
    <article className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3 lg:justify-start">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--accent)]">
              {error.area} · {error.severity}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-6">{error.summary}</h3>
          </div>
          <AdminStatusPill tone={error.status === 'unresolved' ? 'warning' : 'success'}>
            {error.status}
          </AdminStatusPill>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-[var(--muted-foreground)]">Error code</dt>
            <dd className="mt-1 truncate font-semibold">{error.errorCode}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted-foreground)]">Occurrences</dt>
            <dd className="mt-1 font-semibold tabular-nums">{error.occurrenceCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted-foreground)]">First seen</dt>
            <dd className="mt-1 text-xs font-medium">{formatAdminDate(error.firstSeenAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted-foreground)]">Last seen</dt>
            <dd className="mt-1 text-xs font-medium">{formatAdminDate(error.lastSeenAt)}</dd>
          </div>
        </dl>
        <details className="mt-3 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2.5">
          <summary className="cursor-pointer text-sm font-semibold">
            Sanitized facts{' '}
            <span className="font-normal text-[var(--muted-foreground)]">({facts.length})</span>
          </summary>
          {facts.length ? (
            <dl className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 text-sm sm:grid-cols-2">
              {facts.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="font-semibold">{key}</dt>
                  <dd className="mt-0.5 break-words text-[var(--muted-foreground)]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              No safe context was stored.
            </p>
          )}
        </details>
      </div>
      {error.status === 'unresolved' ? (
        <div className="flex justify-end">
          <MarkErrorResolvedButton errorId={error.id} />
        </div>
      ) : null}
    </article>
  );
}

export function ErrorQueue({
  errors,
  filters
}: {
  errors: AdminOperationalError[];
  filters: Required<AdminOperationalErrorFilters>;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? errors.filter((error) =>
          [error.summary, error.errorCode, error.area, error.severity].some((value) =>
            value.toLowerCase().includes(normalized)
          )
        )
      : errors;
  }, [errors, query]);
  const unresolvedCount = filtered.filter((error) => error.status === 'unresolved').length;
  const totalOccurrences = filtered.reduce((total, error) => total + error.occurrenceCount, 0);
  const metrics = [
    {
      label: 'Visible errors',
      value: filtered.length,
      description: `of ${errors.length} matching filters`,
      icon: Bug
    },
    { label: 'Unresolved', value: unresolvedCount, description: 'needs review', icon: ShieldAlert },
    {
      label: 'Occurrences',
      value: totalOccurrences,
      description: 'combined count',
      icon: AlertTriangle
    }
  ];

  return (
    <div className="grid gap-4">
      <section className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(92,48,26,0.05)] sm:grid-cols-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                'grid min-h-[104px] grid-cols-[1fr_auto] items-start gap-4 px-5 py-4',
                index > 0 && 'border-t border-[var(--border)] sm:border-l sm:border-t-0'
              )}
            >
              <div className="grid h-full content-between gap-2">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  {metric.label}
                </p>
                <div>
                  <p className="text-3xl font-semibold leading-none tabular-nums">{metric.value}</p>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                    {metric.description}
                  </p>
                </div>
              </div>
              <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]">
        <header className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="font-semibold">Operational error queue</h2>
              <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
                {filtered.length}/{errors.length}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
              Sanitized review without provider payloads, secrets, tokens, or unnecessary PII.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(200px,1fr)_auto]">
            <label className="relative">
              <span className="sr-only">Search operational errors</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search summary or code"
                className="min-h-10 pl-9 text-sm"
              />
            </label>
            <form
              action="/admin/operations"
              className="grid grid-cols-2 gap-2 sm:grid-cols-[145px_145px_auto]"
            >
              <Select name="status" defaultValue={filters.status}>
                <SelectTrigger aria-label="Status" className="h-10 min-h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select name="area" defaultValue={filters.area}>
                <SelectTrigger aria-label="Area" className="h-10 min-h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" className="col-span-2 min-h-10 px-3 text-sm sm:col-span-1">
                Apply
              </Button>
            </form>
          </div>
        </header>
        {filtered.length ? (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((error) => (
              <ErrorRow key={error.id} error={error} />
            ))}
          </div>
        ) : (
          <AdminEmptyState
            icon={AlertTriangle}
            title={
              errors.length
                ? 'No errors match this search.'
                : filters.status === 'unresolved'
                  ? 'No unresolved operational errors'
                  : 'No operational errors match these filters.'
            }
            description={
              errors.length
                ? 'Try another summary, code, area, or severity.'
                : 'New sanitized errors will appear here when they need review.'
            }
          />
        )}
      </section>
    </div>
  );
}
