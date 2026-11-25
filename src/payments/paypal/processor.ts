import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';

import type { getServerEnv } from '@/lib/env/server';
import {
  PAYPAL_HANDOFF_MIN_WINDOW_MINUTES,
  PAYPAL_MAX_HOLD_MINUTES
} from '@/payments/reservation';
import type {
  PaymentInternalStatus,
  PaymentTransitionInput,
  PaymentTransitionResult,
  PaymentTransitionTarget
} from '@/payments/types';
import { logPayPalStage, sanitizePayPalProviderOrderForLog } from './logging';

export const PAYPAL_WEBHOOK_BODY_LIMIT_BYTES = 256 * 1024;

export type PayPalServerConfig = ReturnType<typeof getServerEnv>['paypal'];
export type ConfiguredPayPalServerConfig = Extract<PayPalServerConfig, { status: 'configured' }> & {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  expectedMerchantId: string;
};
export type PayPalTransport = (url: string, init?: RequestInit) => Promise<Response>;
export type PayPalWebhookHeaderSource = Headers | Readonly<Record<string, string | undefined>>;

export type PayPalReconciliationMismatchCode =
  | 'paypal_order_mismatch'
  | 'paypal_merchant_mismatch'
  | 'paypal_amount_mismatch'
  | 'paypal_currency_mismatch';

export type PayPalCaptureIncompleteCode =
  | 'paypal_capture_missing'
  | 'paypal_capture_not_completed';

export type StoredPayPalOrder = {
  orderId: string;
  paymentId: string;
  orderNumber: string;
  market: string;
  currencyCode: string;
  provider: string;
  paymentStatus: PaymentInternalStatus;
  totalMinor: number;
  reservationExpiresAt: string | null;
  providerOrderId: string | null;
  paypalCreateRequestId: string;
  paypalCaptureRequestId: string;
};

export type ReservationExtensionOutcome =
  | { status: 'extended'; reservationExpiresAt?: string }
  | { status: 'unchanged' | 'skipped' | 'not_found' | 'invalid' | 'error'; code?: string };

export type PayPalWebhookReceipt = {
  paymentId: string;
  providerEventId: string;
  eventType: string;
  verificationStatus: 'verified' | 'rejected';
  payloadDigest: string;
  sanitizedFacts: Record<string, unknown>;
  receivedAt: string;
};

export type PayPalRefundVisibilityRecord = {
  orderId: string;
  paymentId: string;
  providerEventId: string;
  eventType: string;
  payloadDigest: string;
  refundStatus: 'partially_refunded' | 'refunded';
  refundedAmountMinor: number;
  sanitizedFacts: Record<string, unknown>;
  receivedAt: string;
};

export type PayPalStore = {
  findOrder: (
    lookup: { orderNumber: string } | { providerOrderId: string }
  ) => Promise<StoredPayPalOrder | null>;
  extendReservation: (input: {
    orderNumber: string;
    minimumMinutes: number;
    maxHoldMinutes: number;
  }) => Promise<ReservationExtensionOutcome>;
  saveProviderOrderId: (input: { orderId: string; providerOrderId: string }) => Promise<void>;
  applyPaymentTransition: (input: PaymentTransitionInput) => Promise<PaymentTransitionResult>;
  recordDuplicateWebhookDelivery: (input: {
    providerEventId: string;
    receivedAt: string;
  }) => Promise<{ duplicate: false } | { duplicate: true; deliveryCount: number }>;
  recordWebhookReceipt: (input: PayPalWebhookReceipt) => Promise<void>;
  recordRefundVisibility: (input: PayPalRefundVisibilityRecord) => Promise<void>;
};

export type PayPalOrderAccess = {
  authorizeOrder: (
    orderNumber: string
  ) => Promise<{ status: 'authorized' } | { status: 'not_found' | 'error' }>;
};

export type PayPalOperationalFailure = {
  action: 'paypal_create' | 'paypal_capture' | 'paypal_webhook';
  severity: 'warning' | 'error';
  errorCode: string;
  summary: string;
  facts: Record<string, string | number | boolean | null>;
};

export type PayPalEmailTrigger = (input: {
  reason: 'paypal_capture_paid' | 'paypal_webhook_paid';
}) => Promise<unknown>;

export type PayPalAdapters = {
  config: PayPalServerConfig;
  store: PayPalStore;
  /** Required for buyer-initiated flows (`create` / `capture`); fails closed if omitted. */
  orderAccess?: PayPalOrderAccess;
  transport?: PayPalTransport;
  triggerEmailOutbox?: PayPalEmailTrigger;
  recordOperationalFailure?: (input: PayPalOperationalFailure) => Promise<unknown>;
  log?: typeof logPayPalStage;
  now?: () => number;
};

export type CreatePayPalOrderOutcome =
  | { status: 'awaiting'; paypalOrderId: string }
  | { status: 'verifying'; code: 'paypal_provider_uncertain'; paypalOrderId?: string }
  | {
      status: 'invalid';
      code: 'invalid_paypal_order_request' | 'paypal_order_not_eligible' | 'invalid_paypal_amount';
    }
  | { status: 'not_found' }
  | { status: 'unconfigured'; code: 'missing_paypal_server_config' }
  | { status: 'error'; code: 'paypal_provider_error' };

export type CapturePayPalOrderOutcome =
  | { status: 'paid'; paymentStatus: 'paid' }
  | {
      status: 'verifying';
      code:
        | 'paypal_capture_uncertain'
        | 'paypal_provider_uncertain'
        | PayPalCaptureIncompleteCode;
      paypalOrderId?: string;
    }
  | { status: 'transition_conflict'; code: string }
  | { status: 'review_required'; code: string }
  | { status: 'reconciliation_required'; code: PayPalReconciliationMismatchCode }
  | { status: 'expired'; code: 'paypal_order_expired' }
  | {
      status: 'invalid';
      code:
        | 'invalid_paypal_capture_request'
        | 'paypal_order_not_eligible'
        | 'paypal_provider_order_missing';
    }
  | { status: 'not_found' }
  | { status: 'unconfigured'; code: 'missing_paypal_server_config' }
  | { status: 'error'; code: 'paypal_provider_error' };

export type HandlePayPalWebhookInput = {
  headers: PayPalWebhookHeaderSource;
} & (
  | { rawBody: string; readRawBody?: never }
  | { readRawBody: () => Promise<string>; rawBody?: never }
);

export type HandlePayPalWebhookOutcome =
  | { status: 'accepted'; result: PaymentTransitionResult['status']; code?: string }
  | { status: 'duplicate' }
  | { status: 'refund_visibility'; refundStatus: 'partially_refunded' | 'refunded' }
  | {
      status: 'review_required';
      code:
        | 'malformed_paypal_webhook'
        | PayPalCaptureIncompleteCode
        | PayPalReconciliationMismatchCode;
    }
  | {
      status: 'ignored';
      code:
        | 'paypal_order_not_found'
        | 'paypal_capture_pending'
        | 'unsupported_paypal_webhook_event';
    }
  | {
      status: 'rejected';
      code:
        | 'paypal_webhook_body_too_large'
        | 'missing_paypal_webhook_headers'
        | 'paypal_webhook_signature_rejected'
        | 'missing_paypal_server_config';
    }
  | { status: 'malformed'; code: 'malformed_paypal_webhook' }
  | { status: 'unconfigured'; code: 'missing_paypal_server_config' }
  | { status: 'error'; code: 'paypal_provider_error' };

