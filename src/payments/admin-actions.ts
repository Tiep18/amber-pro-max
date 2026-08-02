'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/auth/guards';
import { triggerTransactionalEmailOutboxNow } from '@/fulfillment/email-outbox.server';
import { runMonitoredAction } from '@/operations/monitoring';
import {
  createAdminOrderQueryClient,
  getAdminOrderDetail,
  type AdminOrderDetail
} from '@/payments/queries';
import { applyPaymentTransition } from '@/payments/transitions';
import {
  buildVietQrConfirmTransition,
  buildVietQrRejectTransition,
  compareVietQrEvidence,
  isVietQrPaymentActionAvailable,
  vietQrEvidenceSchema,
  vietQrRejectionSchema,
  type VietQrAdminAction,
  type VietQrExpectedPayment
} from '@/payments/vietqr/evidence';

export type VietQrReviewCode =
  | 'late_payment_out_of_stock'
  | 'late_payment_window_elapsed'
  | 'late_payment_detected';

export type VietQrAdminActionResult =
  | { status: 'confirmed'; paymentStatus: string; lateSettlement: boolean }
  | { status: 'rejected'; paymentStatus: string }
  | { status: 'duplicate'; paymentStatus?: string }
  // The transfer was accepted as evidence but the order could not be settled —
  // most often because the stock it reserved has since been sold. The order is
  // parked for review; the shop refunds rather than promising goods it lacks.
  | { status: 'review_required'; code: VietQrReviewCode }
  | { status: 'stale'; code: string }
  | { status: 'invalid'; code: string }
  | { status: 'error'; code: 'vietqr_action_failed' };

const REVIEW_CODES: VietQrReviewCode[] = [
  'late_payment_out_of_stock',
  'late_payment_window_elapsed',
  'late_payment_detected'
];

