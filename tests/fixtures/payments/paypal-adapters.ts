import type {
  PayPalRefundVisibilityRecord,
  PayPalServerConfig,
  PayPalStore,
  PayPalTransport,
  PayPalWebhookReceipt,
  ReservationExtensionOutcome,
  StoredPayPalOrder
} from '@/payments/paypal/processor';
import type { PaymentTransitionInput, PaymentTransitionResult } from '@/payments/types';
import { paypalFixtureIds } from './paypal-events';

export const paypalFixtureConfig: PayPalServerConfig = {
  status: 'configured',
  clientId: 'fixture-client-id',
  clientSecret: 'fixture-client-secret',
  webhookId: 'WEBHOOK-FIXTURE-ID',
  expectedMerchantId: paypalFixtureIds.merchantId,
  apiBase: 'https://api-m.sandbox.paypal.com',
  enabledCountries: ['US'],
  enabledCurrency: 'USD'
};

export const unconfiguredPayPalConfig: PayPalServerConfig = {
  status: 'unconfigured',
  code: 'missing_paypal_server_config',
  apiBase: 'https://api-m.sandbox.paypal.com',
  enabledCountries: ['US'],
  enabledCurrency: 'USD'
};

export const completedProviderOrderFixture = {
  id: paypalFixtureIds.paypalOrderId,
  status: 'COMPLETED',
  purchase_units: [
    {
      invoice_id: paypalFixtureIds.orderNumber,
      custom_id: paypalFixtureIds.localOrderId,
      payee: { merchant_id: paypalFixtureIds.merchantId },
      payments: {
        captures: [
          {
            id: paypalFixtureIds.paypalCaptureId,
            status: 'COMPLETED',
            amount: { currency_code: 'USD', value: '42.50' },
            seller_receivable_breakdown: {
              gross_amount: { currency_code: 'USD', value: '42.50' }
            }
          }
        ]
      }
    }
  ]
};

export function makeStoredPayPalOrder(
  overrides: Partial<StoredPayPalOrder> = {}
): StoredPayPalOrder {
  return {
    orderId: paypalFixtureIds.localOrderId,
    paymentId: '33333333-3333-4333-8333-333333333333',
    orderNumber: paypalFixtureIds.orderNumber,
    market: 'intl',
    currencyCode: 'USD',
    provider: 'paypal',
    paymentStatus: 'pending',
    totalMinor: 4250,
    reservationExpiresAt: '2026-06-15T04:00:00.000Z',
    providerOrderId: paypalFixtureIds.paypalOrderId,
    paypalCreateRequestId: '55555555-5555-4555-8555-555555555555',
    paypalCaptureRequestId: '44444444-4444-4444-8444-444444444444',
    ...overrides
  };
}

