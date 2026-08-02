import {z} from 'zod';

import {LATE_SETTLEMENT_WINDOW_DAYS} from '@/payments/reservation';
import type {PaymentInternalStatus, PaymentTransitionInput} from '@/payments/types';

export type VietQrExpectedPayment = {
  orderId: string;
  paymentId?: string | null;
  orderNumber: string;
  provider: 'vietqr' | string;
  paymentStatus: PaymentInternalStatus;
  amountMinor: number;
  currencyCode: 'VND' | 'USD' | string;
  transferReference: string;
  paymentDeadlineAt: string | null;
};

export const vietQrEvidenceSchema = z.object({
  bankReference: z.string().trim().min(1).max(120),
  receivedAmountMinor: z.coerce.number().int().positive(),
  receivedAt: z.iso.datetime(),
  idempotencyKey: z.string().trim().min(8).max(160),
  adminNote: z.string().trim().max(1000).optional(),
  privateReceiptPath: z
    .string()
    .trim()
    .max(500)
    .refine((value) => !/^https?:\/\//i.test(value), {message: 'receipt path must not be public URL'})
    .optional()
});

export const vietQrRejectionSchema = z
  .object({
    reason: z.enum(['wrong_amount', 'wrong_reference', 'expired', 'other']),
    note: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().trim().min(8).max(160)
  })
  .refine((value) => value.reason !== 'other' || Boolean(value.note), {
    message: 'other rejection requires a note',
    path: ['note']
  });

export type VietQrEvidenceInput = z.input<typeof vietQrEvidenceSchema>;
export type ParsedVietQrEvidence = z.output<typeof vietQrEvidenceSchema>;
export type VietQrRejectionInput = z.input<typeof vietQrRejectionSchema>;
export type ParsedVietQrRejection = z.output<typeof vietQrRejectionSchema>;

export type VietQrEvidenceComparison =
  | {status: 'matched'}
  | {status: 'mismatch'; code: 'vietqr_reference_mismatch' | 'vietqr_amount_mismatch'};

function noteProvided(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function compareVietQrEvidence(expected: VietQrExpectedPayment, evidence: ParsedVietQrEvidence): VietQrEvidenceComparison {
  if (evidence.bankReference !== expected.transferReference) {
    return {status: 'mismatch', code: 'vietqr_reference_mismatch'};
  }
  if (evidence.receivedAmountMinor !== expected.amountMinor) {
    return {status: 'mismatch', code: 'vietqr_amount_mismatch'};
  }
  return {status: 'matched'};
}

const LATE_SETTLEMENT_WINDOW_MS = LATE_SETTLEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Still inside the original hold.
const ON_TIME_STATUSES: PaymentInternalStatus[] = ['pending', 'verifying'];

// The hold is gone but the money may still be real: the expiry job flipped the
// order to `expired`, or a late provider event parked it in `review_required`.
// `rejected` is deliberately absent — reversing an explicit admin rejection is
// a different decision than accepting a transfer that simply arrived late.
const LATE_STATUSES: PaymentInternalStatus[] = ['expired', 'review_required'];

export type VietQrActionWindow =
  | {status: 'open'; late: false}
  | {status: 'open'; late: true; deadlinePassedAt: string}
  | {status: 'closed'; code: 'not_vietqr' | 'no_deadline' | 'settled' | 'window_elapsed'};

/**
 * Whether the shop may still act on this VietQR payment, and whether doing so
 * counts as a late settlement.
 *
 * A bank transfer does not stop being real at the moment the 24h hold lapses,
 * and a shop that reconciles its statement once a day would otherwise be
 * unable to accept any of them. `apply_payment_transition` enforces the same
 * window server-side and re-checks stock before it settles.
 */
export function resolveVietQrActionWindow(
  expected: VietQrExpectedPayment,
  now = new Date()
): VietQrActionWindow {
  if (expected.provider !== 'vietqr' || expected.currencyCode !== 'VND') {
    return {status: 'closed', code: 'not_vietqr'};
  }

  const deadline = expected.paymentDeadlineAt ? Date.parse(expected.paymentDeadlineAt) : Number.NaN;
  if (!Number.isFinite(deadline)) {
    return {status: 'closed', code: 'no_deadline'};
  }

  const nowMs = now.getTime();
  const isOnTimeStatus = ON_TIME_STATUSES.includes(expected.paymentStatus);
  if (isOnTimeStatus && deadline > nowMs) {
    return {status: 'open', late: false};
  }
  if (!isOnTimeStatus && !LATE_STATUSES.includes(expected.paymentStatus)) {
    return {status: 'closed', code: 'settled'};
  }
  if (nowMs >= deadline + LATE_SETTLEMENT_WINDOW_MS) {
    return {status: 'closed', code: 'window_elapsed'};
  }

  return {status: 'open', late: true, deadlinePassedAt: new Date(deadline).toISOString()};
}

export type VietQrAdminAction = 'confirm' | 'reject';

/**
 * Rejection is deliberately **not** offered once the hold has lapsed.
 *
 * `apply_payment_transition` only treats `paid` as a late-settleable target;
 * a late `rejected` falls through to the terminal branch and comes back
 * `stale`. Offering the button anyway would have the admin press it and be
 * told the payment state had changed. There is also nothing to reject: the
 * order is already expired, its stock already released, and the customer has
 * already been told so.
 */
export function isVietQrPaymentActionAvailable(
  expected: VietQrExpectedPayment,
  action: VietQrAdminAction = 'confirm',
  now = new Date()
) {
  const window = resolveVietQrActionWindow(expected, now);
  if (window.status !== 'open') {
    return false;
  }
  return action === 'confirm' || !window.late;
}

export function buildVietQrConfirmTransition({
  expected,
  evidence
}: {
  expected: VietQrExpectedPayment;
  evidence: ParsedVietQrEvidence;
}): PaymentTransitionInput {
  return {
    transitionKey: `vietqr-confirm:${evidence.idempotencyKey}`,
    source: 'vietqr_admin',
    targetStatus: 'paid',
    paymentId: expected.paymentId ?? undefined,
    orderNumber: expected.orderNumber,
    eventType: 'VIETQR.PAYMENT.CONFIRMED',
    verificationStatus: 'admin_verified',
    amountMinor: evidence.receivedAmountMinor,
    currencyCode: 'VND',
    bankReference: evidence.bankReference,
    receivedAmountMinor: evidence.receivedAmountMinor,
    receivedAt: evidence.receivedAt,
    adminNote: evidence.adminNote,
    sanitizedFacts: {
      transferReference: expected.transferReference,
      evidenceMatched: true,
      noteProvided: noteProvided(evidence.adminNote),
      privateReceiptPath: evidence.privateReceiptPath
    }
  };
}

export function buildVietQrRejectTransition({
  expected,
  rejection
}: {
  expected: VietQrExpectedPayment;
  rejection: ParsedVietQrRejection;
}): PaymentTransitionInput {
  return {
    transitionKey: `vietqr-reject:${rejection.idempotencyKey}`,
    source: 'vietqr_admin',
    targetStatus: 'rejected',
    paymentId: expected.paymentId ?? undefined,
    orderNumber: expected.orderNumber,
    eventType: 'VIETQR.PAYMENT.REJECTED',
    verificationStatus: 'rejected',
    amountMinor: expected.amountMinor,
    currencyCode: 'VND',
    releaseReason: `vietqr_${rejection.reason}`,
    adminNote: rejection.note,
    sanitizedFacts: {
      transferReference: expected.transferReference,
      rejectionReason: rejection.reason,
      noteProvided: noteProvided(rejection.note)
    }
  };
}
