'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
    <article className="grid gap-3 px-4 py-4 sm:px-5">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(260px,1.4fr)_minmax(190px,1fr)_minmax(220px,0.9fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3
              className="min-w-0 truncate text-base font-semibold leading-6"
              title={error.summary}
            >
              {error.summary}
            </h3>
            <AdminStatusPill tone={error.status === 'unresolved' ? 'warning' : 'success'}>
              {error.status}
            </AdminStatusPill>
          </div>
          <p className="mt-1 text-xs font-semibold uppercase text-[var(--accent)]">
            {error.area} · {error.severity}
          </p>
        </div>

        <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 px-3 py-2.5 text-sm lg:bg-transparent lg:p-0">
          <div className="min-w-0">
            <dt className="text-xs text-[var(--muted-foreground)]">Error code</dt>
            <dd className="mt-0.5 truncate font-semibold" title={error.errorCode}>
              {error.errorCode}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted-foreground)]">Occurrences</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{error.occurrenceCount}</dd>
          </div>
        </dl>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--muted-foreground)]">First seen</dt>
            <dd className="mt-0.5 whitespace-nowrap text-xs font-medium">
              {formatAdminDate(error.firstSeenAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted-foreground)]">Last seen</dt>
            <dd className="mt-0.5 whitespace-nowrap text-xs font-medium">
              {formatAdminDate(error.lastSeenAt)}
            </dd>
          </div>
        </dl>

        {error.status === 'unresolved' ? (
          <div className="flex justify-end lg:pl-2">
            <MarkErrorResolvedButton errorId={error.id} />
          </div>
        ) : null}
      </div>

      <details className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2.5">
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
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No safe context was stored.</p>
        )}
      </details>
    </article>
  );
}

type Pagination = { page: number; pageSize: number; totalCount: number; totalPages: number };

function pageHref(filters: Required<AdminOperationalErrorFilters>, page: number) {
  const params = new URLSearchParams({
    status: filters.status,
    area: filters.area,
    page: String(page)
  });
  return `/admin/operations?${params.toString()}`;
}

export function ErrorQueue({
  errors,
  filters,
  pagination
}: {
  errors: AdminOperationalError[];
  filters: Required<AdminOperationalErrorFilters>;
  pagination: Pagination;
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
      label: 'Matching errors',
      value: pagination.totalCount,
      description: 'across all pages',
      icon: Bug
    },
    {
      label: 'This page',
      value: filtered.length,
      description: query ? `of ${errors.length} on page` : `page ${pagination.page}`,
      icon: ShieldAlert
    },
    {
      label: 'Page occurrences',
      value: totalOccurrences,
      description: unresolvedCount ? `${unresolvedCount} unresolved rows` : 'combined on this page',
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
                {query ? `${filtered.length} on page` : `${pagination.totalCount} total`}
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
                placeholder="Search this page"
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
        {pagination.totalPages > 1 ? (
          <footer className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface-muted)]/35 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
              {pagination.totalCount}
            </p>
            <nav
              aria-label="Operational errors pagination"
              className="flex items-center justify-end gap-2"
            >
              {pagination.page > 1 ? (
                <Link
                  href={pageHref(filters, pagination.page - 1)}
                  className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-semibold opacity-40">
                  Previous
                </span>
              )}
              <span className="px-2 text-sm font-semibold tabular-nums">
                {pagination.page} / {pagination.totalPages}
              </span>
              {pagination.page < pagination.totalPages ? (
                <Link
                  href={pageHref(filters, pagination.page + 1)}
                  className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border)] px-3 text-sm font-semibold opacity-40">
                  Next
                </span>
              )}
            </nav>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
