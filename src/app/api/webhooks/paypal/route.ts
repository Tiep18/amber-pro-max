import {NextResponse} from 'next/server';

import {triggerTransactionalEmailOutboxNow} from '@/fulfillment/email-outbox.server';
import {getServerEnv} from '@/lib/env/server';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {recordOperationalFailure} from '@/operations/errors';
import type {PayPalOrderSource} from '@/payments/paypal/client';
import {logPayPalStage} from '@/payments/paypal/logging';
import {
  PAYPAL_WEBHOOK_BODY_LIMIT_BYTES,
  reconcilePayPalEvent,
  verifyPayPalWebhook,
  type PayPalEventReconciliationResult,
  type PayPalWebhookVerificationResult
} from '@/payments/paypal/verification';
import {applyPaymentTransition} from '@/payments/transitions';

export const runtime = 'nodejs';

type QueryResult<T> = Promise<{data: T; error: unknown}>;
type SelectBuilder<T> = {
  eq: (column: string, value: string) => SelectBuilder<T>;
  maybeSingle: () => QueryResult<T>;
};
type UpdateBuilder = {
  eq: (column: string, value: string) => UpdateBuilder;
};
type TableBuilder<T> = {
  select: (columns: string) => SelectBuilder<T>;
  insert: (value: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
  update: (value: Record<string, unknown>) => UpdateBuilder;
};
type WebhookClient = {
  from: <T = Record<string, unknown>>(table: string) => TableBuilder<T>;
  rpc: (fn: 'apply_payment_transition', args: {p_payload: Record<string, unknown>}) => Promise<{data: unknown; error: unknown}>;
};

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {status});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resourceFromEvent(event: unknown) {
  return isRecord(event) && isRecord(event.resource) ? event.resource : null;
}

function relatedProviderOrderId(resource: Record<string, unknown>) {
  const supplementary = isRecord(resource.supplementary_data) ? resource.supplementary_data : null;
  const relatedIds = isRecord(supplementary?.related_ids) ? supplementary.related_ids : null;
  return typeof relatedIds?.order_id === 'string' ? relatedIds.order_id : null;
}

function eventOrderHints(event: unknown) {
  const resource = resourceFromEvent(event);
  if (!resource) {
    return null;
  }

  const orderNumber = typeof resource.invoice_id === 'string' ? resource.invoice_id : null;
  const orderId = typeof resource.custom_id === 'string' ? resource.custom_id : null;
  const providerOrderId = relatedProviderOrderId(resource);
  if (!orderNumber || !orderId) {
    return null;
  }

  return {orderNumber, orderId, providerOrderId};
}

function webhookEventHints(event: unknown) {
  if (!isRecord(event)) {
    return {};
  }
  return {
    providerEventId: typeof event.id === 'string' ? event.id : undefined,
    eventType: typeof event.event_type === 'string' ? event.event_type : undefined
  };
}

async function recordPayPalWebhookFailure(input: {
  code: string;
  summary: string;
  severity?: 'warning' | 'error';
  event?: unknown;
}) {
  await recordOperationalFailure({
    area: 'payment',
    severity: input.severity ?? 'error',
    errorCode: input.code,
    summary: input.summary,
    facts: {
      provider: 'paypal',
      code: input.code,
      ...webhookEventHints(input.event)
    }
  });
}

async function findExistingEvent(client: WebhookClient, providerEventId: string) {
  const {data, error} = await client
    .from('payment_events')
    .select('id,delivery_count')
    .eq('provider', 'paypal')
    .eq('provider_event_id', providerEventId)
    .maybeSingle();
  if (error || !isRecord(data) || typeof data.id !== 'string') {
    return null;
  }
  return {
    id: data.id,
    deliveryCount: typeof data.delivery_count === 'number' ? data.delivery_count : 1
  };
}

async function incrementDelivery(client: WebhookClient, eventId: string, deliveryCount: number) {
  await client
    .from('payment_events')
    .update({
      delivery_count: deliveryCount + 1,
      last_received_at: new Date().toISOString()
    })
    .eq('id', eventId);
}

