import {NextResponse} from 'next/server';
import {z} from 'zod';

import {triggerTransactionalEmailOutboxNow} from '@/fulfillment/email-outbox.server';
import {getServerEnv} from '@/lib/env/server';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';
import {capturePayPalOrder, getPayPalOrder, type PayPalOrderSource} from '@/payments/paypal/client';
import {logPayPalStage, sanitizePayPalProviderOrderForLog} from '@/payments/paypal/logging';
import {reconcilePayPalCapture} from '@/payments/paypal/mapping';
import {getAuthorizedOrderPayment} from '@/payments/queries';
import {applyPaymentTransition} from '@/payments/transitions';

const paramsSchema = z.object({
  paypalOrderId: z.string().trim().min(1).max(120)
});

type QueryResult<T> = Promise<{data: T; error: unknown}>;
type QueryBuilder<T> = {
  select: (columns: string) => {eq: (column: string, value: string) => {maybeSingle: () => QueryResult<T>}};
};
type RouteClient = {
  from: <T = Record<string, unknown>>(table: string) => QueryBuilder<T>;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {status});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function futureDeadline(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now();
}

function requestIds(payment: Record<string, unknown>, orderId: string) {
  const createId = typeof payment.provider_request_id === 'string' && payment.provider_request_id ? payment.provider_request_id : orderId;
  const captureId = typeof payment.request_id === 'string' && payment.request_id ? payment.request_id : orderId;
  return {createId, captureId};
}

async function loadPayPalOrderSourceByProviderOrderId(client: RouteClient, paypalOrderId: string): Promise<PayPalOrderSource | null> {
  const {data: payment, error: paymentError} = await client
    .from('payments')
    .select('id,order_id,provider_order_id,request_id,provider_request_id')
    .eq('provider_order_id', paypalOrderId)
    .maybeSingle();
  if (paymentError || !isRecord(payment) || typeof payment.order_id !== 'string') {
    return null;
  }

  const {data: row, error: rowError} = await client
    .from('order_payment_statuses')
    .select('order_id,order_number,market,currency_code,total_minor,provider,payment_status,reservation_expires_at')
    .eq('order_id', payment.order_id)
    .maybeSingle();
  if (rowError || !isRecord(row)) {
    return null;
  }

  if (
    row.market !== 'intl' ||
    row.currency_code !== 'USD' ||
    row.provider !== 'paypal' ||
    !futureDeadline(row.reservation_expires_at) ||
    typeof row.order_id !== 'string' ||
    typeof row.order_number !== 'string' ||
    typeof row.total_minor !== 'number'
  ) {
    return null;
  }

  const {createId, captureId} = requestIds(payment, row.order_id);
  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    totalMinor: row.total_minor,
    currencyCode: 'USD',
    market: 'intl',
    paymentIntent: 'paypal_intent',
    providerOrderId: paypalOrderId,
    paypalCreateRequestId: createId,
    paypalCaptureRequestId: captureId
  };
}

async function reconcileAndTransition({
  providerOrder,
  order,
  expectedMerchantId,
  client
}: {
  providerOrder: unknown;
  order: PayPalOrderSource;
  expectedMerchantId: string;
  client: RouteClient;
}) {
  const reconciled = reconcilePayPalCapture({providerOrder, order, expectedMerchantId});
  if (reconciled.status === 'rejected') {
    logPayPalStage('capture.reconciliation_rejected', {
      orderNumber: order.orderNumber,
      orderId: order.orderId,
      paypalOrderId: order.providerOrderId,
      code: reconciled.code,
      providerOrder: sanitizePayPalProviderOrderForLog(providerOrder)
    }, 'warn');
    return json(202, {status: 'review_required', code: reconciled.code});
  }
  logPayPalStage('capture.reconciliation_verified', {
    orderNumber: order.orderNumber,
    orderId: order.orderId,
    paypalOrderId: reconciled.facts.providerOrderId,
    providerCaptureId: reconciled.facts.providerCaptureId,
    merchantVerificationSource: reconciled.facts.merchantVerificationSource,
    amountMinor: reconciled.facts.amountMinor,
    currencyCode: reconciled.facts.currencyCode
  });

  const transition = await applyPaymentTransition(
    {
      transitionKey: `paypal-recheck:${reconciled.facts.providerCaptureId}`,
      source: 'paypal_recheck',
      targetStatus: 'paid',
      orderNumber: order.orderNumber,
      providerEventId: reconciled.facts.providerCaptureId,
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      verificationStatus: 'verified',
      amountMinor: reconciled.facts.amountMinor,
      currencyCode: reconciled.facts.currencyCode,
      sanitizedFacts: {
        providerOrderId: reconciled.facts.providerOrderId,
        providerCaptureId: reconciled.facts.providerCaptureId,
        merchantId: reconciled.facts.merchantId,
        merchantVerificationSource: reconciled.facts.merchantVerificationSource,
        amountMinor: reconciled.facts.amountMinor,
        currencyCode: reconciled.facts.currencyCode
      }
    },
    client
  );
  logPayPalStage('capture.transition_result', {
    orderNumber: order.orderNumber,
    orderId: order.orderId,
    paypalOrderId: reconciled.facts.providerOrderId,
    providerCaptureId: reconciled.facts.providerCaptureId,
    transitionStatus: transition.status,
    paymentStatus: transition.paymentStatus,
    inventoryEffect: transition.inventoryEffect,
    code: transition.code
  }, transition.status === 'error' || transition.status === 'invalid' ? 'error' : transition.status === 'review_required' ? 'warn' : 'info');

  if ((transition.status === 'applied' || transition.status === 'duplicate') && transition.paymentStatus === 'paid') {
    await triggerTransactionalEmailOutboxNow({reason: 'paypal_capture_paid'});
    return json(200, {status: 'paid', paymentStatus: transition.paymentStatus ?? 'paid'});
  }
  if (transition.status === 'review_required') {
    return json(202, {status: 'review_required', code: transition.code ?? 'payment_review_required'});
  }
  return json(409, {status: 'verifying', code: transition.code ?? 'payment_transition_not_applied'});
}

