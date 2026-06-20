import type {CustomerPaymentStatus, FulfillmentGateStatus, PaymentInternalStatus, PaymentProvider} from '@/payments/types';
import {shippingAddressSchema, type ShippingAddress} from '@/checkout/shipping-address';
import {maskEmailForAdmin, sanitizeEmailFailureCode} from '@/fulfillment/admin-email-actions';
import type {Json} from '@/types/supabase';

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
  shippingAddress: ShippingAddress | null;
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
  physicalFulfillmentStatus: string;
  amountMinor: number;
  currencyCode: 'USD' | 'VND';
  provider: PaymentProvider;
  reservationExpiresAt: string | null;
  shippingAddress: ShippingAddress | null;
  updatedAt: string | null;
  failedEmailCount: number;
};

export type AdminFailedEmailQueueItem = {
  id: string;
  orderId: string | null;
  orderNumber: string;
  entitlementId: string | null;
  eventType: string;
  status: string;
  locale: 'en' | 'vi';
  recipientEmail: string;
  maskedRecipient: string;
  sanitizedError: string;
  nextRetryAt: string | null;
  createdAt: string | null;
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

export type AdminDigitalEntitlementItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  contactEmailMasked: string;
  status: string;
  version: number;
  grantedAt: string | null;
  updatedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
};

export type AdminEntitlementAuditItem = {
  eventType: string;
  actorType: string | null;
  actorId: string | null;
  metadata: Json | null;
  createdAt: string | null;
};

export type AdminPhysicalFulfillment = {
  id: string;
  orderId: string;
  status: string;
  version: number;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
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
  failedEmails: AdminFailedEmailQueueItem[];
  digitalEntitlements: AdminDigitalEntitlementItem[];
  entitlementAudit: AdminEntitlementAuditItem[];
  physicalFulfillment: AdminPhysicalFulfillment | null;
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

function asShippingAddress(value: unknown): ShippingAddress | null {
  const parsed = shippingAddressSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
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
    reservationExpiresAt: typeof data.reservationExpiresAt === 'string' ? data.reservationExpiresAt : null,
    shippingAddress: asShippingAddress(data.shippingAddress)
  };
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
  'order_id,order_number,contact_email,customer_payment_status,payment_status,fulfillment_gate_status,physical_fulfillment_status,total_minor,currency_code,provider,reservation_expires_at,shipping_address,updated_at';

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
    physicalFulfillmentStatus: typeof row.physical_fulfillment_status === 'string' ? row.physical_fulfillment_status : 'blocked',
    amountMinor: typeof row.total_minor === 'number' ? row.total_minor : 0,
    currencyCode: asCurrencyCode(row.currency_code),
    provider: asPaymentProvider(row.provider),
    reservationExpiresAt: typeof row.reservation_expires_at === 'string' ? row.reservation_expires_at : null,
    shippingAddress: asShippingAddress(row.shipping_address),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
    failedEmailCount: typeof row.failed_email_count === 'number' ? row.failed_email_count : 0
  };
}

function mapFailedEmailRow(row: Record<string, unknown>, fallbackOrderNumber: string): AdminFailedEmailQueueItem | null {
  if (typeof row.id !== 'string' || typeof row.event_type !== 'string' || typeof row.recipient_email !== 'string') {
    return null;
  }
  const payload = isRecord(row.payload) ? row.payload : {};
  return {
    id: row.id,
    orderId: typeof row.order_id === 'string' ? row.order_id : null,
    orderNumber: typeof payload.orderNumber === 'string' ? payload.orderNumber : fallbackOrderNumber,
    entitlementId: typeof row.entitlement_id === 'string' ? row.entitlement_id : null,
    eventType: row.event_type,
    status: typeof row.status === 'string' ? row.status : 'failed',
    locale: row.locale === 'vi' ? 'vi' : 'en',
    recipientEmail: row.recipient_email,
    maskedRecipient: maskEmailForAdmin(row.recipient_email),
    sanitizedError: sanitizeEmailFailureCode(typeof payload.failureCode === 'string' ? payload.failureCode : null),
    nextRetryAt: typeof row.available_at === 'string' ? row.available_at : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null
  };
}

