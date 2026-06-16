import 'server-only';

import {createHash} from 'node:crypto';

import type {PayPalOrderSource, PayPalServerConfig, PayPalTransport, PayPalWebhookVerificationHeaders} from './client';
import {verifyPayPalWebhookSignature} from './client';
import {reconcilePayPalCaptureResource} from './mapping';
import type {PaymentTransitionTarget} from '@/payments/types';

export const PAYPAL_WEBHOOK_BODY_LIMIT_BYTES = 256 * 1024;

type PayPalWebhookHeaderSource = Headers | Record<string, string | undefined>;

type PayPalWebhookEvent = {
  id: string;
  event_type: string;
  create_time?: string;
  resource?: unknown;
};

export type PayPalWebhookVerificationResult =
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
  | {status: 'malformed'; code: 'malformed_paypal_webhook'; payloadDigest: string}
  | {status: 'error'; code: 'paypal_provider_error'; payloadDigest?: string};

export type PayPalEventReconciliationResult =
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
  | {status: 'duplicate'; providerEventId: string; eventType: string; sanitizedFacts: Record<string, unknown>}
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
        | 'paypal_order_mismatch'
        | 'paypal_capture_missing'
        | 'paypal_capture_not_completed'
        | 'paypal_merchant_mismatch'
        | 'paypal_amount_mismatch'
        | 'paypal_currency_mismatch';
      providerEventId?: string;
      eventType?: string;
      sanitizedFacts: Record<string, unknown>;
    };

export type ReconcilePayPalEventInput = {
  event: unknown;
  order: PayPalOrderSource;
  expectedMerchantId: string;
  alreadyProcessed?: boolean;
  orderExpired?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function headerValue(headers: PayPalWebhookHeaderSource, name: string) {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const lowerName = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
  return entry?.[1];
}

function extractHeaders(headers: PayPalWebhookHeaderSource): PayPalWebhookVerificationHeaders | null {
  const authAlgo = headerValue(headers, 'paypal-auth-algo');
  const certUrl = headerValue(headers, 'paypal-cert-url');
  const transmissionId = headerValue(headers, 'paypal-transmission-id');
  const transmissionSig = headerValue(headers, 'paypal-transmission-sig');
  const transmissionTime = headerValue(headers, 'paypal-transmission-time');

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return null;
  }

  return {authAlgo, certUrl, transmissionId, transmissionSig, transmissionTime};
}

export function digestRawBody(rawBody: string) {
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

export async function verifyPayPalWebhook({
  rawBody,
  headers,
  config,
  transport
}: {
  rawBody: string;
  headers: PayPalWebhookHeaderSource;
  config: PayPalServerConfig;
  transport?: PayPalTransport;
}): Promise<PayPalWebhookVerificationResult> {
  if (Buffer.byteLength(rawBody, 'utf8') > PAYPAL_WEBHOOK_BODY_LIMIT_BYTES) {
    return {status: 'rejected', code: 'paypal_webhook_body_too_large'};
  }

  const payloadDigest = digestRawBody(rawBody);
  const verificationHeaders = extractHeaders(headers);
  if (!verificationHeaders) {
    return {status: 'rejected', code: 'missing_paypal_webhook_headers', payloadDigest};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return {status: 'malformed', code: 'malformed_paypal_webhook', payloadDigest};
  }

  const event = parseWebhookEvent(parsed);
  if (!event) {
    return {status: 'malformed', code: 'malformed_paypal_webhook', payloadDigest};
  }

  const signature = await verifyPayPalWebhookSignature({
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
    return {status: 'error', code: signature.code, payloadDigest};
  }

  return {status: 'rejected', code: signature.code, payloadDigest};
}

function parseUsdMinor(value: unknown) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) {
    return null;
  }

  const [major, minor] = value.split('.');
  return Number(major) * 100 + Number(minor);
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

function reconcileRefund(event: PayPalWebhookEvent, order: PayPalOrderSource): PayPalEventReconciliationResult {
  const resource = isRecord(event.resource) ? event.resource : null;
  if (!resource || resource.invoice_id !== order.orderNumber || resource.custom_id !== order.orderId) {
    return {status: 'rejected', code: 'paypal_order_mismatch', providerEventId: event.id, eventType: event.event_type, sanitizedFacts: safeResourceFacts(event)};
  }

  const amount = isRecord(resource.amount) ? resource.amount : null;
  if (!amount || amount.currency_code !== 'USD') {
    return {status: 'rejected', code: 'paypal_currency_mismatch', providerEventId: event.id, eventType: event.event_type, sanitizedFacts: safeResourceFacts(event)};
  }

  const refundedAmountMinor = parseUsdMinor(amount.value);
  if (refundedAmountMinor === null || refundedAmountMinor <= 0 || refundedAmountMinor > order.totalMinor) {
    return {status: 'rejected', code: 'paypal_amount_mismatch', providerEventId: event.id, eventType: event.event_type, sanitizedFacts: safeResourceFacts(event)};
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

export function reconcilePayPalEvent({
  event,
  order,
  expectedMerchantId,
  alreadyProcessed = false,
  orderExpired = false
}: ReconcilePayPalEventInput): PayPalEventReconciliationResult {
  const parsed = parseWebhookEvent(event);
  if (!parsed) {
    return {status: 'rejected', code: 'malformed_paypal_webhook', sanitizedFacts: {}};
  }

  const baseFacts = safeResourceFacts(parsed);
  if (alreadyProcessed) {
    return {status: 'duplicate', providerEventId: parsed.id, eventType: parsed.event_type, sanitizedFacts: baseFacts};
  }

  if (parsed.event_type === 'PAYMENT.CAPTURE.PENDING') {
    return {status: 'ignored', code: 'paypal_capture_pending', providerEventId: parsed.id, eventType: parsed.event_type, sanitizedFacts: baseFacts};
  }

  if (parsed.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
    return reconcileRefund(parsed, order);
  }

  if (parsed.event_type === 'PAYMENT.CAPTURE.DECLINED' || parsed.event_type === 'PAYMENT.CAPTURE.DENIED') {
    return {
      status: 'transition',
      providerEventId: parsed.id,
      eventType: parsed.event_type,
      targetStatus: 'failed',
      sanitizedFacts: baseFacts
    };
  }

  if (parsed.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    return {
      status: 'ignored',
      code: 'unsupported_paypal_webhook_event',
      providerEventId: parsed.id,
      eventType: parsed.event_type,
      sanitizedFacts: baseFacts
    };
  }

  const capture = reconcilePayPalCaptureResource({capture: parsed.resource, order, expectedMerchantId});
  if (capture.status === 'rejected') {
    return {status: 'rejected', code: capture.code, providerEventId: parsed.id, eventType: parsed.event_type, sanitizedFacts: baseFacts};
  }

  return {
    status: 'transition',
    providerEventId: parsed.id,
    eventType: parsed.event_type,
    targetStatus: 'paid',
    amountMinor: capture.facts.amountMinor,
    currencyCode: capture.facts.currencyCode,
    reviewReason: orderExpired ? 'late_payment_detected' : undefined,
    sanitizedFacts: {
      ...baseFacts,
      providerOrderId: capture.facts.providerOrderId,
      providerCaptureId: capture.facts.providerCaptureId,
      merchantId: capture.facts.merchantId,
      amountMinor: capture.facts.amountMinor,
      currencyCode: capture.facts.currencyCode
    }
  };
}