/**
 * Deep PayPal payment coordinator behind one 3-entry-point interface.
 * Hides REST serialization, uniform transport fault handling, expiry rules,
 * reconciliation, digesting, and ASVS L1 webhook verification ordering.
 */
export type PayPalProcessor = {
  createPayPalOrder: (input: unknown) => Promise<CreatePayPalOrderOutcome>;
  capturePayPalOrder: (input: unknown) => Promise<CapturePayPalOrderOutcome>;
  handlePayPalWebhook: (input: HandlePayPalWebhookInput) => Promise<HandlePayPalWebhookOutcome>;
};

// --- Internal validation, REST, and reconciliation helpers ---

const createInputSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80)
});

const captureInputSchema = z.object({
  paypalOrderId: z.string().trim().min(1).max(120)
});

type PayPalWebhookVerificationHeaders = {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
};

type PayPalWebhookEvent = {
  id: string;
  event_type: string;
  create_time?: string;
  resource?: unknown;
};

type PayPalCaptureFacts = {
  providerOrderId: string;
  providerCaptureId: string;
  merchantId: string;
  merchantVerificationSource: 'provider_payee' | 'server_payee_contract';
  amountMinor: number;
  currencyCode: 'USD';
};

type PayPalReconciliationResult =
  | { status: 'verified'; facts: PayPalCaptureFacts }
  | {
      status: 'rejected';
      code: PayPalCaptureIncompleteCode | PayPalReconciliationMismatchCode;
    };

type PayPalRemoteResult =
  | { status: 'created'; paypalOrderId: string }
  | { status: 'captured'; paypalOrderId: string; providerOrder: unknown }
  | { status: 'retrieved'; paypalOrderId: string; providerOrder: unknown }
  | {
      status: 'verifying';
      code: 'paypal_capture_uncertain' | 'paypal_provider_uncertain';
      paypalOrderId?: string;
    }
  | {
      status: 'invalid';
      code: 'paypal_order_not_eligible' | 'paypal_provider_order_missing' | 'invalid_paypal_amount';
    }
  | { status: 'unconfigured'; code: 'missing_paypal_server_config' }
  | { status: 'error'; code: 'paypal_provider_error' };

type PayPalWebhookSignatureResult =
  | { status: 'verified' }
  | {
      status: 'rejected';
      code: 'paypal_webhook_signature_rejected' | 'missing_paypal_server_config';
    }
  | { status: 'error'; code: 'paypal_provider_error' };

type PayPalWebhookVerificationResult =
  | {
      status: 'verified';
      event: PayPalWebhookEvent;
      eventId: string;
      eventType: string;
      payloadDigest: string;
      sanitizedFacts: Record<string, unknown>;
    }
  | {
      status: 'rejected';
      code:
        | 'paypal_webhook_body_too_large'
        | 'missing_paypal_webhook_headers'
        | 'paypal_webhook_signature_rejected'
        | 'missing_paypal_server_config';
      payloadDigest?: string;
    }
  | { status: 'malformed'; code: 'malformed_paypal_webhook'; payloadDigest: string }
  | { status: 'error'; code: 'paypal_provider_error'; payloadDigest?: string };

type PayPalEventReconciliationResult =
  | {
      status: 'transition';
      providerEventId: string;
      eventType: string;
      targetStatus: PaymentTransitionTarget;
      amountMinor?: number;
      currencyCode?: 'USD';
      reviewReason?: 'late_payment_detected';
      sanitizedFacts: Record<string, unknown>;
    }
  | {
      status: 'refund_visibility';
      providerEventId: string;
      eventType: string;
      refundStatus: 'partially_refunded' | 'refunded';
      refundedAmountMinor: number;
      sanitizedFacts: Record<string, unknown>;
    }
  | {
      status: 'ignored';
      code: 'paypal_capture_pending' | 'unsupported_paypal_webhook_event';
      providerEventId: string;
      eventType: string;
      sanitizedFacts: Record<string, unknown>;
    }
  | {
      status: 'rejected';
      code:
        | 'malformed_paypal_webhook'
        | PayPalCaptureIncompleteCode
        | PayPalReconciliationMismatchCode;
      providerEventId?: string;
      eventType?: string;
      sanitizedFacts: Record<string, unknown>;
    };

function defaultTransport(url: string, init?: RequestInit) {
  return fetch(url, init);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  return Array.isArray(value) && isRecord(value[0]) ? value[0] : null;
}

function isConfigured(config: PayPalServerConfig): config is ConfiguredPayPalServerConfig {
  return (
    config.status === 'configured' &&
    Boolean(
      config.clientId &&
        config.clientSecret &&
        config.webhookId &&
        config.expectedMerchantId
    )
  );
}

function isPayPalEligibleOrder(order: StoredPayPalOrder) {
  return order.market === 'intl' && order.currencyCode === 'USD' && order.provider === 'paypal';
}

function isOpenPayPalStatus(status: PaymentInternalStatus) {
  return status === 'pending' || status === 'verifying';
}

function isFutureDeadline(value: unknown, nowMs: number) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) > nowMs;
}

function formatUsdMinor(amountMinor: number): string | null {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    return null;
  }

  const dollars = Math.trunc(amountMinor / 100);
  const cents = String(amountMinor % 100).padStart(2, '0');
  return `${dollars}.${cents}`;
}

function parseUsdMinor(value: unknown) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) {
    return null;
  }

  const [major, minor] = value.split('.');
  return Number(major) * 100 + Number(minor);
}

function apiUrl(config: ConfiguredPayPalServerConfig, path: string) {
  return `${config.apiBase.replace(/\/$/, '')}${path}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildHeaders(
  token: string,
  requestId?: string,
  preferRepresentation = false
): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(preferRepresentation ? { Prefer: 'return=representation' } : {}),
    ...(requestId ? { 'PayPal-Request-Id': requestId } : {})
  };
}

function uncertainProviderStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function getAccessToken(
  config: ConfiguredPayPalServerConfig,
  transport: PayPalTransport
): Promise<{ status: 'ok'; token: string } | { status: 'failed'; threw: boolean }> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`, 'utf8').toString(
    'base64'
  );
  let response: Response;
  try {
    response = await transport(apiUrl(config, '/v1/oauth2/token'), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
  } catch {
    return { status: 'failed', threw: true };
  }

  if (!response.ok) {
    return { status: 'failed', threw: false };
  }

  const payload = await readJson(response);
  if (!isRecord(payload) || typeof payload.access_token !== 'string') {
    return { status: 'failed', threw: false };
  }

  return { status: 'ok', token: payload.access_token };
}