async function loadPayPalOrderSource(client: WebhookClient, event: unknown): Promise<(PayPalOrderSource & {paymentId: string; expired: boolean}) | null> {
  const hints = eventOrderHints(event);
  if (!hints) {
    return null;
  }

  const {data: row, error: rowError} = await client
    .from('order_payment_statuses')
    .select('order_id,order_number,market,currency_code,total_minor,provider,payment_status,reservation_expires_at')
    .eq('order_number', hints.orderNumber)
    .maybeSingle();
  if (rowError || !isRecord(row)) {
    return null;
  }

  const {data: payment, error: paymentError} = await client
    .from('payments')
    .select('id,order_id,provider_order_id,request_id,provider_request_id')
    .eq('order_id', String(row.order_id))
    .maybeSingle();
  if (paymentError || !isRecord(payment)) {
    return null;
  }

  if (
    row.order_id !== hints.orderId ||
    row.market !== 'intl' ||
    row.currency_code !== 'USD' ||
    row.provider !== 'paypal' ||
    typeof row.order_id !== 'string' ||
    typeof row.order_number !== 'string' ||
    typeof row.total_minor !== 'number' ||
    typeof payment.id !== 'string'
  ) {
    return null;
  }

  const providerOrderId = typeof payment.provider_order_id === 'string' ? payment.provider_order_id : hints.providerOrderId;
  if (!providerOrderId) {
    return null;
  }

  const deadlineMs = typeof row.reservation_expires_at === 'string' ? Date.parse(row.reservation_expires_at) : Number.NaN;
  return {
    paymentId: payment.id,
    expired: Number.isFinite(deadlineMs) && deadlineMs <= Date.now(),
    orderId: row.order_id,
    orderNumber: row.order_number,
    totalMinor: row.total_minor,
    currencyCode: 'USD',
    market: 'intl',
    paymentIntent: 'paypal_intent',
    providerOrderId,
    paypalCreateRequestId: typeof payment.provider_request_id === 'string' ? payment.provider_request_id : row.order_id,
    paypalCaptureRequestId: typeof payment.request_id === 'string' ? payment.request_id : row.order_id
  };
}

async function insertReceipt({
  client,
  paymentId,
  verification,
  reconciliation,
  verificationStatus
}: {
  client: WebhookClient;
  paymentId: string;
  verification: Extract<PayPalWebhookVerificationResult, {status: 'verified'}>;
  reconciliation: PayPalEventReconciliationResult;
  verificationStatus: 'verified' | 'rejected';
}) {
  await client.from('payment_events').insert({
    payment_id: paymentId,
    provider: 'paypal',
    provider_event_id: verification.eventId,
    event_type: verification.eventType,
    source: 'paypal_webhook',
    verification_status: verificationStatus,
    payload_digest: verification.payloadDigest,
    sanitized_facts: reconciliation.sanitizedFacts,
    delivery_count: 1,
    last_received_at: new Date().toISOString()
  });
}

