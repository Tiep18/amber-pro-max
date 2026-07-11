'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, EyeOff, MessageSquare, Settings2, Star, Trash2 } from 'lucide-react';
import {
  approveProductReviewAction,
  hideProductReviewAction,
  removeReviewReplyAction,
  upsertReviewReplyAction,
  type ReviewAdminActionResult
} from '@/reviews/actions';
import type { AdminProductReview, ReviewStatus } from '@/reviews/queries';
import { AdminStatusPill } from '@/components/admin/admin-page';
import { formatAdminDate, statusLabel } from '@/components/admin/orders/format';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

const initialState: ReviewAdminActionResult = { status: 'idle' };

function resultText(result: ReviewAdminActionResult) {
  if (result.status === 'idle') return null;
  if (result.status === 'approved') return 'Review approved.';
  if (result.status === 'hidden') return 'Review hidden from the storefront.';
  if (result.status === 'saved') return 'Shop reply saved.';
  if (result.status === 'removed') return 'Shop reply removed.';
  if (result.status === 'stale') return 'Review state changed. Refresh and try again.';
  if (result.status === 'forbidden') return 'Admin authorization is required.';
  if (result.status === 'not_found') return 'Review no longer exists.';
  if (result.status === 'invalid') return 'Check the action fields and try again.';
  return 'The review action failed. Try again.';
}

function PendingButton({
  children,
  variant = 'primary'
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className="gap-2">
      {children}
    </Button>
  );
}

function HiddenReviewFields({
  reviewId,
  version,
  status
}: {
  reviewId: string;
  version: number;
  status: ReviewStatus;
}) {
  return (
    <>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <input type="hidden" name="expectedStatus" value={status} />
    </>
  );
}

function statusTone(status: ReviewStatus) {
  if (status === 'approved') return 'success' as const;
  if (status === 'pending') return 'warning' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'default' as const;
}

export function ReviewActions({ review }: { review: AdminProductReview }) {
  const [approveState, approveAction] = useActionState(approveProductReviewAction, initialState);
  const [hideState, hideAction] = useActionState(hideProductReviewAction, initialState);
  const [replyState, replyAction] = useActionState(upsertReviewReplyAction, initialState);
  const [removeState, removeAction] = useActionState(removeReviewReplyAction, initialState);
  const visibleResult = [removeState, replyState, hideState, approveState].find(
    (result) => result.status !== 'idle'
  );

  return (
    <div className="flex justify-end">
      <Sheet
        triggerLabel="Moderate review"
        title="Review moderation"
        closeLabel="Close review moderation"
        showTriggerLabel
        triggerIcon={<Settings2 className="size-4" aria-hidden="true" />}
        triggerClassName="h-9 min-h-9 px-3 text-sm"
        contentClassName="!w-[min(620px,96vw)]"
        headerClassName="px-5 sm:px-6"
        bodyClassName="p-5 sm:p-6"
      >
        <div className="grid gap-6">
          <section className="border-b border-[var(--border)] pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusPill tone={statusTone(review.status)}>
                {statusLabel(review.status)}
              </AdminStatusPill>
              <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                <Star className="size-3.5 fill-current text-[var(--warning)]" aria-hidden="true" />
                {review.rating}/5
              </span>
            </div>
            <h3 className="mt-3 text-xl font-semibold leading-7">
              {review.title ?? 'Untitled review'}
            </h3>
            <p className="mt-1 text-sm font-semibold text-[var(--accent)]">{review.productTitle}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">
              {review.body || 'No written review.'}
            </p>
          </section>

          <dl className="grid grid-cols-2 gap-4 rounded-[var(--radius-card)] bg-[var(--surface-muted)]/55 p-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">Customer</dt>
              <dd className="mt-1 break-all text-sm font-medium">{review.customerEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">Submitted</dt>
              <dd className="mt-1 text-sm font-medium">{formatAdminDate(review.submittedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted-foreground)]">Version</dt>
              <dd className="mt-1 font-semibold tabular-nums">{review.version}</dd>
            </div>
          </dl>

          <section className="grid gap-3">
            <h3 className="font-semibold">Moderation decision</h3>
            <div className="flex flex-wrap gap-2">
              {review.status !== 'approved' ? (
                <form action={approveAction}>
                  <HiddenReviewFields
                    reviewId={review.reviewId}
                    version={review.version}
                    status={review.status}
                  />
                  <PendingButton>
                    <Check aria-hidden="true" className="size-4" />
                    Approve review
                  </PendingButton>
                </form>
              ) : null}
              {review.status !== 'hidden' ? (
                <form
                  action={hideAction}
                  onSubmit={(event) => {
                    if (!window.confirm('Hide this review from the storefront?')) {
                      event.preventDefault();
                    }
                  }}
                >
                  <HiddenReviewFields
                    reviewId={review.reviewId}
                    version={review.version}
                    status={review.status}
                  />
                  <PendingButton variant="destructive">
                    <EyeOff aria-hidden="true" className="size-4" />
                    Hide review
                  </PendingButton>
                </form>
              ) : null}
            </div>
          </section>

          {review.status === 'approved' ? (
            <section className="grid gap-3 border-t border-[var(--border)] pt-5">
              <div>
                <h3 className="font-semibold">Shop reply</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  This reply appears publicly below the customer review.
                </p>
              </div>
              <form action={replyAction} className="grid gap-3">
                <input type="hidden" name="reviewId" value={review.reviewId} />
                <input type="hidden" name="expectedReviewVersion" value={review.version} />
                <input type="hidden" name="expectedReviewStatus" value={review.status} />
                <label htmlFor={`reply-${review.reviewId}`} className="sr-only">
                  Shop reply
                </label>
                <Textarea
                  id={`reply-${review.reviewId}`}
                  name="body"
                  required
                  maxLength={2000}
                  rows={6}
                  defaultValue={review.replyBody ?? ''}
                  placeholder="Write a clear, helpful public reply"
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <PendingButton>
                    <MessageSquare aria-hidden="true" className="size-4" />
                    Save reply
                  </PendingButton>
                </div>
              </form>

              {review.replyVersion !== null ? (
                <form
                  action={removeAction}
                  onSubmit={(event) => {
                    if (!window.confirm('Remove the public admin reply?')) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="reviewId" value={review.reviewId} />
                  <input type="hidden" name="expectedReviewVersion" value={review.version} />
                  <input type="hidden" name="expectedReviewStatus" value={review.status} />
                  <input type="hidden" name="expectedReplyVersion" value={review.replyVersion} />
                  <PendingButton variant="secondary">
                    <Trash2 aria-hidden="true" className="size-4" />
                    Remove reply
                  </PendingButton>
                </form>
              ) : null}
            </section>
          ) : null}

          {visibleResult ? (
            <p
              role="status"
              className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted-foreground)]"
            >
              {resultText(visibleResult)}
            </p>
          ) : null}
        </div>
      </Sheet>
    </div>
  );
}
