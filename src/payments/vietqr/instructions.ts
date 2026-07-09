import 'server-only';

import {runMonitoredAction} from '@/operations/monitoring';
import {applyPaymentTransition} from '@/payments/transitions';
import type {PaymentInternalStatus, PaymentTransitionResult} from '@/payments/types';

export type VietQrServerConfig =
  | {
      status: 'configured';
      bankId: string;
      accountNo: string;
      accountName: string;
      template: string;
    }
  | {
      status: 'unconfigured';
      code: 'missing_vietqr_server_config';
      template: string;
    };

export type VietQrInstructionSnapshot = {
  orderId: string;
  paymentId: string | null;
  orderNumber: string;
  amountMinor: number;
  currencyCode: 'VND';
  transferReference: string;
  bankId: string;
  accountName: string;
  accountNoMasked: string;
  template: string;
  qrImageUrl: string;
  paymentDeadlineAt: string;
};

export type VietQrInstructionOrder = {
  orderId: string;
  paymentId?: string | null;
  orderNumber: string;
  market: 'vn' | 'intl' | string;
  currencyCode: 'VND' | 'USD' | string;
  paymentIntent: 'vietqr_intent' | 'paypal_intent' | string;
  paymentStatus: PaymentInternalStatus;
  amountMinor: number;
  reservationExpiresAt: string | null;
  existingInstruction?: VietQrInstructionSnapshot | null;
};

type TransitionClient = Parameters<typeof applyPaymentTransition>[1];

export type VietQrInstructionResult =
  | {status: 'ready'; instruction: VietQrInstructionSnapshot; transition?: PaymentTransitionResult}
  | {status: 'unconfigured'; code: 'missing_vietqr_server_config'}
  | {
      status: 'invalid';
      code:
        | 'vietqr_order_not_eligible'
        | 'invalid_vietqr_amount'
        | 'invalid_vietqr_reference'
        | 'vietqr_payment_window_closed';
    }
  | {status: 'error'; code: 'vietqr_instruction_snapshot_failed'};

function isTerminalStatus(status: PaymentInternalStatus) {
  return status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'rejected' || status === 'expired';
}

function isAsciiReference(value: string) {
  return /^[\x20-\x7E]+$/.test(value) && value.trim() === value && value.length <= 80;
}

function maskAccountNo(accountNo: string) {
  const visible = accountNo.slice(-4);
  return `${'*'.repeat(Math.max(accountNo.length - visible.length, 0))}${visible}`;
}

function buildQuickLinkUrl(config: Extract<VietQrServerConfig, {status: 'configured'}>, amountMinor: number, reference: string) {
  const bankPath = `${encodeURIComponent(config.bankId)}-${encodeURIComponent(config.accountNo)}-${encodeURIComponent(config.template)}.png`;
  const url = new URL(`https://img.vietqr.io/image/${bankPath}`);
  url.searchParams.set('amount', String(amountMinor));
  url.searchParams.set('addInfo', reference);
  url.searchParams.set('accountName', config.accountName);
  return url.toString();
}

function validateOrder(order: VietQrInstructionOrder, now: Date): VietQrInstructionResult | null {
  if (order.market !== 'vn' || order.currencyCode !== 'VND' || order.paymentIntent !== 'vietqr_intent' || isTerminalStatus(order.paymentStatus)) {
    return {status: 'invalid', code: 'vietqr_order_not_eligible'};
  }

  if (!Number.isInteger(order.amountMinor) || order.amountMinor <= 0) {
    return {status: 'invalid', code: 'invalid_vietqr_amount'};
  }

  if (!isAsciiReference(order.orderNumber)) {
    return {status: 'invalid', code: 'invalid_vietqr_reference'};
  }

  const deadlineMs = order.reservationExpiresAt ? Date.parse(order.reservationExpiresAt) : Number.NaN;
  if (!Number.isFinite(deadlineMs) || deadlineMs <= now.getTime()) {
    return {status: 'invalid', code: 'vietqr_payment_window_closed'};
  }

  return null;
}

function buildInstruction({
  config,
  order
}: {
  config: Extract<VietQrServerConfig, {status: 'configured'}>;
  order: VietQrInstructionOrder;
}): VietQrInstructionSnapshot {
  return {
    orderId: order.orderId,
    paymentId: order.paymentId ?? null,
    orderNumber: order.orderNumber,
    amountMinor: order.amountMinor,
    currencyCode: 'VND',
    transferReference: order.orderNumber,
    bankId: config.bankId,
    accountName: config.accountName,
    accountNoMasked: maskAccountNo(config.accountNo),
    template: config.template,
    qrImageUrl: buildQuickLinkUrl(config, order.amountMinor, order.orderNumber),
    paymentDeadlineAt: order.reservationExpiresAt as string
  };
}

async function recordVietQrInstructionFailure(order: VietQrInstructionOrder) {
  return runMonitoredAction({
    area: 'payment',
    action: 'instruction_snapshot',
    errorCode: 'vietqr_instruction_snapshot_failed',
    summary: 'VietQR instruction snapshot transition failed',
    errorResult: {status: 'error', code: 'vietqr_instruction_snapshot_failed'} as const,
    shouldRecordResult: () => true,
    facts: {
      provider: 'vietqr',
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      paymentId: order.paymentId ?? null,
      paymentStatus: order.paymentStatus,
      amountValue: order.amountMinor,
      currency: 'VND'
    },
    operation: async () => ({status: 'error', code: 'vietqr_instruction_snapshot_failed'}) as const
  });
}

export async function getVietQrInstructions({
  config,
  order,
  now = new Date(),
  transitionClient
}: {
  config: VietQrServerConfig;
  order: VietQrInstructionOrder;
  now?: Date;
  transitionClient?: TransitionClient;
}): Promise<VietQrInstructionResult> {
  if (config.status !== 'configured') {
    return {status: 'unconfigured', code: config.code};
  }

  const invalid = validateOrder(order, now);
  if (invalid) {
    return invalid;
  }

  if (order.existingInstruction) {
    return {status: 'ready', instruction: order.existingInstruction};
  }

  const instruction = buildInstruction({config, order});
  if (!transitionClient) {
    return {status: 'ready', instruction};
  }

  const transition = await applyPaymentTransition(
    {
      transitionKey: `vietqr-instruction:${order.paymentId ?? order.orderId}`,
      source: 'vietqr_instruction',
      targetStatus: 'pending',
      orderNumber: order.orderNumber,
      eventType: 'VIETQR.INSTRUCTION.CREATED',
      verificationStatus: 'system',
      amountMinor: order.amountMinor,
      currencyCode: 'VND',
      sanitizedFacts: {
        bankId: instruction.bankId,
        accountName: instruction.accountName,
        accountNoMasked: instruction.accountNoMasked,
        transferReference: instruction.transferReference,
        paymentDeadlineAt: instruction.paymentDeadlineAt,
        qrImageUrl: instruction.qrImageUrl
      }
    },
    transitionClient
  );

  if (transition.status === 'error' || transition.status === 'invalid') {
    return recordVietQrInstructionFailure(order);
  }

  return {status: 'ready', instruction, transition};
}
