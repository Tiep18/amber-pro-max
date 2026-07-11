'use client';

import { useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ExceptionReview } from './exception-review';

export type AdminExceptionRequest = {
  id: string;
  status: string;
  maskedEmail: string;
  productId: string;
  variantId: string | null;
  market: string;
  destinationCountryCode: string;
  customerNote: string;
  createdAt: string;
};

function statusTone(status: string) {
  if (status === 'pending') return 'warning' as const;
  if (status === 'approved') return 'success' as const;
  return 'default' as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value)
  );
}

export function ExceptionRequestList({ requests }: { requests: AdminExceptionRequest[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesQuery =
        !normalized ||
        [
          request.maskedEmail,
          request.productId,
          request.destinationCountryCode,
          request.customerNote
        ].some((value) => value.toLowerCase().includes(normalized));
      return matchesQuery && (status === 'all' || request.status === status);
    });
  }, [query, requests, status]);

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="font-semibold">Exception review queue</h2>
            <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
              {filtered.length}/{requests.length}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
            Masked customer details with product and destination context.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(210px,1fr)_145px]">
          <label className="relative">
            <span className="sr-only">Search exception requests</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product or country"
              className="min-h-10 pl-9 text-sm"
            />
          </label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={ShieldCheck}
          title={
            requests.length ? 'No requests match these filters.' : 'No exception requests yet.'
          }
          description={
            requests.length
              ? 'Change the search or status filter.'
              : 'Customer requests for unavailable market access will appear here.'
          }
        />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((request) => (
            <article
              key={request.id}
              className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{request.maskedEmail}</h3>
                  <AdminStatusPill tone={statusTone(request.status)}>
                    {request.status}
                  </AdminStatusPill>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {formatDate(request.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm text-[var(--muted-foreground)]">
                  {request.market.toUpperCase()} · {request.destinationCountryCode} ·{' '}
                  {request.productId}
                  {request.variantId ? ` · ${request.variantId}` : ''}
                </p>
                {request.customerNote ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted-foreground)]">
                    {request.customerNote}
                  </p>
                ) : null}
              </div>
              {request.status === 'pending' ? <ExceptionReview requestId={request.id} /> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