function asReviewCode(code: string | undefined): VietQrReviewCode {
  return REVIEW_CODES.find((known) => known === code) ?? 'late_payment_detected';
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

function expectedFromOrder(order: AdminOrderDetail): VietQrExpectedPayment | null {
  if (!order.vietQrEvidence) {
    return null;
  }

  return {
    orderId: order.orderId,
    paymentId: order.paymentId,
    orderNumber: order.orderNumber,
    provider: order.provider,
    paymentStatus: order.paymentStatus,
    amountMinor: order.vietQrEvidence.expectedAmountMinor,
    currencyCode: order.currencyCode,
    transferReference: order.vietQrEvidence.transferReference,
    paymentDeadlineAt: order.vietQrEvidence.paymentDeadlineAt
  };
}

function mapConfirmResult(transition: {
  status: string;
  code?: string;
  paymentStatus?: string;
  lateSettlement?: boolean;
}): VietQrAdminActionResult {
  if (transition.status === 'applied') {
    return {
      status: 'confirmed',
      paymentStatus: transition.paymentStatus ?? 'paid',
      lateSettlement: transition.lateSettlement === true
    };
  }
  if (transition.status === 'duplicate') {
    return { status: 'duplicate', paymentStatus: transition.paymentStatus };
  }
  // Not a failure: the evidence was accepted, the order just cannot be settled
  // right now. Reporting this as an error made the admin think nothing had
  // happened when the order had in fact moved to the review queue.
  if (transition.status === 'review_required') {
    return { status: 'review_required', code: asReviewCode(transition.code) };
  }
  if (transition.status === 'stale') {
    return { status: 'stale', code: 'vietqr_transition_stale' };
  }
  return { status: 'error', code: 'vietqr_action_failed' };
}

function mapRejectResult(status: string, paymentStatus?: string): VietQrAdminActionResult {
  if (status === 'applied') {
    return { status: 'rejected', paymentStatus: paymentStatus ?? 'rejected' };
  }
  if (status === 'duplicate') {
    return { status: 'duplicate', paymentStatus };
  }
  if (status === 'stale') {
    return { status: 'stale', code: 'vietqr_transition_stale' };
  }
  return { status: 'error', code: 'vietqr_action_failed' };
}

async function recordVietQrAdminFailure(input: {
  action: 'confirm' | 'reject';
  severity?: 'warning' | 'error';
  code: string;
  summary: string;
  expected?: VietQrExpectedPayment | null;
  orderId?: string;
}) {
  await runMonitoredAction({
    area: 'payment',
    action: input.action,
    severity: input.severity ?? 'error',
    errorCode: input.code,
    summary: input.summary,
    errorResult: { status: 'error', code: input.code },
    shouldRecordResult: () => true,
    facts: {
      provider: 'vietqr',
      orderId: input.expected?.orderId ?? input.orderId ?? null,
      orderNumber: input.expected?.orderNumber ?? null,
      paymentId: input.expected?.paymentId ?? null,
      paymentStatus: input.expected?.paymentStatus ?? null,
      amountValue: input.expected?.amountMinor ?? null,
      currency: input.expected?.currencyCode ?? null
    },
    operation: async () => ({ status: 'error', code: input.code })
  });
}

async function loadExpectedPayment(
  orderId: string,
  admin: unknown,
  action: VietQrAdminAction = 'confirm'
) {
  const client = await createAdminOrderQueryClient();
  const detail = await getAdminOrderDetail({
    orderId,
    client,
    requireAdmin: async () => admin
  });
  if (detail.status !== 'success') {
    return { status: detail.status, client, expected: null as VietQrExpectedPayment | null };
  }

  const expected = expectedFromOrder(detail.order);
  const available =
    action === 'reject'
      ? detail.order.vietQrEvidence?.rejectAvailable
      : detail.order.vietQrEvidence?.actionAvailable;
  if (!expected || !available || !isVietQrPaymentActionAvailable(expected, action)) {
    return { status: 'stale', client, expected };
  }

  return { status: 'success', client, expected };
}

export async function confirmVietQrPaymentAction(
  formData: FormData
): Promise<VietQrAdminActionResult> {
  const admin = await requireAdmin();
  const parsed = vietQrEvidenceSchema
    .extend({ orderId: vietQrEvidenceSchema.shape.idempotencyKey.min(1).max(80) })
    .safeParse({
      orderId: getFormString(formData, 'orderId'),
      bankReference: getFormString(formData, 'bankReference'),
      receivedAmountMinor: getFormString(formData, 'receivedAmountMinor'),
      receivedAt: getFormString(formData, 'receivedAt'),
      idempotencyKey: getFormString(formData, 'idempotencyKey'),
      adminNote: getFormString(formData, 'adminNote') ?? undefined,
      privateReceiptPath: getFormString(formData, 'privateReceiptPath') ?? undefined
    });
  if (!parsed.success) {
    await recordVietQrAdminFailure({
      action: 'confirm',
      severity: 'warning',
      code: 'invalid_vietqr_evidence',
      summary: 'VietQR admin confirmation evidence validation failed',
      orderId: getFormString(formData, 'orderId')
    });
    return { status: 'invalid', code: 'invalid_vietqr_evidence' };
  }

  const loaded = await loadExpectedPayment(parsed.data.orderId, admin);
  if (loaded.status !== 'success' || !loaded.expected) {
    await recordVietQrAdminFailure({
      action: 'confirm',
      severity: 'warning',
      code: 'vietqr_action_not_available',
      summary: 'VietQR admin confirmation action unavailable',
      expected: loaded.expected,
      orderId: parsed.data.orderId
    });
    return {
      status: loaded.status === 'stale' ? 'stale' : 'invalid',
      code: 'vietqr_action_not_available'
    };
  }

  const comparison = compareVietQrEvidence(loaded.expected, parsed.data);
  if (comparison.status === 'mismatch') {
    await recordVietQrAdminFailure({
      action: 'confirm',
      severity: 'warning',
      code: comparison.code,
      summary: 'VietQR admin confirmation evidence rejected',
      expected: loaded.expected
    });
    return { status: 'invalid', code: comparison.code };
  }

  const transition = await applyPaymentTransition(
    buildVietQrConfirmTransition({ expected: loaded.expected, evidence: parsed.data }),
    loaded.client
  );
  if (
    (transition.status === 'applied' || transition.status === 'duplicate') &&
    transition.paymentStatus === 'paid'
  ) {
    await triggerTransactionalEmailOutboxNow({ reason: 'vietqr_admin_paid' });
  }
  if (transition.status === 'review_required') {
    // Expected outcome, not a bug: record it as a warning so it is visible in
    // operations without being counted as a failed action.
    await recordVietQrAdminFailure({
      action: 'confirm',
      severity: 'warning',
      code: asReviewCode(transition.code),
      summary: 'VietQR admin confirmation parked for review',
      expected: loaded.expected
    });
  } else if (
    transition.status !== 'applied' &&
    transition.status !== 'duplicate' &&
    transition.status !== 'stale'
  ) {
    await recordVietQrAdminFailure({
      action: 'confirm',
      severity: 'error',
      code: 'vietqr_action_failed',
      summary: 'VietQR admin confirmation transition failed',
      expected: loaded.expected
    });
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${encodeURIComponent(loaded.expected.orderNumber)}`);
  return mapConfirmResult(transition);
}

export type ResolveLatePaymentReviewResult =
  | { status: 'settled'; paymentStatus: string }
  | { status: 'still_blocked'; code: VietQrReviewCode }
  | { status: 'not_applicable'; code: string }
  | { status: 'error'; code: 'review_resolution_failed' };

/**
 * Re-runs the stock check for an order parked at `late_payment_out_of_stock`.
 *
 * Provider-agnostic on purpose. VietQR could always be rescued by confirming
 * again with a fresh idempotency key, but PayPal could not: it reuses one
 * capture id for both the transition key and the provider event id, so every
 * replay short-circuits as a duplicate before the stock is looked at, the
 * capture route refuses an order past its deadline, and there was no admin
 * path at all. That left a paid PayPal order stuck in review permanently.
 */
export async function resolveLatePaymentReviewAction(
  formData: FormData
): Promise<ResolveLatePaymentReviewResult> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      orderId: z.string().trim().min(1).max(80),
      idempotencyKey: z.string().trim().min(8).max(160)
    })
    .safeParse({
      orderId: getFormString(formData, 'orderId'),
      idempotencyKey: getFormString(formData, 'idempotencyKey')
    });
  if (!parsed.success) {
    return { status: 'not_applicable', code: 'invalid_review_resolution' };
  }

  const client = await createAdminOrderQueryClient();
  const detail = await getAdminOrderDetail({
    orderId: parsed.data.orderId,
    client,
    requireAdmin: async () => admin
  });
  if (detail.status !== 'success') {
    return { status: 'not_applicable', code: 'order_not_found' };
  }
  if (detail.order.reviewReason !== 'late_payment_out_of_stock') {
    // The RPC enforces this too; refusing here keeps the audit trail clean of
    // attempts that were never going to be valid.
    return { status: 'not_applicable', code: 'review_not_stock_blocked' };
  }

  const transition = await applyPaymentTransition(
    {
      transitionKey: `review-resolution:${parsed.data.idempotencyKey}`,
      source: 'admin_review_resolution',
      targetStatus: 'paid',
      orderNumber: detail.order.orderNumber,
      eventType: 'REVIEW.STOCK.RECHECKED',
      verificationStatus: 'admin_verified'
    },
    client
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${encodeURIComponent(detail.order.orderNumber)}`);

  if (transition.status === 'applied' && transition.paymentStatus === 'paid') {
    await triggerTransactionalEmailOutboxNow({ reason: 'late_review_settled' });
    return { status: 'settled', paymentStatus: 'paid' };
  }
  if (transition.status === 'review_required') {
    return { status: 'still_blocked', code: asReviewCode(transition.code) };
  }
  if (transition.status === 'invalid' || transition.status === 'stale') {
    return { status: 'not_applicable', code: transition.code ?? 'review_not_resolvable' };
  }
  return { status: 'error', code: 'review_resolution_failed' };
}

export async function rejectVietQrPaymentAction(
  formData: FormData
): Promise<VietQrAdminActionResult> {
  const admin = await requireAdmin();
  const parsed = vietQrRejectionSchema
    .extend({ orderId: vietQrEvidenceSchema.shape.idempotencyKey.min(1).max(80) })
    .safeParse({
      orderId: getFormString(formData, 'orderId'),
      reason: getFormString(formData, 'reason'),
      note: getFormString(formData, 'note') ?? undefined,
      idempotencyKey: getFormString(formData, 'idempotencyKey')
    });
  if (!parsed.success) {
    await recordVietQrAdminFailure({
      action: 'reject',
      severity: 'warning',
      code: 'invalid_vietqr_rejection',
      summary: 'VietQR admin rejection validation failed',
      orderId: getFormString(formData, 'orderId')
    });
    return { status: 'invalid', code: 'invalid_vietqr_rejection' };
  }

  const loaded = await loadExpectedPayment(parsed.data.orderId, admin, 'reject');
  if (loaded.status !== 'success' || !loaded.expected) {
    await recordVietQrAdminFailure({
      action: 'reject',
      severity: 'warning',
      code: 'vietqr_action_not_available',
      summary: 'VietQR admin rejection action unavailable',
      expected: loaded.expected,
      orderId: parsed.data.orderId
    });
    return {
      status: loaded.status === 'stale' ? 'stale' : 'invalid',
      code: 'vietqr_action_not_available'
    };
  }

  const transition = await applyPaymentTransition(
    buildVietQrRejectTransition({ expected: loaded.expected, rejection: parsed.data }),
    loaded.client
  );
  if (
    transition.status !== 'applied' &&
    transition.status !== 'duplicate' &&
    transition.status !== 'stale'
  ) {
    await recordVietQrAdminFailure({
      action: 'reject',
      severity: 'error',
      code: 'vietqr_action_failed',
      summary: 'VietQR admin rejection transition failed',
      expected: loaded.expected
    });
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${encodeURIComponent(loaded.expected.orderNumber)}`);
  return mapRejectResult(transition.status, transition.paymentStatus);
}
