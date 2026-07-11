import Link from 'next/link';
import { CheckCircle2, Clock3, MessageSquareText, Star } from 'lucide-react';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { ReviewActions } from '@/components/admin/reviews/review-actions';
import { formatAdminDate, statusLabel } from '@/components/admin/orders/format';
import type { AdminProductReview, ReviewStatus } from '@/reviews/queries';
import { cn } from '@/lib/utils';

const filters: Array<{ label: string; value?: ReviewStatus }> = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Hidden', value: 'hidden' },
  { label: 'Rejected', value: 'rejected' }
];

type Pagination = { page: number; pageSize: number; totalCount: number; totalPages: number };

function filterHref(status: ReviewStatus | undefined, page?: number) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/reviews?${query}` : '/admin/reviews';
}

function statusTone(status: ReviewStatus) {
  if (status === 'approved') return 'success' as const;
  if (status === 'pending') return 'warning' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'default' as const;
}

export function ReviewModerationList({
  reviews,
  allReviews,
  activeStatus,
  pagination
}: {
  reviews: AdminProductReview[];
  allReviews: AdminProductReview[];
  activeStatus?: ReviewStatus;
  pagination: Pagination;
}) {
  const counts = Object.fromEntries(
    filters.map((filter) => [
      filter.value ?? 'all',
      filter.value
        ? allReviews.filter((review) => review.status === filter.value).length
        : allReviews.length
    ])
  );
  const pendingCount = counts.pending ?? 0;
  const approvedCount = counts.approved ?? 0;
  const repliedCount = allReviews.filter((review) => review.replyBody).length;
  const metrics = [
    { label: 'Pending review', value: pendingCount, description: 'needs a decision', icon: Clock3 },
    {
      label: 'Approved',
      value: approvedCount,
      description: 'visible on storefront',
      icon: CheckCircle2
    },
    {
      label: 'Shop replies',
      value: repliedCount,
      description: 'customer responses',
      icon: MessageSquareText
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
              <MessageSquareText className="size-4 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="font-semibold">Moderation queue</h2>
              <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
                {pagination.totalCount} reviews
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Review customer context, rating, content, and reply state.
            </p>
          </div>
          <nav
            className="flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-1"
            aria-label="Review status filter"
          >
            {filters.map((filter) => {
              const active = filter.value === activeStatus || (!filter.value && !activeStatus);
              return (
                <Link
                  key={filter.label}
                  href={filterHref(filter.value)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  )}
                >
                  {filter.label}
                  <span className="text-xs tabular-nums opacity-65">
                    {counts[filter.value ?? 'all'] ?? 0}
                  </span>
                </Link>
              );
            })}
          </nav>
        </header>

        {reviews.length ? (
          <div className="divide-y divide-[var(--border)]">
            {reviews.map((review) => (
              <article
                key={review.reviewId}
                aria-label={`${review.title ?? 'Untitled review'} for ${review.productTitle}`}
                className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(320px,1.4fr)_minmax(180px,0.65fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusPill tone={statusTone(review.status)}>
                      {statusLabel(review.status)}
                    </AdminStatusPill>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                      <Star
                        className="size-3.5 fill-current text-[var(--warning)]"
                        aria-hidden="true"
                      />
                      {review.rating}/5
                    </span>
                  </div>
                  <p
                    className="mt-2 truncate text-sm font-semibold text-[var(--accent)]"
                    title={review.productTitle}
                  >
                    {review.productTitle}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]"
                    title={review.customerEmail}
                  >
                    {review.customerEmail}
                  </p>
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-semibold" title={review.title ?? 'Untitled review'}>
                    {review.title ?? 'Untitled review'}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--muted-foreground)]">
                    {review.body || 'No written review.'}
                  </p>
                </div>

                <div className="text-sm">
                  <p className="text-xs text-[var(--muted-foreground)]">Submitted</p>
                  <p className="mt-0.5 text-xs font-medium">
                    {formatAdminDate(review.submittedAt)}
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                    {review.replyBody ? 'Shop replied' : 'No shop reply'}
                  </p>
                </div>

                <ReviewActions review={review} />
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            icon={MessageSquareText}
            title="No reviews match this filter."
            description="New customer reviews will appear here when they are submitted."
          />
        )}

        {pagination.totalPages > 1 ? (
          <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-muted)]/35 px-5 py-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}-
              {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
              {pagination.totalCount}
            </p>
            <nav aria-label="Reviews pagination" className="flex items-center gap-2">
              <Link
                href={filterHref(activeStatus, Math.max(1, pagination.page - 1))}
                aria-disabled={pagination.page === 1}
                className={cn(
                  'inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold',
                  pagination.page === 1 && 'pointer-events-none opacity-40'
                )}
              >
                Previous
              </Link>
              <span className="text-sm font-semibold tabular-nums">
                {pagination.page}/{pagination.totalPages}
              </span>
              <Link
                href={filterHref(
                  activeStatus,
                  Math.min(pagination.totalPages, pagination.page + 1)
                )}
                aria-disabled={pagination.page === pagination.totalPages}
                className={cn(
                  'inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold',
                  pagination.page === pagination.totalPages && 'pointer-events-none opacity-40'
                )}
              >
                Next
              </Link>
            </nav>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