async function createRemotePayPalOrder({
  config,
  order,
  transport
}: {
  config: PayPalServerConfig;
  order: StoredPayPalOrder;
  transport: PayPalTransport;
}): Promise<PayPalRemoteResult> {
  if (!isPayPalEligibleOrder(order)) {
    return { status: 'invalid', code: 'paypal_order_not_eligible' };
  }
  if (!isConfigured(config)) {
    return { status: 'unconfigured', code: 'missing_paypal_server_config' };
  }

  const value = formatUsdMinor(order.totalMinor);
  if (!value) {
    return { status: 'invalid', code: 'invalid_paypal_amount' };
  }

  const auth = await getAccessToken(config, transport);
  if (auth.status !== 'ok') {
    return { status: 'error', code: 'paypal_provider_error' };
  }

  let response: Response;
  try {
    response = await transport(apiUrl(config, '/v2/checkout/orders'), {
      method: 'POST',
      headers: buildHeaders(auth.token, order.paypalCreateRequestId, true),
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order.orderId,
            invoice_id: order.orderNumber,
            custom_id: order.orderId,
            payee: {
              merchant_id: config.expectedMerchantId
            },
            amount: {
              currency_code: 'USD',
              value
            }
          }
        ]
      })
    });
  } catch {
    // Once the POST has been sent, network loss leaves provider creation uncertain.
    return {
      status: 'verifying',
      code: 'paypal_provider_uncertain',
      paypalOrderId: order.providerOrderId ?? undefined
    };
  }

  if (!response.ok) {
    return uncertainProviderStatus(response.status)
      ? {
          status: 'verifying',
          code: 'paypal_provider_uncertain',
          paypalOrderId: order.providerOrderId ?? undefined
        }
      : { status: 'error', code: 'paypal_provider_error' };
  }

  const payload = await readJson(response);
  if (!isRecord(payload) || typeof payload.id !== 'string') {
    return { status: 'error', code: 'paypal_provider_error' };
  }

  return { status: 'created', paypalOrderId: payload.id };
}

async function captureRemotePayPalOrder({
  config,
  order,
  transport
}: {
  config: ConfiguredPayPalServerConfig;
  order: StoredPayPalOrder & { providerOrderId: string };
  transport: PayPalTransport;
}): Promise<PayPalRemoteResult> {
  if (!isPayPalEligibleOrder(order)) {
    return { status: 'invalid', code: 'paypal_order_not_eligible' };
  }

  const auth = await getAccessToken(config, transport);
  if (auth.status !== 'ok') {
    // Capture request was never issued, so failure is safe to treat as pre-charge error.
    return { status: 'error', code: 'paypal_provider_error' };
  }

  let response: Response;
  try {
    response = await transport(
      apiUrl(config, `/v2/checkout/orders/${encodeURIComponent(order.providerOrderId)}/capture`),
      {
        method: 'POST',
        headers: buildHeaders(auth.token, order.paypalCaptureRequestId, true)
      }
    );
  } catch {
    return {
      status: 'verifying',
      code: 'paypal_capture_uncertain',
      paypalOrderId: order.providerOrderId
    };
  }

  if (!response.ok) {
    // Any non-2xx capture reply must reconcile through GET rather than assuming no charge.
    return {
      status: 'verifying',
      code: 'paypal_capture_uncertain',
      paypalOrderId: order.providerOrderId
    };
  }

  const providerOrder = await readJson(response);
  return { status: 'captured', paypalOrderId: order.providerOrderId, providerOrder };
}

