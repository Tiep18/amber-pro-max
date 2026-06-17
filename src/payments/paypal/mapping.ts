import type {PayPalOrderSource} from './client';

export type PayPalCaptureFacts = {
  providerOrderId: string;
  providerCaptureId: string;
  merchantId: string;
  merchantVerificationSource: 'provider_payee' | 'server_payee_contract';
  amountMinor: number;
  currencyCode: 'USD';
};

export type PayPalReconciliationResult =
  | {status: 'verified'; facts: PayPalCaptureFacts}
  | {
      status: 'rejected';
      code:
        | 'paypal_order_mismatch'
        | 'paypal_capture_missing'
        | 'paypal_capture_not_completed'
        | 'paypal_merchant_mismatch'
        | 'paypal_amount_mismatch'
        | 'paypal_currency_mismatch';
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  return Array.isArray(value) && isRecord(value[0]) ? value[0] : null;
}

function parseUsdMinor(value: unknown) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) {
    return null;
  }

  const [major, minor] = value.split('.');
  return Number(major) * 100 + Number(minor);
}

export function reconcilePayPalCapture({
  providerOrder,
  order,
  expectedMerchantId
}: {
  providerOrder: unknown;
  order: PayPalOrderSource;
  expectedMerchantId: string;
}): PayPalReconciliationResult {
  if (!isRecord(providerOrder) || providerOrder.id !== (order.providerOrderId ?? providerOrder.id)) {
    return {status: 'rejected', code: 'paypal_order_mismatch'};
  }

  const purchaseUnit = firstRecord(providerOrder.purchase_units);
  if (!purchaseUnit) {
    return {status: 'rejected', code: 'paypal_order_mismatch'};
  }

  const payments = isRecord(purchaseUnit.payments) ? purchaseUnit.payments : null;
  const capture = firstRecord(payments?.captures);
  if (!capture || typeof capture.id !== 'string') {
    return {status: 'rejected', code: 'paypal_capture_missing'};
  }
  if (capture.status !== 'COMPLETED') {
    return {status: 'rejected', code: 'paypal_capture_not_completed'};
  }

  const invoiceId = typeof purchaseUnit.invoice_id === 'string' ? purchaseUnit.invoice_id : capture.invoice_id;
  const customId = typeof purchaseUnit.custom_id === 'string' ? purchaseUnit.custom_id : capture.custom_id;
  if (invoiceId !== order.orderNumber || customId !== order.orderId) {
    return {status: 'rejected', code: 'paypal_order_mismatch'};
  }

  const payee = isRecord(purchaseUnit.payee) ? purchaseUnit.payee : null;
  const capturePayee = isRecord(capture.payee) ? capture.payee : null;
  const merchantId = typeof payee?.merchant_id === 'string' ? payee.merchant_id : typeof capturePayee?.merchant_id === 'string' ? capturePayee.merchant_id : null;
  if (merchantId && merchantId !== expectedMerchantId) {
    return {status: 'rejected', code: 'paypal_merchant_mismatch'};
  }
  const verifiedMerchantId = merchantId ?? expectedMerchantId;
  const merchantVerificationSource = merchantId ? 'provider_payee' : 'server_payee_contract';

  const sellerBreakdown = isRecord(capture.seller_receivable_breakdown) ? capture.seller_receivable_breakdown : null;
  const grossAmount = isRecord(sellerBreakdown?.gross_amount) ? sellerBreakdown.gross_amount : null;
  const amount = grossAmount ?? (isRecord(capture.amount) ? capture.amount : null);
  if (!amount || amount.currency_code !== 'USD') {
    return {status: 'rejected', code: 'paypal_currency_mismatch'};
  }

  const amountMinor = parseUsdMinor(amount.value);
  if (amountMinor !== order.totalMinor) {
    return {status: 'rejected', code: 'paypal_amount_mismatch'};
  }

  return {
    status: 'verified',
    facts: {
      providerOrderId: String(providerOrder.id),
      providerCaptureId: capture.id,
      merchantId: verifiedMerchantId,
      merchantVerificationSource,
      amountMinor,
      currencyCode: 'USD'
    }
  };
}

export function reconcilePayPalCaptureResource({
  capture,
  order,
  expectedMerchantId
}: {
  capture: unknown;
  order: PayPalOrderSource;
  expectedMerchantId: string;
}): PayPalReconciliationResult {
  if (!isRecord(capture)) {
    return {status: 'rejected', code: 'paypal_capture_missing'};
  }

  const relatedIds = isRecord(capture.supplementary_data)
    ? isRecord(capture.supplementary_data.related_ids)
      ? capture.supplementary_data.related_ids
      : null
    : null;
  const providerOrderId = typeof relatedIds?.order_id === 'string' ? relatedIds.order_id : null;
  if (
    !providerOrderId ||
    providerOrderId !== order.providerOrderId ||
    capture.invoice_id !== order.orderNumber ||
    capture.custom_id !== order.orderId
  ) {
    return {status: 'rejected', code: 'paypal_order_mismatch'};
  }

  if (typeof capture.id !== 'string') {
    return {status: 'rejected', code: 'paypal_capture_missing'};
  }
  if (capture.status !== 'COMPLETED') {
    return {status: 'rejected', code: 'paypal_capture_not_completed'};
  }

  const payee = isRecord(capture.payee) ? capture.payee : null;
  const merchantId = typeof payee?.merchant_id === 'string' ? payee.merchant_id : null;
  if (merchantId && merchantId !== expectedMerchantId) {
    return {status: 'rejected', code: 'paypal_merchant_mismatch'};
  }
  const verifiedMerchantId = merchantId ?? expectedMerchantId;
  const merchantVerificationSource = merchantId ? 'provider_payee' : 'server_payee_contract';

  const sellerBreakdown = isRecord(capture.seller_receivable_breakdown) ? capture.seller_receivable_breakdown : null;
  const grossAmount = isRecord(sellerBreakdown?.gross_amount) ? sellerBreakdown.gross_amount : null;
  const amount = grossAmount ?? (isRecord(capture.amount) ? capture.amount : null);
  if (!amount || amount.currency_code !== 'USD') {
    return {status: 'rejected', code: 'paypal_currency_mismatch'};
  }

  const amountMinor = parseUsdMinor(amount.value);
  if (amountMinor !== order.totalMinor) {
    return {status: 'rejected', code: 'paypal_amount_mismatch'};
  }

  return {
    status: 'verified',
    facts: {
      providerOrderId,
      providerCaptureId: capture.id,
      merchantId: verifiedMerchantId,
      merchantVerificationSource,
      amountMinor,
      currencyCode: 'USD'
    }
  };
}
