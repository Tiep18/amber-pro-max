import type {Locale} from '@/i18n/routing';
import {recordOperationalFailure} from '@/operations/errors';

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options?: Record<string, unknown>) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
};

export type CustomerOrderHistoryItem = {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  customerPaymentStatus: string;
  fulfillmentGateStatus: string;
  digitalFulfillmentStatus: string;
  physicalFulfillmentStatus: string;
  amountMinor: number;
  currencyCode: 'USD' | 'VND';
  updatedAt: string | null;
};

export type CustomerPatternLibraryItem = {
  productId: string;
  title: string;
  purchaseCount: number;
  latestPurchaseAt: string | null;
  active: boolean;
  latestOrderNumber: string;
  orders: {orderNumber: string; purchasedAt: string | null; status: string}[];
};

export type CustomerOrderHistoryResult =
  | {status: 'success'; orders: CustomerOrderHistoryItem[]}
  | {status: 'error'; code: 'account_orders_failed'};

export type CustomerPatternLibraryResult =
  | {status: 'success'; patterns: CustomerPatternLibraryItem[]}
  | {status: 'error'; code: 'pattern_library_failed'};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asCurrency(value: unknown): 'USD' | 'VND' {
  return value === 'VND' ? 'VND' : 'USD';
}

function mapOrderRow(row: Record<string, unknown>): CustomerOrderHistoryItem | null {
  if (typeof row.order_id !== 'string' || typeof row.order_number !== 'string') {
    return null;
  }
  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    paymentStatus: typeof row.payment_status === 'string' ? row.payment_status : 'review_required',
    customerPaymentStatus: typeof row.customer_payment_status === 'string' ? row.customer_payment_status : 'verifying_payment',
    fulfillmentGateStatus: typeof row.fulfillment_gate_status === 'string' ? row.fulfillment_gate_status : 'locked',
    digitalFulfillmentStatus: typeof row.digital_fulfillment_status === 'string' ? row.digital_fulfillment_status : 'blocked',
    physicalFulfillmentStatus: typeof row.physical_fulfillment_status === 'string' ? row.physical_fulfillment_status : 'blocked',
    amountMinor: typeof row.total_minor === 'number' ? row.total_minor : 0,
    currencyCode: asCurrency(row.currency_code),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null
  };
}

function translations(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  return [];
}

function titleFor(row: Record<string, unknown>, locale: Locale) {
  const product = isRecord(row.products) ? row.products : null;
  const localized = translations(product?.product_translations).find((entry) => entry.locale === locale);
  const fallback = translations(product?.product_translations)[0];
  return typeof localized?.title === 'string' ? localized.title : typeof fallback?.title === 'string' ? fallback.title : 'PDF pattern';
}

function orderNumberFor(row: Record<string, unknown>) {
  const order = isRecord(row.checkout_orders) ? row.checkout_orders : null;
  return typeof order?.order_number === 'string' ? order.order_number : '';
}

async function recordCustomerFulfillmentQueryFailure({
  action,
  code,
  summary
}: {
  action: 'account_orders' | 'pattern_library';
  code: 'account_orders_failed' | 'pattern_library_failed';
  summary: string;
}) {
  await recordOperationalFailure({
    area: 'fulfillment',
    severity: 'error',
    errorCode: `customer.${action}.query_failed`,
    summary,
    facts: {
      action,
      code
    }
  });
}

export async function getCustomerOrderHistory({userId, client}: {userId: string; client: QueryClient}): Promise<CustomerOrderHistoryResult> {
  const query = client.from('order_payment_statuses').select(
    'order_id,order_number,customer_payment_status,payment_status,fulfillment_gate_status,digital_fulfillment_status,physical_fulfillment_status,total_minor,currency_code,updated_at'
  );
  const {data, error} = await query.eq('owner_user_id', userId).order('updated_at', {ascending: false});
  if (error || !Array.isArray(data)) {
    await recordCustomerFulfillmentQueryFailure({
      action: 'account_orders',
      code: 'account_orders_failed',
      summary: error ? 'Customer account order history query failed' : 'Customer account order history returned an unexpected result'
    });
    return {status: 'error', code: 'account_orders_failed'};
  }
  return {status: 'success', orders: data.filter(isRecord).map(mapOrderRow).filter((row): row is CustomerOrderHistoryItem => Boolean(row))};
}

export async function getCustomerPatternLibrary({userId, locale, client}: {userId: string; locale: Locale; client: QueryClient}): Promise<CustomerPatternLibraryResult> {
  const query = client.from('digital_entitlements').select(
    'id,product_id,status,created_at,checkout_orders(order_number),products(product_translations(locale,title))'
  );
  const {data, error} = await query.eq('owner_user_id', userId).order('created_at', {ascending: false});
  if (error || !Array.isArray(data)) {
    await recordCustomerFulfillmentQueryFailure({
      action: 'pattern_library',
      code: 'pattern_library_failed',
      summary: error ? 'Customer pattern library query failed' : 'Customer pattern library returned an unexpected result'
    });
    return {status: 'error', code: 'pattern_library_failed'};
  }

  const grouped = new Map<string, CustomerPatternLibraryItem>();
  for (const row of data.filter(isRecord)) {
    if (typeof row.product_id !== 'string') {
      continue;
    }
    const orderNumber = orderNumberFor(row);
    if (!orderNumber) {
      continue;
    }
    const purchasedAt = typeof row.created_at === 'string' ? row.created_at : null;
    const existing = grouped.get(row.product_id);
    const order = {orderNumber, purchasedAt, status: typeof row.status === 'string' ? row.status : 'active'};
    if (existing) {
      existing.purchaseCount += 1;
      existing.active = existing.active || order.status === 'active';
      existing.orders.push(order);
      if (!existing.latestPurchaseAt || (purchasedAt && purchasedAt > existing.latestPurchaseAt)) {
        existing.latestPurchaseAt = purchasedAt;
        existing.latestOrderNumber = orderNumber;
      }
    } else {
      grouped.set(row.product_id, {
        productId: row.product_id,
        title: titleFor(row, locale),
        purchaseCount: 1,
        latestPurchaseAt: purchasedAt,
        active: order.status === 'active',
        latestOrderNumber: orderNumber,
        orders: [order]
      });
    }
  }

  return {
    status: 'success',
    patterns: [...grouped.values()].map((pattern) => ({
      ...pattern,
      orders: pattern.orders.sort((left, right) => (right.purchasedAt ?? '').localeCompare(left.purchasedAt ?? ''))
    }))
  };
}
