import Link from 'next/link';
import { MessageSquareText, ShieldCheck } from 'lucide-react';
import { AdminEmptyState, AdminMetricCard, AdminStatusPill } from '@/components/admin/admin-page';
import { ReviewActions } from '@/components/admin/reviews/review-actions';
import { formatAdminDate, statusLabel } from '@/components/admin/orders/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminProductReview, ReviewStatus } from '@/reviews/queries';

const filters: Array<{ label: string; value?: ReviewStatus }> = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Hidden', value: 'hidden' },
  { label: 'Rejected', value: 'rejected' }
];

export function ReviewModerationList({
  reviews,
  activeStatus
}: {
  reviews: AdminProductReview[];
  activeStatus?: ReviewStatus;
}) {
  const pendingCount = reviews.filter((review) => review.status === 'pending').length;
  const repliedCount = reviews.filter((review) => review.replyBody).length;

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Visible filter"
          value={reviews.length}
          description="reviews in this queue"
        />
        <AdminMetricCard label="Pending" value={pendingCount} description="needs moderation" />
        <AdminMetricCard label="Shop replies" value={repliedCount} description="already answered" />
      </section>

      <Card className="overflow-hidden p-0">
        <CardHeader className="m-0 border-b border-[var(--border)] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquareText className="size-5 text-[var(--accent)]" aria-hidden="true" />
                <CardTitle>Moderation queue</CardTitle>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Review content, customer context, rating, and shop reply state.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Review status filter">
            {filters.map((filter) => {
              const active = filter.value === activeStatus || (!filter.value && !activeStatus);
              const href = filter.value
                ? `/admin/reviews?status=${filter.value}`
                : '/admin/reviews';
              return (
                <Link
                  key={filter.label}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`min-h-11 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold ${active ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)]'}`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <AdminEmptyState
              icon={MessageSquareText}
              title="No reviews match this filter."
              description="New customer reviews will appear here when they are submitted."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {reviews.map((review) => (
                <section
                  key={review.reviewId}
                  aria-label={`${review.title ?? 'Untitled review'} for ${review.productTitle}`}
                  className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]"
                >
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--accent)]">
                          {review.productTitle}
                        </p>
                        <h2 className="text-lg font-semibold">
                          {review.title ?? 'Untitled review'}
                        </h2>
                      </div>
                      <AdminStatusPill
                        tone={
                          review.status === 'approved'
                            ? 'success'
                            : review.status === 'pending'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {statusLabel(review.status)}
                      </AdminStatusPill>
                    </div>
                    <p className="text-sm font-semibold" aria-label={`Rating: ${review.rating}`}>
                      {review.rating} / 5 rating
                    </p>
                    {review.body ? (
                      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                        {review.body}
                      </p>
                    ) : null}
                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="font-semibold">Customer</dt>
                        <dd className="break-all text-[var(--muted-foreground)]">
                          {review.customerEmail}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Submitted</dt>
                        <dd className="text-[var(--muted-foreground)]">
                          {formatAdminDate(review.submittedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold">Version</dt>
                        <dd className="tabular-nums text-[var(--muted-foreground)]">
                          {review.version}
                        </dd>
                      </div>
                    </dl>
                    {review.replyBody ? (
                      <div className="border-l-2 border-[var(--accent)] bg-[var(--surface-muted)] px-4 py-3">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <ShieldCheck aria-hidden="true" className="size-4" />
                          Shop reply
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {review.replyBody}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <ReviewActions
                    reviewId={review.reviewId}
                    version={review.version}
                    status={review.status}
                    replyBody={review.replyBody}
                    replyVersion={review.replyVersion}
                  />
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