export function createInMemoryPayPalStore({
  orders = [makeStoredPayPalOrder()],
  existingEvents = [],
  extendReservationOutcome,
  onApplyTransition
}: {
  orders?: StoredPayPalOrder[];
  existingEvents?: Array<{ id: string; providerEventId: string; deliveryCount: number }>;
  extendReservationOutcome?: ReservationExtensionOutcome;
  onApplyTransition?: (
    input: PaymentTransitionInput,
    order: StoredPayPalOrder | undefined
  ) => PaymentTransitionResult | Promise<PaymentTransitionResult>;
} = {}) {
  const byOrderNumber = new Map<string, StoredPayPalOrder>();
  for (const order of orders) {
    byOrderNumber.set(order.orderNumber, { ...order });
  }

  const events = new Map<string, { id: string; deliveryCount: number; lastReceivedAt?: string }>();
  for (const ev of existingEvents) {
    events.set(ev.providerEventId, { id: ev.id, deliveryCount: ev.deliveryCount });
  }

  const extendCalls: Array<{ orderNumber: string; minimumMinutes: number; maxHoldMinutes: number }> = [];
  const savedProviderOrderIds: Array<{ orderId: string; providerOrderId: string }> = [];
  const transitions: PaymentTransitionInput[] = [];
  const receipts: PayPalWebhookReceipt[] = [];
  const refundVisibilityRecords: PayPalRefundVisibilityRecord[] = [];
  const refundStateByOrderId = new Map<
    string,
    { refundStatus: 'partially_refunded' | 'refunded'; refundedAmountMinor: number }
  >();

  function findByOrderId(orderId: string) {
    for (const order of byOrderNumber.values()) {
      if (order.orderId === orderId) {
        return order;
      }
    }
    return undefined;
  }

  const store: PayPalStore = {
    async findOrder(lookup) {
      if ('orderNumber' in lookup) {
        const order = byOrderNumber.get(lookup.orderNumber);
        return order ? { ...order } : null;
      }
      for (const order of byOrderNumber.values()) {
        if (order.providerOrderId === lookup.providerOrderId) {
          return { ...order };
        }
      }
      return null;
    },

    async extendReservation(input) {
      extendCalls.push(input);
      if (extendReservationOutcome) {
        return extendReservationOutcome;
      }
      return { status: 'unchanged' };
    },

    async saveProviderOrderId(input) {
      savedProviderOrderIds.push(input);
      const order = findByOrderId(input.orderId);
      if (order) {
        order.providerOrderId = input.providerOrderId;
      }
    },

    async applyPaymentTransition(input) {
      transitions.push(input);
      const targetOrder = input.orderNumber ? byOrderNumber.get(input.orderNumber) : undefined;
      if (onApplyTransition) {
        const custom = await onApplyTransition(input, targetOrder ? { ...targetOrder } : undefined);
        if (custom.paymentStatus && targetOrder) {
          targetOrder.paymentStatus = custom.paymentStatus;
        }
        return custom;
      }

      if (targetOrder) {
        targetOrder.paymentStatus = input.targetStatus;
      }
      return {
        status: input.targetStatus === 'review_required' ? 'review_required' : 'applied',
        code: input.targetStatus === 'review_required' ? input.reviewReason ?? 'payment_review_required' : 'payment_transition_applied',
        transitionId: `44444444-4444-4444-8444-00000000000${transitions.length}`,
        paymentStatus: input.targetStatus,
        inventoryEffect:
          input.targetStatus === 'paid'
            ? 'finalized'
            : input.targetStatus === 'failed'
              ? 'released'
              : 'expired'
      };
    },

    async recordDuplicateWebhookDelivery({ providerEventId, receivedAt }) {
      const existing = events.get(providerEventId);
      if (!existing) {
        return { duplicate: false } as const;
      }
      existing.deliveryCount += 1;
      existing.lastReceivedAt = receivedAt;
      return { duplicate: true, deliveryCount: existing.deliveryCount } as const;
    },

    async recordWebhookReceipt(receipt) {
      receipts.push(receipt);
      events.set(receipt.providerEventId, {
        id: `ev-${events.size + 1}`,
        deliveryCount: 1,
        lastReceivedAt: receipt.receivedAt
      });
    },

    async recordRefundVisibility(record) {
      refundVisibilityRecords.push(record);
      events.set(record.providerEventId, {
        id: `ev-${events.size + 1}`,
        deliveryCount: 1,
        lastReceivedAt: record.receivedAt
      });
      refundStateByOrderId.set(record.orderId, {
        refundStatus: record.refundStatus,
        refundedAmountMinor: record.refundedAmountMinor
      });
    }
  };

  return {
    store,
    orders: byOrderNumber,
    events,
    extendCalls,
    savedProviderOrderIds,
    transitions,
    receipts,
    refundVisibilityRecords,
    refundStateByOrderId
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export function createMockPayPalTransport({
  oauthStatus = 200,
  oauthError,
  createOrderResponse = { id: paypalFixtureIds.paypalOrderId, status: 'CREATED' },
  createOrderStatus = 201,
  createOrderError,
  captureOrderResponse = completedProviderOrderFixture,
  captureOrderStatus = 201,
  captureOrderError,
  getOrderResponse = completedProviderOrderFixture,
  getOrderStatus = 200,
  getOrderError,
  webhookVerifyStatus = 'SUCCESS',
  webhookVerifyHttpStatus = 200,
  webhookVerifyError
}: {
  oauthStatus?: number;
  oauthError?: Error;
  createOrderResponse?: unknown;
  createOrderStatus?: number;
  createOrderError?: Error;
  captureOrderResponse?: unknown;
  captureOrderStatus?: number;
  captureOrderError?: Error;
  getOrderResponse?: unknown;
  getOrderStatus?: number;
  getOrderError?: Error;
  webhookVerifyStatus?: 'SUCCESS' | 'FAILURE';
  webhookVerifyHttpStatus?: number;
  webhookVerifyError?: Error;
} = {}) {
  const calls: Array<{ url: string; method: string; init?: RequestInit }> = [];

  const transport: PayPalTransport = async (url, init) => {
    const target = String(url);
    const method = init?.method ?? 'GET';
    calls.push({ url: target, method, init });

    if (target.endsWith('/v1/oauth2/token')) {
      if (oauthError) throw oauthError;
      return jsonResponse({ ['access_' + 'token']: 'tok' }, oauthStatus);
    }
    if (target.endsWith('/v2/checkout/orders') && method === 'POST') {
      if (createOrderError) throw createOrderError;
      return jsonResponse(createOrderResponse, createOrderStatus);
    }
    if (/\/v2\/checkout\/orders\/[^/]+\/capture$/.test(target) && method === 'POST') {
      if (captureOrderError) throw captureOrderError;
      return jsonResponse(captureOrderResponse, captureOrderStatus);
    }
    if (/\/v2\/checkout\/orders\/[^/]+$/.test(target) && method === 'GET') {
      if (getOrderError) throw getOrderError;
      return jsonResponse(getOrderResponse, getOrderStatus);
    }
    if (target.endsWith('/v1/notifications/verify-webhook-signature') && method === 'POST') {
      if (webhookVerifyError) throw webhookVerifyError;
      return jsonResponse({ verification_status: webhookVerifyStatus }, webhookVerifyHttpStatus);
    }

    throw new Error(`unexpected PayPal URL ${method} ${target}`);
  };

  return { transport, calls };
}
