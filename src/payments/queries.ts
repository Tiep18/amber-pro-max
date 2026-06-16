import type {CustomerPaymentStatus, FulfillmentGateStatus, PaymentInternalStatus, PaymentProvider} from '@/payments/types';
import type {Database, Json} from '@/types/supabase';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

type QueryBuilder = {
  select: (columns?: string) => unknown;
};

type QueryClient = RpcClient & {
  from: (table: string) => QueryBuilder;
};

type RequireAdmin = () => Promise<unknown>;

export type CustomerOrderPaymentProjection = {
  orderId?: string;
  paymentId?: string | null;
  orderNumber: string;
  market?: 'vn' | 'intl' | string;
  paymentIntent?: 'paypal_intent' | 'vietqr_intent' | string;
  provider?: PaymentProvider;
  paymentStatus?: PaymentInternalStatus;
  customerPaymentStatus: CustomerPaymentStatus;
  fulfillmentGateStatus: FulfillmentGateStatus;
  amountMinor: number;
  currencyCode: 'USD' | 'VND';
  reservationExpiresAt: string | null;
};

export type AuthorizedOrderPaymentResult =
  | {status: 'found'; order: CustomerOrderPaymentProjection}
  | {status: 'not_found'}
  | {status: 'error'; code: 'order_payment_lookup_failed'};

export type AdminOrderQueueItem = {
  orderId: string;
  orderNumber: string;
  contactEmail: string;
  customerPaymentStatus: CustomerPaymentStatus;
  paymentStatus: PaymentInternalStatus;
  fulfillmentGateStatus: FulfillmentGateStatus;
  amountMinor: number;
  currencyCode: 'USD' | 'VND';
  provider: PaymentProvider;
  reservationExpiresAt: string | null;
  updatedAt: string | null;
};

export type AdminOrderTimelineItem = {
  eventType: string;
  actorType: string | null;
  actorId: string | null;
  source: string | null;
  paymentId: string | null;
  paymentTransitionId: string | null;
  sanitizedFacts: Json | null;
  createdAt: string | null;
};

export type AdminOrderDetail = AdminOrderQueueItem & {
  ownerUserId: string | null;
  paymentId: string | null;
  digitalFulfillmentStatus: string;
  physicalFulfillmentStatus: string;
  refundStatus: string;
  refundedAmountMinor: number;
  reviewReason: string | null;
  vietQrEvidence: {
    transferReference: string;
    expectedAmountMinor: number;
    paymentDeadlineAt: string | null;
    actionAvailable: boolean;
    latestEvidence: Json | null;
  } | null;
  timeline: AdminOrderTimelineItem[];
};

export type AdminOrderQueueResult =
  | {status: 'success'; orders: AdminOrderQueueItem[]}
  | {status: 'error'; code: 'admin_order_queue_failed'};

export type AdminOrderDetailResult =
  | {status: 'success'; order: AdminOrderDetail}
  | {status: 'not_found'}
  | {status: 'error'; code: 'admin_order_detail_failed'};

function asCurrencyCode(value: unknown): 'USD' | 'VND' {
  return value === 'VND' ? 'VND' : 'USD';
}

function asPaymentProvider(value: unknown): PaymentProvider {
  return value === 'vietqr' ? 'vietqr' : 'paypal';
}

function asCustomerPaymentStatus(value: unknown): CustomerPaymentStatus {
  if (
    value === 'awaiting_payment' ||
    value === 'verifying_payment' ||
    value === 'paid' ||
    value === 'payment_failed' ||
    value === 'payment_cancelled' ||
    value === 'expired' ||
    value === 'partially_refunded' ||
    value === 'refunded'
  ) {
    return value;
  }
  return 'verifying_payment';
}

function asPaymentStatus(value: unknown): PaymentInternalStatus {
  if (
    value === 'pending' ||
    value === 'verifying' ||
    value === 'paid' ||
    value === 'failed' ||
    value === 'cancelled' ||
    value === 'rejected' ||
    value === 'expired' ||
    value === 'review_required' ||
    value === 'partially_refunded' ||
    value === 'refunded'
  ) {
    return value;
  }
  return 'review_required';
}

