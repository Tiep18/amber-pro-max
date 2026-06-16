'use server';

import {revalidatePath} from 'next/cache';

import {requireAdmin} from '@/auth/guards';
import {createAdminOrderQueryClient, getAdminOrderDetail, type AdminOrderDetail} from '@/payments/queries';
import {applyPaymentTransition} from '@/payments/transitions';
import {
  buildVietQrConfirmTransition,
  buildVietQrRejectTransition,
  compareVietQrEvidence,
  isVietQrPaymentActionAvailable,
  vietQrEvidenceSchema,
  vietQrRejectionSchema,
  type VietQrExpectedPayment
} from '@/payments/vietqr/evidence';

export type VietQrAdminActionResult =
  | {status: 'confirmed'; paymentStatus: string}
  | {status: 'rejected'; paymentStatus: string}
  | {status: 'duplicate'; paymentStatus?: string}
  | {status: 'stale'; code: string}
  | {status: 'invalid'; code: string}
  | {status: 'error'; code: 'vietqr_action_failed'};

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

function mapConfirmResult(status: string, paymentStatus?: string): VietQrAdminActionResult {
  if (status === 'applied') {
    return {status: 'confirmed', paymentStatus: paymentStatus ?? 'paid'};
  }
  if (status === 'duplicate') {
    return {status: 'duplicate', paymentStatus};
  }
  if (status === 'stale') {
    return {status: 'stale', code: 'vietqr_transition_stale'};
  }
  return {status: 'error', code: 'vietqr_action_failed'};
}

function mapRejectResult(status: string, paymentStatus?: string): VietQrAdminActionResult {
  if (status === 'applied') {
    return {status: 'rejected', paymentStatus: paymentStatus ?? 'rejected'};
  }
  if (status === 'duplicate') {
    return {status: 'duplicate', paymentStatus};
  }
  if (status === 'stale') {
    return {status: 'stale', code: 'vietqr_transition_stale'};
  }
  return {status: 'error', code: 'vietqr_action_failed'};
}

async function loadExpectedPayment(orderId: string, admin: unknown) {
  const client = await createAdminOrderQueryClient();
  const detail = await getAdminOrderDetail({
    orderId,
    client,
    requireAdmin: async () => admin
  });
  if (detail.status !== 'success') {
    return {status: detail.status, client, expected: null as VietQrExpectedPayment | null};
  }

  const expected = expectedFromOrder(detail.order);
  if (!expected || !detail.order.vietQrEvidence?.actionAvailable || !isVietQrPaymentActionAvailable(expected)) {
    return {status: 'stale', client, expected};
  }

  return {status: 'success', client, expected};
}

export async function confirmVietQrPaymentAction(formData: FormData): Promise<VietQrAdminActionResult> {
  const admin = await requireAdmin();
  const parsed = vietQrEvidenceSchema
    .extend({orderId: vietQrEvidenceSchema.shape.idempotencyKey.min(1).max(80)})
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
    return {status: 'invalid', code: 'invalid_vietqr_evidence'};
  }

  const loaded = await loadExpectedPayment(parsed.data.orderId, admin);
  if (loaded.status !== 'success' || !loaded.expected) {
    return {status: loaded.status === 'stale' ? 'stale' : 'invalid', code: 'vietqr_action_not_available'};
  }

  const comparison = compareVietQrEvidence(loaded.expected, parsed.data);
  if (comparison.status === 'mismatch') {
    return {status: 'invalid', code: comparison.code};
  }

  const transition = await applyPaymentTransition(
    buildVietQrConfirmTransition({expected: loaded.expected, evidence: parsed.data}),
    loaded.client
  );
  revalidatePath('/admin/orders');
  return mapConfirmResult(transition.status, transition.paymentStatus);
}

export async function rejectVietQrPaymentAction(formData: FormData): Promise<VietQrAdminActionResult> {
  const admin = await requireAdmin();
  const parsed = vietQrRejectionSchema
    .extend({orderId: vietQrEvidenceSchema.shape.idempotencyKey.min(1).max(80)})
    .safeParse({
      orderId: getFormString(formData, 'orderId'),
      reason: getFormString(formData, 'reason'),
      note: getFormString(formData, 'note') ?? undefined,
      idempotencyKey: getFormString(formData, 'idempotencyKey')
    });
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_vietqr_rejection'};
  }

  const loaded = await loadExpectedPayment(parsed.data.orderId, admin);
  if (loaded.status !== 'success' || !loaded.expected) {
    return {status: loaded.status === 'stale' ? 'stale' : 'invalid', code: 'vietqr_action_not_available'};
  }

  const transition = await applyPaymentTransition(
    buildVietQrRejectTransition({expected: loaded.expected, rejection: parsed.data}),
    loaded.client
  );
  revalidatePath('/admin/orders');
  return mapRejectResult(transition.status, transition.paymentStatus);
}