async function getRemotePayPalOrder({
  config,
  paypalOrderId,
  transport
}: {
  config: PayPalServerConfig;
  paypalOrderId: string;
  transport: PayPalTransport;
}): Promise<PayPalRemoteResult> {
  if (!isConfigured(config)) {
    return { status: 'unconfigured', code: 'missing_paypal_server_config' };
  }

  const auth = await getAccessToken(config, transport);
  if (auth.status !== 'ok') {
    return auth.threw
      ? { status: 'verifying', code: 'paypal_provider_uncertain', paypalOrderId }
      : { status: 'error', code: 'paypal_provider_error' };
  }

  let response: Response;
  try {
    response = await transport(
      apiUrl(config, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`),
      {
        method: 'GET',
        headers: buildHeaders(auth.token, undefined, true)
      }
    );
  } catch {
    return {
      status: 'verifying',
      code: 'paypal_provider_uncertain',
      paypalOrderId
    };
  }

  if (!response.ok) {
    return uncertainProviderStatus(response.status)
      ? { status: 'verifying', code: 'paypal_provider_uncertain', paypalOrderId }
      : { status: 'error', code: 'paypal_provider_error' };
  }

  const providerOrder = await readJson(response);
  return { status: 'retrieved', paypalOrderId, providerOrder };
}

async function verifyRemoteWebhookSignature({
  config,
  headers,
  webhookEvent,
  transport
}: {
  config: PayPalServerConfig;
  headers: PayPalWebhookVerificationHeaders;
  webhookEvent: unknown;
  transport: PayPalTransport;
}): Promise<PayPalWebhookSignatureResult> {
  if (!isConfigured(config)) {
    return { status: 'rejected', code: 'missing_paypal_server_config' };
  }

  const auth = await getAccessToken(config, transport);
  if (auth.status !== 'ok') {
    return { status: 'error', code: 'paypal_provider_error' };
  }

  let response: Response;
  try {
    response = await transport(apiUrl(config, '/v1/notifications/verify-webhook-signature'), {
      method: 'POST',
      headers: buildHeaders(auth.token),
      body: JSON.stringify({
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: config.webhookId,
        webhook_event: webhookEvent
      })
    });
  } catch {
    return { status: 'error', code: 'paypal_provider_error' };
  }

  if (!response.ok) {
    return { status: 'error', code: 'paypal_provider_error' };
  }

  const payload = await readJson(response);
  if (isRecord(payload) && payload.verification_status === 'SUCCESS') {
    return { status: 'verified' };
  }

  return { status: 'rejected', code: 'paypal_webhook_signature_rejected' };
}

function verifyCaptureMerchantAndAmount({
  providerOrderId,
  capture,
  primaryPayee,
  expectedMerchantId,
  expectedTotalMinor
}: {
  providerOrderId: string;
  capture: Record<string, unknown>;
  primaryPayee: Record<string, unknown> | null;
  expectedMerchantId: string;
  expectedTotalMinor: number;
}): PayPalReconciliationResult {
  const capturePayee = isRecord(capture.payee) ? capture.payee : null;
  const merchantId =
    typeof primaryPayee?.merchant_id === 'string'
      ? primaryPayee.merchant_id
      : typeof capturePayee?.merchant_id === 'string'
        ? capturePayee.merchant_id
        : null;
  if (merchantId && merchantId !== expectedMerchantId) {
    return { status: 'rejected', code: 'paypal_merchant_mismatch' };
  }

  const sellerBreakdown = isRecord(capture.seller_receivable_breakdown)
    ? capture.seller_receivable_breakdown
    : null;
  const grossAmount = isRecord(sellerBreakdown?.gross_amount) ? sellerBreakdown.gross_amount : null;
  const amount = grossAmount ?? (isRecord(capture.amount) ? capture.amount : null);
  if (!amount || amount.currency_code !== 'USD') {
    return { status: 'rejected', code: 'paypal_currency_mismatch' };
  }

  const amountMinor = parseUsdMinor(amount.value);
  if (amountMinor !== expectedTotalMinor) {
    return { status: 'rejected', code: 'paypal_amount_mismatch' };
  }

  return {
    status: 'verified',
    facts: {
      providerOrderId,
      providerCaptureId: String(capture.id),
      merchantId: merchantId ?? expectedMerchantId,
      merchantVerificationSource: merchantId ? 'provider_payee' : 'server_payee_contract',
      amountMinor,
      currencyCode: 'USD'
    }
  };
}

function reconcilePayPalCapture({
  providerOrder,
  order,
  expectedMerchantId
}: {
  providerOrder: unknown;
  order: StoredPayPalOrder;
  expectedMerchantId: string;
}): PayPalReconciliationResult {
  if (!isRecord(providerOrder) || providerOrder.id !== (order.providerOrderId ?? providerOrder.id)) {
    return { status: 'rejected', code: 'paypal_order_mismatch' };
  }

  const purchaseUnit = firstRecord(providerOrder.purchase_units);
  if (!purchaseUnit) {
    return { status: 'rejected', code: 'paypal_order_mismatch' };
  }

  const payments = isRecord(purchaseUnit.payments) ? purchaseUnit.payments : null;
  const capture = firstRecord(payments?.captures);
  if (!capture || typeof capture.id !== 'string') {
    return { status: 'rejected', code: 'paypal_capture_missing' };
  }
  if (capture.status !== 'COMPLETED') {
    return { status: 'rejected', code: 'paypal_capture_not_completed' };
  }

  const invoiceId = typeof purchaseUnit.invoice_id === 'string' ? purchaseUnit.invoice_id : capture.invoice_id;
  const customId = typeof purchaseUnit.custom_id === 'string' ? purchaseUnit.custom_id : capture.custom_id;
  if (invoiceId !== order.orderNumber || customId !== order.orderId) {
    return { status: 'rejected', code: 'paypal_order_mismatch' };
  }

  return verifyCaptureMerchantAndAmount({
    providerOrderId: String(providerOrder.id),
    capture,
    primaryPayee: isRecord(purchaseUnit.payee) ? purchaseUnit.payee : null,
    expectedMerchantId,
    expectedTotalMinor: order.totalMinor
  });
}

function reconcilePayPalCaptureResource({
  capture,
  order,
  expectedMerchantId
}: {
  capture: unknown;
  order: StoredPayPalOrder & { providerOrderId: string };
  expectedMerchantId: string;
}): PayPalReconciliationResult {
  if (!isRecord(capture)) {
    return { status: 'rejected', code: 'paypal_capture_missing' };
  }

  const providerOrderId = relatedProviderOrderId(capture);
  if (
    !providerOrderId ||
    providerOrderId !== order.providerOrderId ||
    capture.invoice_id !== order.orderNumber ||
    capture.custom_id !== order.orderId
  ) {
    return { status: 'rejected', code: 'paypal_order_mismatch' };
  }

  if (typeof capture.id !== 'string') {
    return { status: 'rejected', code: 'paypal_capture_missing' };
  }
  if (capture.status !== 'COMPLETED') {
    return { status: 'rejected', code: 'paypal_capture_not_completed' };
  }

  return verifyCaptureMerchantAndAmount({
    providerOrderId,
    capture,
    primaryPayee: null,
    expectedMerchantId,
    expectedTotalMinor: order.totalMinor
  });
}

function relatedProviderOrderId(resource: Record<string, unknown>) {
  const supplementary = isRecord(resource.supplementary_data) ? resource.supplementary_data : null;
  const relatedIds = isRecord(supplementary?.related_ids) ? supplementary.related_ids : null;
  return typeof relatedIds?.order_id === 'string' ? relatedIds.order_id : null;
}

function headerValue(headers: PayPalWebhookHeaderSource, name: string) {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const lowerName = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return entry?.[1];
}

function extractWebhookHeaders(
  headers: PayPalWebhookHeaderSource
): PayPalWebhookVerificationHeaders | null {
  const authAlgo = headerValue(headers, 'paypal-auth-algo');
  const certUrl = headerValue(headers, 'paypal-cert-url');
  const transmissionId = headerValue(headers, 'paypal-transmission-id');
  const transmissionSig = headerValue(headers, 'paypal-transmission-sig');
  const transmissionTime = headerValue(headers, 'paypal-transmission-time');

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return null;
  }

  return { authAlgo, certUrl, transmissionId, transmissionSig, transmissionTime };
}

function digestRawBody(rawBody: string) {
  return createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

function parseWebhookEvent(value: unknown): PayPalWebhookEvent | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.event_type !== 'string') {
    return null;
  }
  return {
    id: value.id,
    event_type: value.event_type,
    create_time: typeof value.create_time === 'string' ? value.create_time : undefined,
    resource: value.resource
  };
}

function safeResourceFacts(event: PayPalWebhookEvent) {
  const resource = isRecord(event.resource) ? event.resource : {};
  return {
    providerEventId: event.id,
    eventType: event.event_type,
    providerCaptureId: typeof resource.id === 'string' ? resource.id : undefined,
    orderNumber: typeof resource.invoice_id === 'string' ? resource.invoice_id : undefined,
    localOrderId: typeof resource.custom_id === 'string' ? resource.custom_id : undefined
  };
}

function eventOrderHints(event: PayPalWebhookEvent) {
  const resource = isRecord(event.resource) ? event.resource : null;
  if (!resource) {
    return null;
  }

  const orderNumber = typeof resource.invoice_id === 'string' ? resource.invoice_id : null;
  const orderId = typeof resource.custom_id === 'string' ? resource.custom_id : null;
  const providerOrderId = relatedProviderOrderId(resource);
  if (!orderNumber || !orderId) {
    return null;
  }

  return { orderNumber, orderId, providerOrderId };
}

function webhookEventHints(rawBody: string) {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) {
      return { providerEventId: null, eventType: null };
    }
    return {
      providerEventId: typeof parsed.id === 'string' ? parsed.id : null,
      eventType: typeof parsed.event_type === 'string' ? parsed.event_type : null
    };
  } catch {
    return { providerEventId: null, eventType: null };
  }
}

async function verifyPayPalWebhook({
  rawBody,
  headers,
  config,
  transport
}: {
  rawBody: string;
  headers: PayPalWebhookHeaderSource;
  config: PayPalServerConfig;
  transport: PayPalTransport;
}): Promise<PayPalWebhookVerificationResult> {
  if (Buffer.byteLength(rawBody, 'utf8') > PAYPAL_WEBHOOK_BODY_LIMIT_BYTES) {
    return { status: 'rejected', code: 'paypal_webhook_body_too_large' };
  }

  const payloadDigest = digestRawBody(rawBody);
  const verificationHeaders = extractWebhookHeaders(headers);
  if (!verificationHeaders) {
    return { status: 'rejected', code: 'missing_paypal_webhook_headers', payloadDigest };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 'malformed', code: 'malformed_paypal_webhook', payloadDigest };
  }

  const event = parseWebhookEvent(parsed);
  if (!event) {
    return { status: 'malformed', code: 'malformed_paypal_webhook', payloadDigest };
  }

  const signature = await verifyRemoteWebhookSignature({
    config,
    headers: verificationHeaders,
    webhookEvent: parsed,
    transport
  });
  if (signature.status === 'verified') {
    return {
      status: 'verified',
      event,
      eventId: event.id,
      eventType: event.event_type,
      payloadDigest,
      sanitizedFacts: safeResourceFacts(event)
    };
  }
  if (signature.status === 'error') {
    return { status: 'error', code: signature.code, payloadDigest };
  }

  return { status: 'rejected', code: signature.code, payloadDigest };
}

function getRefundedCaptureId(resource: Record<string, unknown>) {
  if (typeof resource.capture_id === 'string') {
    return resource.capture_id;
  }
  const upLink = Array.isArray(resource.links)
    ? resource.links.find((link) => isRecord(link) && link.rel === 'up' && typeof link.href === 'string')
    : null;
  if (!isRecord(upLink) || typeof upLink.href !== 'string') {
    return undefined;
  }
  return upLink.href.split('/').pop();
}

function reconcileRefund(
  event: PayPalWebhookEvent,
  order: StoredPayPalOrder
): PayPalEventReconciliationResult {
  const resource = isRecord(event.resource) ? event.resource : null;
  if (!resource || resource.invoice_id !== order.orderNumber || resource.custom_id !== order.orderId) {
    return {
      status: 'rejected',
      code: 'paypal_order_mismatch',
      providerEventId: event.id,
      eventType: event.event_type,
      sanitizedFacts: safeResourceFacts(event)
    };
  }

  const amount = isRecord(resource.amount) ? resource.amount : null;
  if (!amount || amount.currency_code !== 'USD') {
    return {
      status: 'rejected',
      code: 'paypal_currency_mismatch',
      providerEventId: event.id,
      eventType: event.event_type,
      sanitizedFacts: safeResourceFacts(event)
    };
  }

  const refundedAmountMinor = parseUsdMinor(amount.value);
  if (refundedAmountMinor === null || refundedAmountMinor <= 0 || refundedAmountMinor > order.totalMinor) {
    return {
      status: 'rejected',
      code: 'paypal_amount_mismatch',
      providerEventId: event.id,
      eventType: event.event_type,
      sanitizedFacts: safeResourceFacts(event)
    };
  }

  const refundStatus = refundedAmountMinor >= order.totalMinor ? 'refunded' : 'partially_refunded';
  return {
    status: 'refund_visibility',
    providerEventId: event.id,
    eventType: event.event_type,
    refundStatus,
    refundedAmountMinor,
    sanitizedFacts: {
      ...safeResourceFacts(event),
      providerRefundId: typeof resource.id === 'string' ? resource.id : undefined,
      providerCaptureId: getRefundedCaptureId(resource),
      refundStatus,
      refundedAmountMinor,
      currencyCode: 'USD'
    }
  };
}

function reconcilePayPalEvent({
  event,
  order,
  expectedMerchantId,
  orderExpired
}: {
  event: PayPalWebhookEvent;
  order: StoredPayPalOrder & { providerOrderId: string };
  expectedMerchantId: string;
  orderExpired: boolean;
}): PayPalEventReconciliationResult {
  const baseFacts = safeResourceFacts(event);

  if (event.event_type === 'PAYMENT.CAPTURE.PENDING') {
    return {
      status: 'ignored',
      code: 'paypal_capture_pending',
      providerEventId: event.id,
      eventType: event.event_type,
      sanitizedFacts: baseFacts
    };
  }

  if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
    return reconcileRefund(event, order);
  }

  if (event.event_type === 'PAYMENT.CAPTURE.DECLINED' || event.event_type === 'PAYMENT.CAPTURE.DENIED') {
    return {
      status: 'transition',
      providerEventId: event.id,
      eventType: event.event_type,
      targetStatus: 'failed',
      sanitizedFacts: baseFacts
    };
  }

  if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    return {
      status: 'ignored',
      code: 'unsupported_paypal_webhook_event',
      providerEventId: event.id,
      eventType: event.event_type,
      sanitizedFacts: baseFacts
    };
  }

  const capture = reconcilePayPalCaptureResource({
    capture: event.resource,
    order,
    expectedMerchantId
  });
  if (capture.status === 'rejected') {
    return {
      status: 'rejected',
      code: capture.code,
      providerEventId: event.id,
      eventType: event.event_type,
      sanitizedFacts: baseFacts
    };
  }

  return {
    status: 'transition',
    providerEventId: event.id,
    eventType: event.event_type,
    targetStatus: 'paid',
    amountMinor: capture.facts.amountMinor,
    currencyCode: capture.facts.currencyCode,
    reviewReason: orderExpired ? 'late_payment_detected' : undefined,
    sanitizedFacts: {
      ...baseFacts,
      providerOrderId: capture.facts.providerOrderId,
      providerCaptureId: capture.facts.providerCaptureId,
      merchantId: capture.facts.merchantId,
      merchantVerificationSource: capture.facts.merchantVerificationSource,
      amountMinor: capture.facts.amountMinor,
      currencyCode: capture.facts.currencyCode
    }
  };
}

/**
 * Creates a deep PayPal processor wired to injected ports at the module's seam.
 */
export function createPayPalProcessor(adapters: PayPalAdapters): PayPalProcessor {
  const {
    config,
    store,
    orderAccess,
    transport = defaultTransport,
    triggerEmailOutbox,
    recordOperationalFailure,
    log = logPayPalStage,
    now = () => Date.now()
  } = adapters;

  async function safeRecordFailure(failure: PayPalOperationalFailure) {
    if (!recordOperationalFailure) {
      return;
    }
    try {
      await recordOperationalFailure(failure);
    } catch {
      // Operational monitoring must never destabilize or mask a payment outcome.
    }
  }

  async function safeTriggerEmailOutbox(reason: 'paypal_capture_paid' | 'paypal_webhook_paid') {
    if (!triggerEmailOutbox) {
      return;
    }
    try {
      await triggerEmailOutbox({ reason });
    } catch {
      // Email triggering is best-effort after durable payment settlement.
    }
  }

  async function authorizeBuyer(orderNumber: string) {
    if (!orderAccess) {
      return { status: 'not_found' as const };
    }
    try {
      return await orderAccess.authorizeOrder(orderNumber);
    } catch {
      return { status: 'error' as const };
    }
  }

  async function reconcileAndTransitionCapture({
    reconciled,
    providerOrder,
    order,
    reviewReasonOnPaid
  }: {
    reconciled: PayPalReconciliationResult;
    providerOrder: unknown;
    order: StoredPayPalOrder & { providerOrderId: string };
    reviewReasonOnPaid?: 'late_payment_detected';
  }): Promise<CapturePayPalOrderOutcome> {
    if (reconciled.status === 'rejected') {
      log(
        'capture.reconciliation_rejected',
        {
          orderNumber: order.orderNumber,
          orderId: order.orderId,
          paypalOrderId: order.providerOrderId,
          code: reconciled.code,
          providerOrder: sanitizePayPalProviderOrderForLog(providerOrder)
        },
        'warn'
      );
      await safeRecordFailure({
        action: 'paypal_capture',
        severity: 'warning',
        errorCode: reconciled.code,
        summary: 'PayPal capture reconciliation rejected',
        facts: {
          provider: 'paypal',
          status: null,
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          providerOrderId: order.providerOrderId
        }
      });

      if (
        reconciled.code === 'paypal_capture_missing' ||
        reconciled.code === 'paypal_capture_not_completed'
      ) {
        return { status: 'verifying', code: reconciled.code };
      }

      const reviewTransition = await store.applyPaymentTransition({
        transitionKey: `paypal-reconciliation:${order.paypalCaptureRequestId}:${reconciled.code}`,
        source: 'paypal_recheck',
        targetStatus: 'review_required',
        orderNumber: order.orderNumber,
        eventType: 'PAYMENT.CAPTURE.RECONCILIATION_REJECTED',
        verificationStatus: 'rejected',
        releaseReason: 'paypal_reconciliation_mismatch',
        reviewReason: 'paypal_reconciliation_mismatch',
        sanitizedFacts: {
          providerOrderId: order.providerOrderId,
          reconciliationCode: reconciled.code
        }
      });
      log(
        'capture.reconciliation_review_transition',
        {
          orderNumber: order.orderNumber,
          orderId: order.orderId,
          paypalOrderId: order.providerOrderId,
          code: reconciled.code,
          transitionStatus: reviewTransition.status,
          paymentStatus: reviewTransition.paymentStatus
        },
        reviewTransition.status === 'applied' || reviewTransition.status === 'duplicate'
          ? 'warn'
          : 'error'
      );
      return { status: 'reconciliation_required', code: reconciled.code };
    }

    log('capture.reconciliation_verified', {
      orderNumber: order.orderNumber,
      orderId: order.orderId,
      paypalOrderId: reconciled.facts.providerOrderId,
      providerCaptureId: reconciled.facts.providerCaptureId,
      merchantVerificationSource: reconciled.facts.merchantVerificationSource,
      amountMinor: reconciled.facts.amountMinor,
      currencyCode: reconciled.facts.currencyCode
    });

    const transition = await store.applyPaymentTransition({
      transitionKey: `paypal-recheck:${reconciled.facts.providerCaptureId}`,
      source: 'paypal_recheck',
      targetStatus: 'paid',
      orderNumber: order.orderNumber,
      providerEventId: reconciled.facts.providerCaptureId,
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      verificationStatus: 'verified',
      amountMinor: reconciled.facts.amountMinor,
      currencyCode: reconciled.facts.currencyCode,
      ...(reviewReasonOnPaid ? { reviewReason: reviewReasonOnPaid } : {}),
      sanitizedFacts: {
        providerOrderId: reconciled.facts.providerOrderId,
        providerCaptureId: reconciled.facts.providerCaptureId,
        merchantId: reconciled.facts.merchantId,
        merchantVerificationSource: reconciled.facts.merchantVerificationSource,
        amountMinor: reconciled.facts.amountMinor,
        currencyCode: reconciled.facts.currencyCode
      }
    });
    log(
      'capture.transition_result',
      {
        orderNumber: order.orderNumber,
        orderId: order.orderId,
        paypalOrderId: reconciled.facts.providerOrderId,
        providerCaptureId: reconciled.facts.providerCaptureId,
        transitionStatus: transition.status,
        paymentStatus: transition.paymentStatus,
        inventoryEffect: transition.inventoryEffect,
        code: transition.code
      },
      transition.status === 'error' || transition.status === 'invalid'
        ? 'error'
        : transition.status === 'review_required'
          ? 'warn'
          : 'info'
    );

    if (
      (transition.status === 'applied' || transition.status === 'duplicate') &&
      transition.paymentStatus === 'paid'
    ) {
      await safeTriggerEmailOutbox('paypal_capture_paid');
      return { status: 'paid', paymentStatus: 'paid' };
    }
    if (transition.status === 'review_required') {
      return {
        status: 'review_required',
        code: transition.code ?? 'payment_review_required'
      };
    }

    return {
      status: 'transition_conflict',
      code: transition.code ?? 'payment_transition_not_applied'
    };
  }

  return {
    async createPayPalOrder(rawInput: unknown): Promise<CreatePayPalOrderOutcome> {
      const parsed = createInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        log('create.invalid_request', {}, 'warn');
        return { status: 'invalid', code: 'invalid_paypal_order_request' };
      }

      const { orderNumber } = parsed.data;
      const access = await authorizeBuyer(orderNumber);
      if (access.status !== 'authorized') {
        log('create.authorization_failed', { orderNumber, status: access.status }, 'warn');
        return { status: 'not_found' };
      }

      // Measure handoff window from payment start; best effort so reservation RPC issues never block pay.
      try {
        const ext = await store.extendReservation({
          orderNumber,
          minimumMinutes: PAYPAL_HANDOFF_MIN_WINDOW_MINUTES,
          maxHoldMinutes: PAYPAL_MAX_HOLD_MINUTES
        });
        if (ext.status === 'error') {
          log('create.reservation_extend_failed', { orderNumber, status: ext.status }, 'warn');
        } else if (ext.status === 'extended') {
          log('create.reservation_extended', {
            orderNumber,
            reservationExpiresAt: ext.reservationExpiresAt
          });
        }
      } catch {
        log('create.reservation_extend_failed', { orderNumber, status: 'error' }, 'warn');
      }

      const order = await store.findOrder({ orderNumber });
      if (
        !order ||
        !isPayPalEligibleOrder(order) ||
        !isOpenPayPalStatus(order.paymentStatus) ||
        !isFutureDeadline(order.reservationExpiresAt, now())
      ) {
        log('create.order_not_eligible', { orderNumber }, 'warn');
        return { status: 'invalid', code: 'paypal_order_not_eligible' };
      }

      if (!isConfigured(config)) {
        log('create.unconfigured', { orderNumber: order.orderNumber, code: 'missing_paypal_server_config' }, 'error');
        return { status: 'unconfigured', code: 'missing_paypal_server_config' };
      }

      if (order.providerOrderId) {
        const retrieved = await getRemotePayPalOrder({
          config,
          paypalOrderId: order.providerOrderId,
          transport
        });
        if (retrieved.status === 'retrieved') {
          return { status: 'awaiting', paypalOrderId: retrieved.paypalOrderId };
        }
        log(
          'create.provider_order_retrieve_failed',
          {
            orderNumber: order.orderNumber,
            paypalOrderId: order.providerOrderId,
            status: retrieved.status,
            code: 'code' in retrieved ? retrieved.code : undefined
          },
          'warn'
        );
      }

      const created = await createRemotePayPalOrder({ config, order, transport });
      if (created.status === 'created') {
        await store.saveProviderOrderId({
          orderId: order.orderId,
          providerOrderId: created.paypalOrderId
        });
        log('create.provider_order_created', {
          orderNumber: order.orderNumber,
          orderId: order.orderId,
          paypalOrderId: created.paypalOrderId
        });
        return { status: 'awaiting', paypalOrderId: created.paypalOrderId };
      }
      if (created.status === 'verifying') {
        log(
          'create.provider_uncertain',
          {
            orderNumber: order.orderNumber,
            paypalOrderId: created.paypalOrderId,
            code: created.code
          },
          'warn'
        );
        return {
          status: 'verifying',
          code: 'paypal_provider_uncertain',
          ...(created.paypalOrderId ? { paypalOrderId: created.paypalOrderId } : {})
        };
      }
      if (created.status === 'unconfigured') {
        log('create.unconfigured', { orderNumber: order.orderNumber, code: created.code }, 'error');
        return { status: 'unconfigured', code: 'missing_paypal_server_config' };
      }

      const errorCode = 'code' in created ? created.code : 'paypal_provider_error';
      log('create.failed', { orderNumber: order.orderNumber, status: created.status, code: errorCode }, 'error');
      await safeRecordFailure({
        action: 'paypal_create',
        severity: 'error',
        errorCode,
        summary: 'PayPal order create failed',
        facts: {
          provider: 'paypal',
          status: created.status,
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          providerOrderId: order.providerOrderId ?? null
        }
      });

      if (created.status === 'invalid') {
        return {
          status: 'invalid',
          code:
            created.code === 'invalid_paypal_amount'
              ? 'invalid_paypal_amount'
              : 'paypal_order_not_eligible'
        };
      }
      return { status: 'error', code: 'paypal_provider_error' };
    },

    async capturePayPalOrder(rawInput: unknown): Promise<CapturePayPalOrderOutcome> {
      const parsed = captureInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        log('capture.invalid_request', {}, 'warn');
        return { status: 'invalid', code: 'invalid_paypal_capture_request' };
      }

      const { paypalOrderId } = parsed.data;
      const loadedOrder = await store.findOrder({ providerOrderId: paypalOrderId });
      if (!loadedOrder) {
        log('capture.local_order_not_found', { paypalOrderId }, 'warn');
        return { status: 'not_found' };
      }

      const access = await authorizeBuyer(loadedOrder.orderNumber);
      if (access.status !== 'authorized') {
        log(
          'capture.authorization_failed',
          {
            orderNumber: loadedOrder.orderNumber,
            paypalOrderId,
            status: access.status
          },
          'warn'
        );
        return { status: 'not_found' };
      }

      if (!isConfigured(config)) {
        log('capture.unconfigured', { orderNumber: loadedOrder.orderNumber, paypalOrderId }, 'error');
        return { status: 'unconfigured', code: 'missing_paypal_server_config' };
      }

      if (!isPayPalEligibleOrder(loadedOrder)) {
        return { status: 'invalid', code: 'paypal_order_not_eligible' };
      }

      const order: StoredPayPalOrder & { providerOrderId: string } = {
        ...loadedOrder,
        providerOrderId: paypalOrderId
      };

      if (order.paymentStatus === 'paid') {
        return { status: 'paid', paymentStatus: 'paid' };
      }
      if (order.paymentStatus === 'review_required') {
        return { status: 'review_required', code: 'paypal_order_review_required' };
      }
      if (order.paymentStatus !== 'expired' && !isOpenPayPalStatus(order.paymentStatus)) {
        log(
          'capture.order_not_open',
          {
            orderNumber: order.orderNumber,
            orderId: order.orderId,
            paypalOrderId,
            paymentStatus: order.paymentStatus
          },
          'warn'
        );
        return { status: 'invalid', code: 'paypal_order_not_eligible' };
      }

      const expired =
        order.paymentStatus === 'expired' || !isFutureDeadline(order.reservationExpiresAt, now());
      if (expired) {
        // Never issue a fresh charge on an expired hold; inspect GET to reconcile any prior capture.
        const retrieved = await getRemotePayPalOrder({ config, paypalOrderId, transport });
        log(
          'capture.expired_order_recheck',
          {
            orderNumber: order.orderNumber,
            orderId: order.orderId,
            paypalOrderId,
            providerStatus: retrieved.status,
            code: 'code' in retrieved ? retrieved.code : undefined
          },
          retrieved.status === 'retrieved' ? 'info' : 'warn'
        );

        if (retrieved.status !== 'retrieved') {
          return {
            status: 'verifying',
            code: 'paypal_provider_uncertain',
            paypalOrderId
          };
        }

        const reconciled = reconcilePayPalCapture({
          providerOrder: retrieved.providerOrder,
          order,
          expectedMerchantId: config.expectedMerchantId
        });
        if (
          reconciled.status === 'rejected' &&
          (reconciled.code === 'paypal_capture_missing' ||
            reconciled.code === 'paypal_capture_not_completed')
        ) {
          return { status: 'expired', code: 'paypal_order_expired' };
        }

        return reconcileAndTransitionCapture({
          reconciled,
          providerOrder: retrieved.providerOrder,
          order,
          reviewReasonOnPaid: 'late_payment_detected'
        });
      }

      const captured = await captureRemotePayPalOrder({ config, order, transport });
      if (captured.status === 'captured') {
        const reconciled = reconcilePayPalCapture({
          providerOrder: captured.providerOrder,
          order,
          expectedMerchantId: config.expectedMerchantId
        });
        return reconcileAndTransitionCapture({
          reconciled,
          providerOrder: captured.providerOrder,
          order
        });
      }

      log(
        'capture.provider_capture_result',
        {
          orderNumber: order.orderNumber,
          orderId: order.orderId,
          paypalOrderId,
          providerStatus: captured.status,
          code: 'code' in captured ? captured.code : undefined
        },
        captured.status === 'verifying' ? 'warn' : 'error'
      );

      if (captured.status === 'verifying') {
        const retrieved = await getRemotePayPalOrder({ config, paypalOrderId, transport });
        log(
          'capture.provider_retrieve_after_uncertain',
          {
            orderNumber: order.orderNumber,
            orderId: order.orderId,
            paypalOrderId,
            providerStatus: retrieved.status,
            code: 'code' in retrieved ? retrieved.code : undefined
          },
          retrieved.status === 'retrieved' ? 'info' : 'warn'
        );
        if (retrieved.status === 'retrieved') {
          const reconciled = reconcilePayPalCapture({
            providerOrder: retrieved.providerOrder,
            order,
            expectedMerchantId: config.expectedMerchantId
          });
          return reconcileAndTransitionCapture({
            reconciled,
            providerOrder: retrieved.providerOrder,
            order
          });
        }

        return {
          status: 'verifying',
          code: captured.code === 'paypal_provider_uncertain' ? 'paypal_provider_uncertain' : 'paypal_capture_uncertain',
          paypalOrderId: captured.paypalOrderId ?? paypalOrderId
        };
      }

      if (captured.status === 'unconfigured') {
        return { status: 'unconfigured', code: 'missing_paypal_server_config' };
      }
      if (captured.status === 'invalid') {
        return {
          status: 'invalid',
          code:
            captured.code === 'paypal_provider_order_missing'
              ? 'paypal_provider_order_missing'
              : 'paypal_order_not_eligible'
        };
      }
      return { status: 'error', code: 'paypal_provider_error' };
    },

    async handlePayPalWebhook(
      input: HandlePayPalWebhookInput
    ): Promise<HandlePayPalWebhookOutcome> {
      const contentLengthHeader = headerValue(input.headers, 'content-length');
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
      if (Number.isFinite(contentLength) && contentLength > PAYPAL_WEBHOOK_BODY_LIMIT_BYTES) {
        log('webhook.body_too_large', { contentLength }, 'warn');
        return { status: 'rejected', code: 'paypal_webhook_body_too_large' };
      }

      const rawBody = typeof input.rawBody === 'string' ? input.rawBody : await input.readRawBody();
      if (Buffer.byteLength(rawBody, 'utf8') > PAYPAL_WEBHOOK_BODY_LIMIT_BYTES) {
        log('webhook.body_too_large', {}, 'warn');
        return { status: 'rejected', code: 'paypal_webhook_body_too_large' };
      }

      if (!isConfigured(config)) {
        log('webhook.unconfigured', {}, 'error');
        return { status: 'unconfigured', code: 'missing_paypal_server_config' };
      }

      // ASVS L1 invariant: verify PayPal webhook signature BEFORE any persistence read/write or transition.
      const verification = await verifyPayPalWebhook({
        rawBody,
        headers: input.headers,
        config,
        transport
      });
      if (verification.status !== 'verified') {
        log(
          'webhook.verification_failed',
          {
            verificationStatus: verification.status,
            code: verification.code
          },
          verification.status === 'error' ? 'error' : 'warn'
        );
        await safeRecordFailure({
          action: 'paypal_webhook',
          severity: verification.status === 'error' ? 'error' : 'warning',
          errorCode: verification.code,
          summary: 'PayPal webhook verification failed',
          facts: {
            provider: 'paypal',
            ...webhookEventHints(rawBody)
          }
        });
        if (verification.status === 'error') {
          return { status: 'error', code: 'paypal_provider_error' };
        }
        if (verification.status === 'malformed') {
          return { status: 'malformed', code: 'malformed_paypal_webhook' };
        }
        return { status: 'rejected', code: verification.code };
      }

      const receivedAt = new Date(now()).toISOString();
      const dedupe = await store.recordDuplicateWebhookDelivery({
        providerEventId: verification.eventId,
        receivedAt
      });
      if (dedupe.duplicate) {
        log('webhook.duplicate_event', {
          providerEventId: verification.eventId,
          eventType: verification.eventType,
          deliveryCount: dedupe.deliveryCount
        });
        return { status: 'duplicate' };
      }

      const hints = eventOrderHints(verification.event);
      const order = hints ? await store.findOrder({ orderNumber: hints.orderNumber }) : null;
      const providerOrderId = order?.providerOrderId ?? hints?.providerOrderId ?? null;
      if (
        !hints ||
        !order ||
        order.orderId !== hints.orderId ||
        !isPayPalEligibleOrder(order) ||
        !providerOrderId
      ) {
        log(
          'webhook.order_not_found',
          { providerEventId: verification.eventId, eventType: verification.eventType },
          'warn'
        );
        return { status: 'ignored', code: 'paypal_order_not_found' };
      }

      const reconciliation = reconcilePayPalEvent({
        event: verification.event,
        order: { ...order, providerOrderId },
        expectedMerchantId: config.expectedMerchantId,
        orderExpired:
          order.paymentStatus === 'expired' || !isFutureDeadline(order.reservationExpiresAt, now())
      });

      if (reconciliation.status === 'rejected') {
        log(
          'webhook.reconciliation_rejected',
          {
            providerEventId: reconciliation.providerEventId ?? verification.eventId,
            eventType: reconciliation.eventType ?? verification.eventType,
            orderNumber: order.orderNumber,
            code: reconciliation.code
          },
          'warn'
        );
      }

      if (reconciliation.status === 'transition') {
        const transition = await store.applyPaymentTransition({
          transitionKey: `paypal-webhook:${reconciliation.providerEventId}`,
          source: 'paypal_webhook',
          targetStatus: reconciliation.targetStatus,
          orderNumber: order.orderNumber,
          providerEventId: reconciliation.providerEventId,
          eventType: reconciliation.eventType,
          verificationStatus: 'verified',
          payloadDigest: verification.payloadDigest,
          amountMinor: reconciliation.amountMinor,
          currencyCode: reconciliation.currencyCode,
          reviewReason: reconciliation.reviewReason,
          releaseReason:
            reconciliation.targetStatus === 'failed' ? 'paypal_capture_failed' : undefined,
          sanitizedFacts: reconciliation.sanitizedFacts
        });
        log(
          'webhook.transition_result',
          {
            providerEventId: reconciliation.providerEventId,
            eventType: reconciliation.eventType,
            orderNumber: order.orderNumber,
            transitionStatus: transition.status,
            paymentStatus: transition.paymentStatus,
            inventoryEffect: transition.inventoryEffect,
            code: transition.code
          },
          transition.status === 'error' || transition.status === 'invalid'
            ? 'error'
            : transition.status === 'review_required'
              ? 'warn'
              : 'info'
        );
        if (
          (transition.status === 'applied' || transition.status === 'duplicate') &&
          transition.paymentStatus === 'paid'
        ) {
          await safeTriggerEmailOutbox('paypal_webhook_paid');
        }
        return {
          status: 'accepted',
          result: transition.status,
          ...(transition.code !== undefined ? { code: transition.code } : {})
        };
      }

      if (reconciliation.status === 'refund_visibility') {
        await store.recordRefundVisibility({
          orderId: order.orderId,
          paymentId: order.paymentId,
          providerEventId: verification.eventId,
          eventType: verification.eventType,
          payloadDigest: verification.payloadDigest,
          refundStatus: reconciliation.refundStatus,
          refundedAmountMinor: reconciliation.refundedAmountMinor,
          sanitizedFacts: reconciliation.sanitizedFacts,
          receivedAt
        });
        log('webhook.refund_visibility_applied', {
          providerEventId: reconciliation.providerEventId,
          orderNumber: order.orderNumber,
          refundStatus: reconciliation.refundStatus
        });
        return {
          status: 'refund_visibility',
          refundStatus: reconciliation.refundStatus
        };
      }

      await store.recordWebhookReceipt({
        paymentId: order.paymentId,
        providerEventId: verification.eventId,
        eventType: verification.eventType,
        verificationStatus: reconciliation.status === 'rejected' ? 'rejected' : 'verified',
        payloadDigest: verification.payloadDigest,
        sanitizedFacts: reconciliation.sanitizedFacts,
        receivedAt
      });

      if (reconciliation.status === 'rejected') {
        return { status: 'review_required', code: reconciliation.code };
      }

      return { status: 'ignored', code: reconciliation.code };
    }
  };
}