function asFulfillmentGateStatus(value: unknown): FulfillmentGateStatus {
  if (value === 'eligible' || value === 'review_required') {
    return value;
  }
  return 'locked';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function defaultRequireAdmin() {
  const {requireAdmin} = await import('@/auth/guards');
  return requireAdmin();
}

export async function getAuthorizedOrderPayment({
  orderNumber,
  guestSecretHash,
  client
}: {
  orderNumber: string;
  guestSecretHash?: string | null;
  client: RpcClient;
}): Promise<AuthorizedOrderPaymentResult> {
  const {data, error} = await client.rpc('get_order_payment_status', {
    p_order_number: orderNumber,
    p_guest_secret_hash: guestSecretHash ?? null
  });
  if (error) {
    return {status: 'error', code: 'order_payment_lookup_failed'};
  }
  if (!isRecord(data) || data.status !== 'found') {
    return {status: 'not_found'};
  }
  if (typeof data.orderNumber !== 'string' || typeof data.amountMinor !== 'number') {
    return {status: 'error', code: 'order_payment_lookup_failed'};
  }

  const order: CustomerOrderPaymentProjection = {
    orderNumber: data.orderNumber,
    customerPaymentStatus: asCustomerPaymentStatus(data.customerPaymentStatus),
    fulfillmentGateStatus: asFulfillmentGateStatus(data.fulfillmentGateStatus),
    amountMinor: data.amountMinor,
    currencyCode: asCurrencyCode(data.currencyCode),
    reservationExpiresAt: typeof data.reservationExpiresAt === 'string' ? data.reservationExpiresAt : null
  };
  if (typeof data.orderId === 'string') {
    order.orderId = data.orderId;
  }
  if (typeof data.paymentId === 'string') {
    order.paymentId = data.paymentId;
  }
  if (typeof data.market === 'string') {
    order.market = data.market;
  }
  if (data.paymentIntent === 'paypal_intent' || data.paymentIntent === 'vietqr_intent') {
    order.paymentIntent = data.paymentIntent;
  }
  if (data.provider === 'paypal' || data.provider === 'vietqr') {
    order.provider = data.provider;
  }
  if (typeof data.paymentStatus === 'string') {
    order.paymentStatus = asPaymentStatus(data.paymentStatus);
  }

  return {
    status: 'found',
    order
  };
}

const ADMIN_QUEUE_SELECT =
  'order_id,order_number,contact_email,customer_payment_status,payment_status,fulfillment_gate_status,total_minor,currency_code,provider,reservation_expires_at,updated_at';

const ADMIN_DETAIL_SELECT = `${ADMIN_QUEUE_SELECT},owner_user_id,payment_id,digital_fulfillment_status,physical_fulfillment_status,refund_status,refunded_amount_minor,review_reason`;

function mapQueueItem(row: Record<string, unknown>): AdminOrderQueueItem | null {
  if (typeof row.order_id !== 'string' || typeof row.order_number !== 'string' || typeof row.contact_email !== 'string') {
    return null;
  }

  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    contactEmail: row.contact_email,
    customerPaymentStatus: asCustomerPaymentStatus(row.customer_payment_status),
    paymentStatus: asPaymentStatus(row.payment_status),
    fulfillmentGateStatus: asFulfillmentGateStatus(row.fulfillment_gate_status),
    amountMinor: typeof row.total_minor === 'number' ? row.total_minor : 0,
    currencyCode: asCurrencyCode(row.currency_code),
    provider: asPaymentProvider(row.provider),
    reservationExpiresAt: typeof row.reservation_expires_at === 'string' ? row.reservation_expires_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null
  };
}

function mapTimelineItem(row: Record<string, unknown>): AdminOrderTimelineItem | null {
  if (typeof row.event_type !== 'string') {
    return null;
  }

  return {
    eventType: row.event_type,
    actorType: typeof row.actor_type === 'string' ? row.actor_type : null,
    actorId: typeof row.actor_id === 'string' ? row.actor_id : null,
    source: typeof row.source === 'string' ? row.source : null,
    paymentId: typeof row.payment_id === 'string' ? row.payment_id : null,
    paymentTransitionId: typeof row.payment_transition_id === 'string' ? row.payment_transition_id : null,
    sanitizedFacts: (row.sanitized_facts ?? null) as Json | null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null
  };
}