async function getFailedEmailsForOrder(client: QueryClient, orderId: string, orderNumber: string) {
  const query = client.from('transactional_email_outbox').select(
    'id,order_id,entitlement_id,event_type,recipient_email,locale,status,payload,available_at,created_at'
  ) as {
    eq: (column: string, value: string) => {
      in: (column: string, values: string[]) => {
        order: (column: string, options?: Record<string, unknown>) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
  const {data, error} = await query.eq('order_id', orderId).in('status', ['failed', 'pending']).order('created_at', {ascending: false});
  if (error || !Array.isArray(data)) {
    return [];
  }
  return data.filter(isRecord).map((row) => mapFailedEmailRow(row, orderNumber)).filter((row): row is AdminFailedEmailQueueItem => Boolean(row));
}

async function getFailedEmailCounts(client: QueryClient) {
  const query = client.from('transactional_email_outbox').select('order_id,status') as {
    in: (column: string, values: string[]) => Promise<{data: unknown[] | null; error: unknown}>;
  };
  const {data, error} = await query.in('status', ['failed', 'pending']);
  const counts = new Map<string, number>();
  if (error || !Array.isArray(data)) {
    return counts;
  }
  for (const row of data.filter(isRecord)) {
    if (typeof row.order_id === 'string') {
      counts.set(row.order_id, (counts.get(row.order_id) ?? 0) + 1);
    }
  }
  return counts;
}

function mapPhysicalFulfillmentRow(row: Record<string, unknown>): AdminPhysicalFulfillment | null {
  if (typeof row.id !== 'string' || typeof row.order_id !== 'string') {
    return null;
  }
  return {
    id: row.id,
    orderId: row.order_id,
    status: typeof row.status === 'string' ? row.status : 'awaiting_fulfillment',
    version: typeof row.version === 'number' ? row.version : 0,
    carrier: typeof row.carrier === 'string' ? row.carrier : null,
    trackingNumber: typeof row.tracking_number === 'string' ? row.tracking_number : null,
    trackingUrl: typeof row.tracking_url === 'string' ? row.tracking_url : null,
    shippedAt: typeof row.shipped_at === 'string' ? row.shipped_at : null,
    deliveredAt: typeof row.delivered_at === 'string' ? row.delivered_at : null
  };
}

async function getPhysicalFulfillmentForOrder(client: QueryClient, orderId: string) {
  const query = client.from('physical_fulfillments').select('id,order_id,status,version,carrier,tracking_number,tracking_url,shipped_at,delivered_at') as {
    eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>};
  };
  const {data, error} = await query.eq('order_id', orderId).maybeSingle();
  if (error) {
    return null;
  }
  return mapPhysicalFulfillmentRow(isRecord(data) ? data : {});
}

function mapDigitalEntitlementRow(row: Record<string, unknown>): AdminDigitalEntitlementItem | null {
  if (typeof row.id !== 'string' || typeof row.order_id !== 'string' || typeof row.product_id !== 'string') {
    return null;
  }

  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    variantId: typeof row.variant_id === 'string' ? row.variant_id : null,
    contactEmailMasked: typeof row.contact_email === 'string' ? maskEmailForAdmin(row.contact_email) : 'masked',
    status: typeof row.status === 'string' ? row.status : 'unknown',
    version: typeof row.version === 'number' ? row.version : 0,
    grantedAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
    revokedAt: typeof row.revoked_at === 'string' ? row.revoked_at : null,
    revokeReason: typeof row.revoke_reason === 'string' ? sanitizeEmailFailureCode(row.revoke_reason) : null
  };
}

function mapEntitlementAuditRow(row: Record<string, unknown>): AdminEntitlementAuditItem | null {
  if (typeof row.event_type !== 'string') {
    return null;
  }

  return {
    eventType: row.event_type,
    actorType: typeof row.actor_type === 'string' ? row.actor_type : null,
    actorId: typeof row.actor_id === 'string' ? row.actor_id : null,
    metadata: (row.metadata ?? null) as Json | null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null
  };
}

async function getDigitalEntitlementsForOrder(client: QueryClient, orderId: string) {
  const query = client.from('digital_entitlements').select(
    'id,order_id,product_id,variant_id,contact_email,status,version,created_at,updated_at,revoked_at,revoke_reason'
  ) as {
    eq: (column: string, value: string) => {
      order: (column: string, options?: Record<string, unknown>) => Promise<{data: unknown[] | null; error: unknown}>;
    };
  };
  const {data, error} = await query.eq('order_id', orderId).order('created_at', {ascending: false});
  if (error || !Array.isArray(data)) {
    return [];
  }
  return data.filter(isRecord).map(mapDigitalEntitlementRow).filter((row): row is AdminDigitalEntitlementItem => Boolean(row));
}

async function getEntitlementAuditForOrder(client: QueryClient, orderId: string) {
  const query = client.from('fulfillment_audit_events').select('event_type,actor_type,actor_id,metadata,created_at') as {
    eq: (column: string, value: string) => {
      in: (column: string, values: string[]) => {
        order: (column: string, options?: Record<string, unknown>) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
  const {data, error} = await query
    .eq('order_id', orderId)
    .in('event_type', ['digital_entitlement_granted', 'digital_entitlement_revoked', 'digital_access_reissued', 'digital_access_resend_requested'])
    .order('created_at', {ascending: false});
  if (error || !Array.isArray(data)) {
    return [];
  }
  return data.filter(isRecord).map(mapEntitlementAuditRow).filter((row): row is AdminEntitlementAuditItem => Boolean(row));
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

  const counts = await getFailedEmailCounts(client);
  const orders = data
    .filter(isRecord)
    .map(mapQueueItem)
    .filter((row): row is AdminOrderQueueItem => Boolean(row))
    .map((order) => ({...order, failedEmailCount: counts.get(order.orderId) ?? order.failedEmailCount}));

  return {status: 'success', orders};
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
      timeline: timelineData.filter(isRecord).map(mapTimelineItem).filter((row): row is AdminOrderTimelineItem => Boolean(row)),
      failedEmails: await getFailedEmailsForOrder(client, base.orderId, base.orderNumber),
      digitalEntitlements: await getDigitalEntitlementsForOrder(client, base.orderId),
      entitlementAudit: await getEntitlementAuditForOrder(client, base.orderId),
      physicalFulfillment: await getPhysicalFulfillmentForOrder(client, base.orderId)
    }
  };
}

export async function getAdminOrderDetailByOrderNumber({
  orderNumber,
  client,
  requireAdmin: authorize = defaultRequireAdmin
}: {
  orderNumber: string;
  client: QueryClient;
  requireAdmin?: RequireAdmin;
}): Promise<AdminOrderDetailResult> {
  await authorize();

  const lookupQuery = client.from('order_payment_statuses').select('order_id') as Filterable<unknown>;
  const {data, error} = await lookupQuery.eq('order_number', orderNumber).maybeSingle();
  if (error) {
    return {status: 'error', code: 'admin_order_detail_failed'};
  }
  if (!isRecord(data) || typeof data.order_id !== 'string') {
    return {status: 'not_found'};
  }

  return getAdminOrderDetail({
    orderId: data.order_id,
    client,
    requireAdmin: async () => true
  });
}

export async function createAdminOrderQueryClient() {
  const {createSupabaseAdminClient} = await import('@/lib/supabase/admin');
  return createSupabaseAdminClient() as unknown as QueryClient;
}
