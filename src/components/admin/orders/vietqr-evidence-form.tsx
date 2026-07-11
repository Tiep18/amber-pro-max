'use client';

import { useActionState, useState } from 'react';

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
  return confirmVietQrPaymentAction(formData);
}

async function rejectAction(_: FormState, formData: FormData): Promise<FormState> {
  return rejectVietQrPaymentAction(formData);
}

function ResultMessage({ state }: { state: FormState }) {
  if (state.status === 'idle') {
    return null;
  }
  const tone =
    state.status === 'confirmed' || state.status === 'rejected'
      ? 'text-[var(--success)]'
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

  if (!evidence) {
    return null;
  }

  return (
    <section
      aria-labelledby="vietqr-decision-heading"
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
              defaultValue={evidence.transferReference}
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Received amount
            <input
              name="receivedAmountMinor"
              required
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
              submissionFormat="iso"
              aria-label="Received at"
              placeholder="Choose received date and time"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Private receipt path
            <input
              name="privateReceiptPath"
              placeholder="private/vietqr/receipt.jpg"
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Admin note
            <textarea
              name="adminNote"
              className="min-h-24 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2"
            />
          </label>
          <Button
            type="submit"
            disabled={!evidence.actionAvailable || !receivedAt || confirmPending}
            aria-disabled={!evidence.actionAvailable || !receivedAt || confirmPending}
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
              placeholder="amount_mismatch"
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Decision note
            <textarea
              name="note"
              required
              className="min-h-24 rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2"
            />
          </label>
          <label className="flex min-h-11 items-start gap-2 text-sm font-semibold">
            <input type="checkbox" required className="mt-1 h-5 w-5" />I understand this rejects the
            payment evidence, releases held inventory, and the same order cannot be retried.
          </label>
          <p className="text-sm text-[var(--muted-foreground)]">
            Rejecting releases reserved inventory and this same order cannot be retried.
          </p>
          <Button
            type="submit"
            variant="destructive"
            disabled={!evidence.actionAvailable || rejectPending}
            aria-disabled={!evidence.actionAvailable || rejectPending}
          >
            {rejectPending ? 'Rejecting payment' : 'Reject payment'}
          </Button>
          <ResultMessage state={rejectState} />
        </form>
      </div>
    </section>
  );
}