export async function POST(_request: Request, context: {params: Promise<{paypalOrderId: string}>}) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    logPayPalStage('capture.invalid_request', {}, 'warn');
    return json(400, {status: 'invalid', code: 'invalid_paypal_capture_request'});
  }

  const authClient = (await createSupabaseServerClient()) as unknown as RouteClient;
  const client = createSupabaseAdminClient() as unknown as RouteClient;
  const order = await loadPayPalOrderSourceByProviderOrderId(client, params.data.paypalOrderId);
  if (!order) {
    logPayPalStage('capture.local_order_not_found', {paypalOrderId: params.data.paypalOrderId}, 'warn');
    return json(404, {status: 'not_found'});
  }

  const guestSecretHash = await getGuestOrderAccessHashFromServer(order.orderNumber);
  const authorized = await getAuthorizedOrderPayment({
    orderNumber: order.orderNumber,
    guestSecretHash,
    client: authClient
  });
  if (authorized.status !== 'found') {
    logPayPalStage('capture.authorization_failed', {orderNumber: order.orderNumber, paypalOrderId: params.data.paypalOrderId, status: authorized.status}, 'warn');
    return json(404, {status: 'not_found'});
  }

  const env = getServerEnv();
  if (env.paypal.status !== 'configured' || !env.paypal.expectedMerchantId) {
    logPayPalStage('capture.unconfigured', {orderNumber: order.orderNumber, paypalOrderId: params.data.paypalOrderId}, 'error');
    return json(503, {status: 'unconfigured', code: 'missing_paypal_server_config'});
  }
  const expectedMerchantId = env.paypal.expectedMerchantId;

  const captured = await capturePayPalOrder({config: env.paypal, order});
  if (captured.status !== 'captured') {
    logPayPalStage('capture.provider_capture_result', {
      orderNumber: order.orderNumber,
      orderId: order.orderId,
      paypalOrderId: params.data.paypalOrderId,
      providerStatus: captured.status,
      code: 'code' in captured ? captured.code : undefined
    }, captured.status === 'verifying' ? 'warn' : 'error');
  }
  if (captured.status === 'captured') {
    return reconcileAndTransition({providerOrder: captured.providerOrder, order, expectedMerchantId, client});
  }
  if (captured.status === 'verifying') {
    const retrieved = await getPayPalOrder({config: env.paypal, paypalOrderId: params.data.paypalOrderId});
    logPayPalStage('capture.provider_retrieve_after_uncertain', {
      orderNumber: order.orderNumber,
      orderId: order.orderId,
      paypalOrderId: params.data.paypalOrderId,
      providerStatus: retrieved.status,
      code: 'code' in retrieved ? retrieved.code : undefined
    }, retrieved.status === 'retrieved' ? 'info' : 'warn');
    if (retrieved.status === 'retrieved') {
      return reconcileAndTransition({providerOrder: retrieved.providerOrder, order, expectedMerchantId, client});
    }
    return json(202, captured);
  }

  return json(captured.status === 'invalid' ? 409 : 502, captured);
}
