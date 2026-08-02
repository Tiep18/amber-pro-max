'use client';

import { useActionState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  resolveLatePaymentReviewAction,
  type ResolveLatePaymentReviewResult
} from '@/payments/admin-actions';
import type { AdminOrderDetail } from '@/payments/queries';

type FormState = ResolveLatePaymentReviewResult | { status: 'idle' };

const initialState: FormState = { status: 'idle' };

async function resolveAction(_: FormState, formData: FormData): Promise<FormState> {
  const result = await resolveLatePaymentReviewAction(formData);
  if (result.status === 'settled') {
    toast.success('Stock was available. The order is now paid and fulfillment is unblocked.');
  } else if (result.status === 'still_blocked') {
    toast.warning(
      result.code === 'late_payment_window_elapsed'
        ? 'Too long has passed since the hold expired. Refund the customer instead.'
        : 'Still not enough stock to fill this order. Restock it or refund the customer.'
    );
  } else if (result.status === 'not_applicable') {
    toast.info('This order is no longer waiting on a stock recheck.');
  } else {
    toast.error('The recheck could not be completed.');
  }
  return result;
}

/**
 * The way out of `late_payment_out_of_stock`.
 *
 * The customer's money arrived and was verified; only the stock was missing.
 * Replaying the provider event cannot rescue this — PayPal reuses one capture
 * id for both the transition key and the event id, so a retry short-circuits
 * as a duplicate before the stock is looked at. This button re-runs the stock
 * check alone, against evidence the shop has already accepted.
 */
export function LateReviewResolution({ order }: { order: AdminOrderDetail }) {
  const [state, formAction, pending] = useActionState(resolveAction, initialState);

  if (order.reviewReason !== 'late_payment_out_of_stock') {
    return null;
  }

  return (
    <section
      aria-labelledby="late-review-heading"
      aria-busy={pending}
      className="rounded-[var(--radius-card)] border border-[var(--warning)] bg-[var(--warning-surface)] p-4"
    >
      <h2 id="late-review-heading" className="text-xl font-semibold">
        Payment received, stock unavailable
      </h2>
      <p className="mt-2 max-w-[70ch] text-sm">
        This customer paid, but by the time the payment was verified the stock it had reserved was
        gone, so the order was parked instead of being marked paid. Restock the items and recheck,
        or refund the customer.
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
        <input type="hidden" name="orderId" value={order.orderId} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`${order.orderNumber}-review-${Date.now()}`}
        />
        <Button type="submit" variant="secondary" disabled={pending} aria-disabled={pending}>
          {pending ? 'Rechecking stock' : 'Recheck stock and settle'}
        </Button>
        {state.status !== 'idle' ? (
          <p role="alert" className="text-sm font-semibold">
            Result: {state.status}
            {'code' in state && state.code ? ` (${state.code})` : ''}
          </p>
        ) : null}
      </form>
    </section>
  );
}
