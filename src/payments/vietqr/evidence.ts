import {z} from 'zod';

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

export function isVietQrPaymentActionAvailable(expected: VietQrExpectedPayment, now = new Date()) {
  const deadline = expected.paymentDeadlineAt ? Date.parse(expected.paymentDeadlineAt) : Number.NaN;
  return (
    expected.provider === 'vietqr' &&
    expected.currencyCode === 'VND' &&
    (expected.paymentStatus === 'pending' || expected.paymentStatus === 'verifying') &&
    Number.isFinite(deadline) &&
    deadline > now.getTime()
  );
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
