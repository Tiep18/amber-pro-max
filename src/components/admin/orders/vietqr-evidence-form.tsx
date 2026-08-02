'use client';

import { useActionState, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  confirmVietQrPaymentAction,
  rejectVietQrPaymentAction,
  type VietQrAdminActionResult
} from '@/payments/admin-actions';
import type { AdminOrderDetail } from '@/payments/queries';
import { formatAdminDate, formatAdminMoney } from './format';

type FormState = VietQrAdminActionResult | { status: 'idle' };

const initialState: FormState = { status: 'idle' };

function idempotencyKey(orderNumber: string, action: string) {
  return `${orderNumber}-${action}-${Date.now()}`;
}

async function confirmAction(_: FormState, formData: FormData): Promise<FormState> {
  const result = await confirmVietQrPaymentAction(formData);
  notifyVietQrResult(result, 'confirm');
  return result;
}

async function rejectAction(_: FormState, formData: FormData): Promise<FormState> {
  const result = await rejectVietQrPaymentAction(formData);
  notifyVietQrResult(result, 'reject');
  return result;
}

const REVIEW_MESSAGES: Record<string, string> = {
  late_payment_out_of_stock:
    'The transfer was recorded, but this order can no longer be filled — the stock it held has been sold. Refund the customer.',
  late_payment_window_elapsed:
    'This payment arrived too long after the hold expired to be settled automatically. Refund the customer.',
  late_payment_detected: 'The order was parked for review instead of being settled.'
};

function notifyVietQrResult(result: VietQrAdminActionResult, action: 'confirm' | 'reject') {
  if (result.status === 'confirmed') {
    toast.success(
      result.lateSettlement
        ? 'Late payment settled. Stock was re-checked and the order is now paid.'
        : 'Payment confirmed successfully.'
    );
    return;
  }
  if (result.status === 'rejected') {
    toast.success('Payment evidence rejected successfully.');
    return;
  }
  if (result.status === 'duplicate') {
    toast.info('This payment decision was already recorded.');
    return;
  }
  // Not an error: the evidence was accepted, the order just moved to review.
  if (result.status === 'review_required') {
    toast.warning(REVIEW_MESSAGES[result.code] ?? REVIEW_MESSAGES.late_payment_detected);
    return;
  }
  if (result.status === 'stale') {
    toast.warning('Payment state changed. Refresh and review the latest evidence.');
    return;
  }
  if (result.status === 'invalid') {
    toast.error(
      action === 'confirm'
        ? 'Review the payment confirmation evidence.'
        : 'Review the payment rejection details.'
    );
    return;
  }
  toast.error('The VietQR payment decision could not be completed.');
}

function ResultMessage({ state }: { state: FormState }) {
  if (state.status === 'idle') {
    return null;
  }
  const tone =
    state.status === 'confirmed' || state.status === 'rejected'
      ? 'text-[var(--success)]'
      : state.status === 'review_required' || state.status === 'duplicate'
        ? 'text-[var(--warning)]'
        : 'text-[var(--destructive)]';
  return (
    <p
      role="alert"
      className={`rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-3 text-sm font-semibold ${tone}`}
    >
      Result: {state.status}
      {'code' in state && state.code ? ` (${state.code})` : ''}
    </p>
  );
}