async function applyRefundVisibility({
  client,
  orderId,
  paymentId,
  reconciliation
}: {
  client: WebhookClient;
  orderId: string;
  paymentId: string;
  reconciliation: Extract<PayPalEventReconciliationResult, {status: 'refund_visibility'}>;
}) {
  await client
    .from('payments')
    .update({
      status: reconciliation.refundStatus,
      refund_status: reconciliation.refundStatus,
      refunded_amount_minor: reconciliation.refundedAmountMinor,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId);
  await client
    .from('checkout_orders')
    .update({
      status: reconciliation.refundStatus,
      order_status: reconciliation.refundStatus,
      payment_status: reconciliation.refundStatus,
      refund_status: reconciliation.refundStatus,
      refunded_amount_minor: reconciliation.refundedAmountMinor,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);
}

function statusForRejected(verification: PayPalWebhookVerificationResult) {
  if (verification.status === 'rejected' && verification.code === 'paypal_webhook_body_too_large') {
    return 413;
  }
  return verification.status === 'error' ? 502 : 400;
}

export async function POST(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > PAYPAL_WEBHOOK_BODY_LIMIT_BYTES) {
    logPayPalStage('webhook.body_too_large', {contentLength: Number(contentLength)}, 'warn');
    return json(413, {status: 'rejected', code: 'paypal_webhook_body_too_large'});
  }

  const rawBody = await request.text();
  const env = getServerEnv();
  if (env.paypal.status !== 'configured' || !env.paypal.expectedMerchantId) {
    logPayPalStage('webhook.unconfigured', {}, 'error');
    return json(503, {status: 'unconfigured', code: 'missing_paypal_server_config'});
  }
  const expectedMerchantId = env.paypal.expectedMerchantId;

  const verification = await verifyPayPalWebhook({
    rawBody,
    headers: request.headers,
    config: env.paypal
  });
  if (verification.status !== 'verified') {
    logPayPalStage('webhook.verification_failed', {
      verificationStatus: verification.status,
      code: 'code' in verification ? verification.code : undefined
    }, verification.status === 'error' ? 'error' : 'warn');
    let parsedEvent: unknown;
    try {
      parsedEvent = JSON.parse(rawBody);
    } catch {
      parsedEvent = null;
    }
    await recordPayPalWebhookFailure({
      code: verification.code,
      summary: 'PayPal webhook verification failed',
      severity: verification.status === 'error' ? 'error' : 'warning',
      event: parsedEvent
    });
    return json(statusForRejected(verification), {status: verification.status, code: verification.code});
  }

  const client = createSupabaseAdminClient() as unknown as WebhookClient;
  const existingEvent = await findExistingEvent(client, verification.eventId);
  if (existingEvent) {
    await incrementDelivery(client, existingEvent.id, existingEvent.deliveryCount);
    logPayPalStage('webhook.duplicate_event', {providerEventId: verification.eventId, eventType: verification.eventType, deliveryCount: existingEvent.deliveryCount + 1});
    return json(200, {status: 'duplicate'});
  }

  const order = await loadPayPalOrderSource(client, verification.event);
  if (!order) {
    logPayPalStage('webhook.order_not_found', {providerEventId: verification.eventId, eventType: verification.eventType}, 'warn');
    return json(202, {status: 'ignored', code: 'paypal_order_not_found'});
  }

  const reconciliation = reconcilePayPalEvent({
    event: verification.event,
    order,
    expectedMerchantId,
    orderExpired: order.expired
  });
  if (reconciliation.status === 'rejected') {
    logPayPalStage('webhook.reconciliation_rejected', {
      providerEventId: reconciliation.providerEventId ?? verification.eventId,
      eventType: reconciliation.eventType ?? verification.eventType,
      orderNumber: order.orderNumber,
      code: reconciliation.code
    }, 'warn');
  }

  if (reconciliation.status === 'transition') {
    const transition = await applyPaymentTransition(
      {
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
        releaseReason: reconciliation.targetStatus === 'failed' ? 'paypal_capture_failed' : undefined,
        sanitizedFacts: reconciliation.sanitizedFacts
      },
      client
    );
    logPayPalStage('webhook.transition_result', {
      providerEventId: reconciliation.providerEventId,
      eventType: reconciliation.eventType,
      orderNumber: order.orderNumber,
      transitionStatus: transition.status,
      paymentStatus: transition.paymentStatus,
      inventoryEffect: transition.inventoryEffect,
      code: transition.code
    }, transition.status === 'error' || transition.status === 'invalid' ? 'error' : transition.status === 'review_required' ? 'warn' : 'info');
    if ((transition.status === 'applied' || transition.status === 'duplicate') && transition.paymentStatus === 'paid') {
      await triggerTransactionalEmailOutboxNow({reason: 'paypal_webhook_paid'});
    }
    return json(transition.status === 'error' ? 502 : 200, {status: 'accepted', result: transition.status, code: transition.code});
  }

  await insertReceipt({
    client,
    paymentId: order.paymentId,
    verification,
    reconciliation,
    verificationStatus: reconciliation.status === 'rejected' ? 'rejected' : 'verified'
  });

  if (reconciliation.status === 'refund_visibility') {
    await applyRefundVisibility({client, orderId: order.orderId, paymentId: order.paymentId, reconciliation});
    logPayPalStage('webhook.refund_visibility_applied', {providerEventId: reconciliation.providerEventId, orderNumber: order.orderNumber, refundStatus: reconciliation.refundStatus});
    return json(200, {status: 'refund_visibility', refundStatus: reconciliation.refundStatus});
  }

  if (reconciliation.status === 'rejected') {
    return json(202, {status: 'review_required', code: reconciliation.code});
  }

  return json(200, {status: reconciliation.status, code: 'code' in reconciliation ? reconciliation.code : undefined});
}