function isPendingVietQrAction(row: AdminOrderQueueItem) {
  const deadlineMs = row.reservationExpiresAt ? Date.parse(row.reservationExpiresAt) : Number.NaN;
  return (
    row.provider === 'vietqr' &&
    (row.paymentStatus === 'pending' || row.paymentStatus === 'verifying') &&
    Number.isFinite(deadlineMs) &&
    deadlineMs > Date.now()
  );
}

type Orderable<T> = {order: (column: string, options?: Record<string, unknown>) => Promise<{data: T; error: unknown}>};
type Filterable<T> = {eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: T; error: unknown}>}};

export async function getAdminOrderQueue({
  client,
  requireAdmin: authorize = defaultRequireAdmin
}: {
  client: QueryClient;
  requireAdmin?: RequireAdmin;
}): Promise<AdminOrderQueueResult> {
  await authorize();

  const query = client.from('order_payment_statuses').select(ADMIN_QUEUE_SELECT) as Orderable<unknown[]>;
  const {data, error} = await query.order('updated_at', {ascending: false});
  if (error || !Array.isArray(data)) {
    return {status: 'error', code: 'admin_order_queue_failed'};
  }

  return {status: 'success', orders: data.filter(isRecord).map(mapQueueItem).filter((row): row is AdminOrderQueueItem => Boolean(row))};
}

export async function getAdminOrderDetail({
  orderId,
  client,
  requireAdmin: authorize = defaultRequireAdmin
}: {
  orderId: string;
  client: QueryClient;
  requireAdmin?: RequireAdmin;
}): Promise<AdminOrderDetailResult> {
  await authorize();

  const detailQuery = client.from('order_payment_statuses').select(ADMIN_DETAIL_SELECT) as Filterable<unknown>;
  const {data, error} = await detailQuery.eq('order_id', orderId).maybeSingle();
  if (error) {
    return {status: 'error', code: 'admin_order_detail_failed'};
  }
  if (!isRecord(data)) {
    return {status: 'not_found'};
  }

  const base = mapQueueItem(data);
  if (!base) {
    return {status: 'error', code: 'admin_order_detail_failed'};
  }

  const {data: timelineData, error: timelineError} = await client.rpc('get_admin_order_timeline', {p_order_id: orderId});
  if (timelineError || !Array.isArray(timelineData)) {
    return {status: 'error', code: 'admin_order_detail_failed'};
  }

  return {
    status: 'success',
    order: {
      ...base,
      ownerUserId: typeof data.owner_user_id === 'string' ? data.owner_user_id : null,
      paymentId: typeof data.payment_id === 'string' ? data.payment_id : null,
      digitalFulfillmentStatus: typeof data.digital_fulfillment_status === 'string' ? data.digital_fulfillment_status : 'blocked',
      physicalFulfillmentStatus: typeof data.physical_fulfillment_status === 'string' ? data.physical_fulfillment_status : 'blocked',
      refundStatus: typeof data.refund_status === 'string' ? data.refund_status : 'none',
      refundedAmountMinor: typeof data.refunded_amount_minor === 'number' ? data.refunded_amount_minor : 0,
      reviewReason: typeof data.review_reason === 'string' ? data.review_reason : null,
      vietQrEvidence:
        base.provider === 'vietqr'
          ? {
              transferReference: base.orderNumber,
              expectedAmountMinor: base.amountMinor,
              paymentDeadlineAt: base.reservationExpiresAt,
              actionAvailable: isPendingVietQrAction(base),
              latestEvidence: null
            }
          : null,
      timeline: timelineData.filter(isRecord).map(mapTimelineItem).filter((row): row is AdminOrderTimelineItem => Boolean(row))
    }
  };
}

export async function createAdminOrderQueryClient() {
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return createSupabaseAdminClient() as unknown as QueryClient;
}