export function VietQrEvidenceForm({ order }: { order: AdminOrderDetail }) {
  const [confirmState, confirmFormAction, confirmPending] = useActionState(
    confirmAction,
    initialState
  );
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rejectAction, initialState);
  const [receivedAt, setReceivedAt] = useState('');
  const evidence = order.vietQrEvidence;
  const decisionPending = confirmPending || rejectPending;

  if (!evidence) {
    return null;
  }

  return (
    <section
      aria-labelledby="vietqr-decision-heading"
      aria-busy={decisionPending}
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <h2 id="vietqr-decision-heading" className="text-xl font-semibold">
        VietQR evidence decision
      </h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold">Expected reference</dt>
          <dd>{evidence.transferReference}</dd>
        </div>
        <div>
          <dt className="font-semibold">Expected amount</dt>
          <dd>{formatAdminMoney(evidence.expectedAmountMinor, order.currencyCode)}</dd>
        </div>
        <div>
          <dt className="font-semibold">Payment deadline</dt>
          <dd>{formatAdminDate(evidence.paymentDeadlineAt)}</dd>
        </div>
      </dl>

      {evidence.lateSettlement ? (
        <p
          role="status"
          className="mt-3 rounded-[var(--radius-card)] bg-[var(--warning-surface)] p-3 text-sm font-semibold text-[var(--warning)]"
        >
          The hold on this order has already expired. Confirming settles a late payment: stock is
          re-checked first, and if it is gone the order is parked for a refund instead of being
          marked paid.
        </p>
      ) : null}
      {!evidence.actionAvailable ? (
        <p
          role="status"
          className="mt-3 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted-foreground)]"
        >
          {evidence.closedReason === 'window_elapsed'
            ? 'Too long has passed since the hold expired to settle this payment here. Refund the customer instead.'
            : evidence.closedReason === 'settled'
              ? 'This payment already has a final decision.'
              : 'No VietQR decision is available for this order.'}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form
          action={confirmFormAction}
          className="grid gap-3 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-3"
        >
          <input type="hidden" name="orderId" value={order.orderId} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={idempotencyKey(order.orderNumber, 'confirm')}
          />
          <label className="grid gap-1 text-sm font-semibold">
            Bank reference
            <input
              name="bankReference"
              required
              disabled={decisionPending}
              defaultValue={evidence.transferReference}
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Received amount
            <input
              name="receivedAmountMinor"
              required
              disabled={decisionPending}
              inputMode="numeric"
              defaultValue={String(evidence.expectedAmountMinor)}
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Received at
            <DateTimePicker
              name="receivedAt"
              value={receivedAt}
              onChange={setReceivedAt}
              required
              disabled={decisionPending}
              submissionFormat="iso"
              aria-label="Received at"
              placeholder="Choose received date and time"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Private receipt path
            <input
              name="privateReceiptPath"
              disabled={decisionPending}
              placeholder="private/vietqr/receipt.jpg"
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Admin note
            <textarea
              name="adminNote"
              disabled={decisionPending}
              className="min-h-24 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2"
            />
          </label>
          <Button
            type="submit"
            disabled={!evidence.actionAvailable || !receivedAt || decisionPending}
            aria-disabled={!evidence.actionAvailable || !receivedAt || decisionPending}
          >
            {confirmPending ? 'Confirming payment' : 'Confirm payment'}
          </Button>
          <ResultMessage state={confirmState} />
        </form>

        <form
          action={rejectFormAction}
          className="grid gap-3 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-3"
        >
          <input type="hidden" name="orderId" value={order.orderId} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={idempotencyKey(order.orderNumber, 'reject')}
          />
          <label className="grid gap-1 text-sm font-semibold">
            Reject reason
            <input
              name="reason"
              required
              disabled={decisionPending}
              placeholder="amount_mismatch"
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Decision note
            <textarea
              name="note"
              required
              disabled={decisionPending}
              className="min-h-24 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2"
            />
          </label>
          <label className="flex min-h-11 items-start gap-2 text-sm font-semibold">
            <input type="checkbox" required disabled={decisionPending} className="mt-1 h-5 w-5" />I
            understand this rejects the payment evidence, releases held inventory, and the same
            order cannot be retried.
          </label>
          <p className="text-sm text-[var(--muted-foreground)]">
            Rejecting releases reserved inventory and this same order cannot be retried.
          </p>
          {/* Rejecting a lapsed order is not a transition the state machine
              accepts — it returns `stale`. The order is already expired, its
              stock already released, and the customer already told so. */}
          {!evidence.rejectAvailable && evidence.actionAvailable ? (
            <p className="text-sm font-semibold text-[var(--muted-foreground)]">
              The hold on this order has expired, so there is nothing left to reject. Confirm the
              transfer if it is genuine, otherwise refund the customer.
            </p>
          ) : null}
          <Button
            type="submit"
            variant="destructive"
            disabled={!evidence.rejectAvailable || decisionPending}
            aria-disabled={!evidence.rejectAvailable || decisionPending}
          >
            {rejectPending ? 'Rejecting payment' : 'Reject payment'}
          </Button>
          <ResultMessage state={rejectState} />
        </form>
      </div>
    </section>
  );
}
