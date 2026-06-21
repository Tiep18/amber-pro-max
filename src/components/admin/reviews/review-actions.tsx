'use client';

import {useActionState} from 'react';
import {useFormStatus} from 'react-dom';
import {Check, EyeOff, MessageSquare, Trash2} from 'lucide-react';
import {
  approveProductReviewAction,
  hideProductReviewAction,
  removeReviewReplyAction,
  upsertReviewReplyAction,
  type ReviewAdminActionResult
} from '@/reviews/actions';
import type {ReviewStatus} from '@/reviews/queries';
import {Button} from '@/components/ui/button';

const initialState: ReviewAdminActionResult = {status: 'idle'};

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
  const {pending} = useFormStatus();
  return <Button type="submit" variant={variant} disabled={pending} className="gap-2">{children}</Button>;
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

export function ReviewActions({
  reviewId,
  version,
  status,
  replyBody,
  replyVersion
}: {
  reviewId: string;
  version: number;
  status: ReviewStatus;
  replyBody: string | null;
  replyVersion: number | null;
}) {
  const [approveState, approveAction] = useActionState(approveProductReviewAction, initialState);
  const [hideState, hideAction] = useActionState(hideProductReviewAction, initialState);
  const [replyState, replyAction] = useActionState(upsertReviewReplyAction, initialState);
  const [removeState, removeAction] = useActionState(removeReviewReplyAction, initialState);
  const visibleResult = [approveState, hideState, replyState, removeState].find((result) => result.status !== 'idle');

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {status !== 'approved' ? (
          <form action={approveAction}>
            <HiddenReviewFields reviewId={reviewId} version={version} status={status} />
            <PendingButton><Check aria-hidden="true" className="size-4" />Approve review</PendingButton>
          </form>
        ) : null}
        {status !== 'hidden' ? (
          <form action={hideAction} onSubmit={(event) => {
            if (!window.confirm('Hide this review from the storefront?')) event.preventDefault();
          }}>
            <HiddenReviewFields reviewId={reviewId} version={version} status={status} />
            <PendingButton variant="destructive"><EyeOff aria-hidden="true" className="size-4" />Hide review</PendingButton>
          </form>
        ) : null}
      </div>

      {status === 'approved' ? (
        <form action={replyAction} className="grid gap-2 border-l-2 border-[var(--border)] pl-3">
          <input type="hidden" name="reviewId" value={reviewId} />
          <input type="hidden" name="expectedReviewVersion" value={version} />
          <input type="hidden" name="expectedReviewStatus" value={status} />
          <label htmlFor={`reply-${reviewId}`} className="text-sm font-semibold">Shop reply</label>
          <textarea
            id={`reply-${reviewId}`}
            name="body"
            required
            maxLength={2000}
            defaultValue={replyBody ?? ''}
            className="min-h-24 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <PendingButton><MessageSquare aria-hidden="true" className="size-4" />Save reply</PendingButton>
          </div>
        </form>
      ) : null}

      {status === 'approved' && replyVersion !== null ? (
        <form action={removeAction} onSubmit={(event) => {
          if (!window.confirm('Remove the public admin reply?')) event.preventDefault();
        }}>
          <input type="hidden" name="reviewId" value={reviewId} />
          <input type="hidden" name="expectedReviewVersion" value={version} />
          <input type="hidden" name="expectedReviewStatus" value={status} />
          <input type="hidden" name="expectedReplyVersion" value={replyVersion} />
          <PendingButton variant="secondary"><Trash2 aria-hidden="true" className="size-4" />Remove reply</PendingButton>
        </form>
      ) : null}

      {visibleResult ? <p role="status" className="text-sm text-[var(--muted-foreground)]">{resultText(visibleResult)}</p> : null}
    </div>
  );
}
