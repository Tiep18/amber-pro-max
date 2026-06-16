import {NextResponse} from 'next/server';
import {z} from 'zod';

import {getServerEnv} from '@/lib/env/server';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';
import {createPayPalOrder, getPayPalOrder, type PayPalOrderSource} from '@/payments/paypal/client';
import {getAuthorizedOrderPayment} from '@/payments/queries';

const createRouteSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80)
});

type QueryResult<T> = Promise<{data: T; error: unknown}>;
type QueryBuilder<T> = {
  select: (columns: string) => {eq: (column: string, value: string) => {maybeSingle: () => QueryResult<T>}};
  update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => QueryResult<unknown>};
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

async function loadPayPalOrderSourceByOrderNumber(client: RouteClient, orderNumber: string): Promise<PayPalOrderSource | null> {
  const {data: row, error: rowError} = await client
    .from('order_payment_statuses')
    .select('order_id,order_number,market,currency_code,total_minor,provider,payment_status,reservation_expires_at')
    .eq('order_number', orderNumber)
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
    providerOrderId: typeof payment.provider_order_id === 'string' ? payment.provider_order_id : null,
    paypalCreateRequestId: createId,
    paypalCaptureRequestId: captureId
  };
}

export async function POST(request: Request) {
  const input = createRouteSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return json(400, {status: 'invalid', code: 'invalid_paypal_order_request'});
  }

  const client = createSupabaseAdminClient() as unknown as RouteClient;
  const guestSecretHash = await getGuestOrderAccessHashFromServer(input.data.orderNumber);
  const authorized = await getAuthorizedOrderPayment({
    orderNumber: input.data.orderNumber,
    guestSecretHash,
    client
  });
  if (authorized.status !== 'found') {
    return json(404, {status: 'not_found'});
  }

  const order = await loadPayPalOrderSourceByOrderNumber(client, input.data.orderNumber);
  if (!order) {
    return json(409, {status: 'invalid', code: 'paypal_order_not_eligible'});
  }

  const env = getServerEnv();
  if (order.providerOrderId) {
    const retrieved = await getPayPalOrder({config: env.paypal, paypalOrderId: order.providerOrderId});
    if (retrieved.status === 'retrieved') {
      return json(200, {status: 'awaiting', paypalOrderId: retrieved.paypalOrderId});
    }
  }

  const created = await createPayPalOrder({config: env.paypal, order});
  if (created.status === 'created') {
    await client.from('payments').update({provider_order_id: created.paypalOrderId}).eq('order_id', order.orderId);
    return json(200, {status: 'awaiting', paypalOrderId: created.paypalOrderId});
  }
  if (created.status === 'verifying') {
    return json(202, created);
  }
  if (created.status === 'unconfigured') {
    return json(503, created);
  }

  return json(created.status === 'invalid' ? 409 : 502, created);
}
