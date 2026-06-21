'use client';

import {useActionState} from 'react';
import {submitProductReviewAction, type ReviewActionState} from '@/reviews/actions';
import type {Locale} from '@/i18n/routing';

const initialState: ReviewActionState = {status: 'idle'};

export function ReviewForm({
  productId,
  locale,
  returnTo,
  labels
}: {
  productId: string;
  locale: Locale;
  returnTo: string;
  labels: {
    title: string;
    rating: string;
    reviewTitle: string;
    body: string;
    submit: string;
    pending: string;
    notEligible: string;
    error: string;
  };
}) {
  const [state, action, pending] = useActionState(submitProductReviewAction, initialState);
  return (
    <form action={action} className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
      <h2 className="text-xl font-semibold">{labels.title}</h2>
      {state.status === 'pending' ? <p role="status" className="text-sm font-semibold text-[var(--success)]">{labels.pending}</p> : null}
      {state.status === 'not_eligible' ? <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">{labels.notEligible}</p> : null}
      {state.status === 'error' || state.status === 'invalid' ? <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">{labels.error}</p> : null}
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <fieldset className="flex gap-3" aria-label={labels.rating}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <label key={rating} className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)]">
            <input className="sr-only" type="radio" name="rating" value={rating} required />
            {rating}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-2">
        <span className="font-semibold">{labels.reviewTitle}</span>
        <input name="title" maxLength={120} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3" />
      </label>
      <label className="grid gap-2">
        <span className="font-semibold">{labels.body}</span>
        <textarea name="body" maxLength={2000} rows={4} className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3" />
      </label>
      <button type="submit" disabled={pending} className="inline-flex min-h-11 w-fit items-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 font-semibold text-white">
        {labels.submit}
      </button>
    </form>
  );
}
