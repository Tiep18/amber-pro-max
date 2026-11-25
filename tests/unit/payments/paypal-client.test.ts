import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createPayPalProcessor, type PayPalAdapters } from '@/payments/paypal/processor';
import { paypalCaptureResponse, paypalCreateResponse } from '@/payments/paypal/server';
import {
  completedProviderOrderFixture,
  createInMemoryPayPalStore,
  createMockPayPalTransport,
  makeStoredPayPalOrder,
  paypalFixtureConfig,
  unconfiguredPayPalConfig
} from '../../fixtures/payments/paypal-adapters';
import { paypalFixtureIds } from '../../fixtures/payments/paypal-events';

const OPEN_NOW = Date.parse('2026-06-15T03:00:00.000Z');
const EXPIRED_NOW = Date.parse('2026-06-15T05:00:00.000Z');

type StoreOptions = NonNullable<Parameters<typeof createInMemoryPayPalStore>[0]>;
type OperationalFailureRecorder = NonNullable<PayPalAdapters['recordOperationalFailure']>;
type EmailOutboxTrigger = NonNullable<PayPalAdapters['triggerEmailOutbox']>;

function createHarness({
  orders = [makeStoredPayPalOrder()],
  authorized = true,
  omitOrderAccess = false,
  config = paypalFixtureConfig,
  now = () => OPEN_NOW,
  transportOptions,
  extendReservationOutcome,
  onApplyTransition,
  recordOperationalFailure = vi.fn<OperationalFailureRecorder>(async () => ({
    status: 'recorded',
    errorId: '76000000-0000-4000-8000-000000000001'
  })),
  triggerEmailOutbox = vi.fn<EmailOutboxTrigger>(async () => ({
    status: 'processed',
    claimed: 1,
    sent: 1,
    retry: 0,
    failed: 0
  }))
}: {
  orders?: ReturnType<typeof makeStoredPayPalOrder>[];
  authorized?: boolean;
  omitOrderAccess?: boolean;
  config?: typeof paypalFixtureConfig | typeof unconfiguredPayPalConfig;
  now?: () => number;
  transportOptions?: Parameters<typeof createMockPayPalTransport>[0];
  extendReservationOutcome?: StoreOptions['extendReservationOutcome'];
  onApplyTransition?: StoreOptions['onApplyTransition'];
  recordOperationalFailure?: OperationalFailureRecorder;
  triggerEmailOutbox?: EmailOutboxTrigger;
} = {}) {
  const memory = createInMemoryPayPalStore({
    orders,
    extendReservationOutcome,
    onApplyTransition
  });
  const mockTransport = createMockPayPalTransport(transportOptions);
  const authorizeOrder = vi.fn(async () =>
    authorized ? ({ status: 'authorized' } as const) : ({ status: 'not_found' } as const)
  );
  const processor = createPayPalProcessor({
    config,
    store: memory.store,
    ...(omitOrderAccess ? {} : { orderAccess: { authorizeOrder } }),
    transport: mockTransport.transport,
    triggerEmailOutbox,
    recordOperationalFailure,
    log: () => {},
    now
  });

  return {
    processor,
    memory,
    transportCalls: mockTransport.calls,
    authorizeOrder,
    recordOperationalFailure,
    triggerEmailOutbox
  };
}

describe('PayPal payment module across its interface', () => {
  test('uses deterministic test fixture identifiers without live credentials', () => {
    expect(paypalFixtureIds.requestId).toContain(paypalFixtureIds.orderNumber);
    expect(JSON.stringify(paypalFixtureIds)).not.toMatch(
      /client_secret|access_token|live_|production|password/i
    );
  });

  test('create ignores browser-submitted amounts, extends handoff hold, uses local USD minor total, and sends stable request ID', async () => {
    const { processor, memory, transportCalls, authorizeOrder } = createHarness({
      orders: [makeStoredPayPalOrder({ totalMinor: 4200, providerOrderId: null })],
      extendReservationOutcome: {
        status: 'extended',
        reservationExpiresAt: '2026-06-15T04:10:00.000Z'
      }
    });

    const outcome = await processor.createPayPalOrder({
      orderNumber: paypalFixtureIds.orderNumber,
      amountMinor: 1,
      currencyCode: 'VND',
      merchantId: 'MERCHANT-MISMATCH'
    });

    expect(outcome).toEqual({ status: 'awaiting', paypalOrderId: paypalFixtureIds.paypalOrderId });
    expect(authorizeOrder).toHaveBeenCalledWith(paypalFixtureIds.orderNumber);
    expect(memory.extendCalls).toHaveLength(1);
    expect(memory.savedProviderOrderIds).toEqual([
      { orderId: paypalFixtureIds.localOrderId, providerOrderId: paypalFixtureIds.paypalOrderId }
    ]);

    const createCall = transportCalls.find(
      (call) => call.method === 'POST' && call.url.endsWith('/v2/checkout/orders')
    );
    expect(createCall).toBeDefined();
    expect(createCall?.init?.headers).toMatchObject({
      'PayPal-Request-Id': '55555555-5555-4555-8555-555555555555',
      Prefer: 'return=representation'
    });
    expect(JSON.parse(String(createCall?.init?.body))).toMatchObject({
      intent: 'CAPTURE',
      purchase_units: [
        {
          invoice_id: paypalFixtureIds.orderNumber,
          custom_id: paypalFixtureIds.localOrderId,
          payee: { merchant_id: paypalFixtureIds.merchantId },
          amount: { currency_code: 'USD', value: '42.00' }
        }
      ]
    });
  });

  test('create reuses existing providerOrderId via GET when PayPal returns it', async () => {
    const { processor, memory, transportCalls } = createHarness({
      orders: [makeStoredPayPalOrder({ providerOrderId: paypalFixtureIds.paypalOrderId })]
    });

    const outcome = await processor.createPayPalOrder({
      orderNumber: paypalFixtureIds.orderNumber
    });

    expect(outcome).toEqual({ status: 'awaiting', paypalOrderId: paypalFixtureIds.paypalOrderId });
    expect(
      transportCalls.some(
        (call) =>
          call.method === 'GET' &&
          call.url.endsWith(`/v2/checkout/orders/${paypalFixtureIds.paypalOrderId}`)
      )
    ).toBe(true);
    expect(
      transportCalls.some(
        (call) => call.method === 'POST' && call.url.endsWith('/v2/checkout/orders')
      )
    ).toBe(false);
    expect(memory.savedProviderOrderIds).toHaveLength(0);
  });

  test('create fails closed without orderAccess and rejects unauthorized or ineligible VND/VietQR orders before PayPal HTTP I/O', async () => {
    const unauthorized = createHarness({
      orders: [makeStoredPayPalOrder({ providerOrderId: null })],
      authorized: false
    });
    await expect(
      unauthorized.processor.createPayPalOrder({ orderNumber: paypalFixtureIds.orderNumber })
    ).resolves.toEqual({ status: 'not_found' });
    expect(unauthorized.transportCalls).toHaveLength(0);

    const noOrderAccess = createHarness({
      orders: [makeStoredPayPalOrder({ providerOrderId: null })],
      omitOrderAccess: true
    });
    await expect(
      noOrderAccess.processor.createPayPalOrder({ orderNumber: paypalFixtureIds.orderNumber })
    ).resolves.toEqual({ status: 'not_found' });
    expect(noOrderAccess.transportCalls).toHaveLength(0);

    const ineligible = createHarness({
      orders: [
        makeStoredPayPalOrder({
          market: 'vn',
          currencyCode: 'VND',
          provider: 'vietqr',
          providerOrderId: null
        })
      ]
    });
    await expect(
      ineligible.processor.createPayPalOrder({ orderNumber: paypalFixtureIds.orderNumber })
    ).resolves.toEqual({ status: 'invalid', code: 'paypal_order_not_eligible' });
    expect(ineligible.transportCalls).toHaveLength(0);
  });

  test('create handles OAuth transport errors and keeps failure responses stable when operational recording fails', async () => {
    const throwingRecorder = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const oauthFailure = createHarness({
      orders: [makeStoredPayPalOrder({ providerOrderId: null })],
      transportOptions: { oauthError: new Error('dns failure') },
      recordOperationalFailure: throwingRecorder
    });

    const outcome = await oauthFailure.processor.createPayPalOrder({
      orderNumber: paypalFixtureIds.orderNumber
    });

    expect(outcome).toEqual({ status: 'error', code: 'paypal_provider_error' });
    expect(paypalCreateResponse(outcome).status).toBe(502);
    expect(throwingRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'paypal_create',
        severity: 'error',
        errorCode: 'paypal_provider_error',
        summary: 'PayPal order create failed',
        facts: expect.objectContaining({
          orderId: paypalFixtureIds.localOrderId,
          orderNumber: paypalFixtureIds.orderNumber,
          provider: 'paypal'
        })
      })
    );

    const postTimeout = createHarness({
      orders: [makeStoredPayPalOrder({ providerOrderId: null })],
      transportOptions: { createOrderError: new Error('ECONNRESET') }
    });
    await expect(
      postTimeout.processor.createPayPalOrder({ orderNumber: paypalFixtureIds.orderNumber })
    ).resolves.toEqual({ status: 'verifying', code: 'paypal_provider_uncertain' });
  });

  test('completed capture verifies order, merchant, capture metadata, delegates paid to applyPaymentTransition, and triggers email outbox', async () => {
    const captureMetaProviderOrder = {
      id: paypalFixtureIds.paypalOrderId,
      status: 'COMPLETED',
      purchase_units: [
        {
          reference_id: paypalFixtureIds.localOrderId,
          payments: {
            captures: [
              {
                id: paypalFixtureIds.paypalCaptureId,
                status: 'COMPLETED',
                invoice_id: paypalFixtureIds.orderNumber,
                custom_id: paypalFixtureIds.localOrderId,
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
    const { processor, memory, transportCalls, authorizeOrder, triggerEmailOutbox } =
      createHarness({
        transportOptions: { captureOrderResponse: captureMetaProviderOrder }
      });

    const outcome = await processor.capturePayPalOrder({
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });

    expect(outcome).toEqual({ status: 'paid', paymentStatus: 'paid' });
    expect(authorizeOrder).toHaveBeenCalledWith(paypalFixtureIds.orderNumber);
    expect(
      transportCalls.some(
        (call) =>
          call.method === 'POST' &&
          call.url.endsWith(`/v2/checkout/orders/${paypalFixtureIds.paypalOrderId}/capture`) &&
          (call.init?.headers as Record<string, string>)['PayPal-Request-Id'] ===
            '44444444-4444-4444-8444-444444444444'
      )
    ).toBe(true);
    expect(memory.transitions).toContainEqual(
      expect.objectContaining({
        source: 'paypal_recheck',
        targetStatus: 'paid',
        orderNumber: paypalFixtureIds.orderNumber,
        amountMinor: 4250,
        currencyCode: 'USD',
        sanitizedFacts: expect.objectContaining({
          providerOrderId: paypalFixtureIds.paypalOrderId,
          providerCaptureId: paypalFixtureIds.paypalCaptureId,
          merchantId: paypalFixtureIds.merchantId,
          merchantVerificationSource: 'server_payee_contract'
        })
      })
    );
    expect(triggerEmailOutbox).toHaveBeenCalledWith({ reason: 'paypal_capture_paid' });
  });

  test('capture reconciles via GET when POST capture returns non-2xx or throws, and returns verifying when both fail', async () => {
    const recoveredViaGet = createHarness({
      transportOptions: {
        captureOrderError: new Error('capture connection dropped'),
        getOrderResponse: completedProviderOrderFixture
      }
    });
    await expect(
      recoveredViaGet.processor.capturePayPalOrder({
        paypalOrderId: paypalFixtureIds.paypalOrderId
      })
    ).resolves.toEqual({ status: 'paid', paymentStatus: 'paid' });
    expect(
      recoveredViaGet.transportCalls.some(
        (call) =>
          call.method === 'GET' &&
          call.url.endsWith(`/v2/checkout/orders/${paypalFixtureIds.paypalOrderId}`)
      )
    ).toBe(true);
    expect(recoveredViaGet.triggerEmailOutbox).toHaveBeenCalledWith({
      reason: 'paypal_capture_paid'
    });

    const bothDropped = createHarness({
      transportOptions: {
        captureOrderStatus: 422,
        getOrderError: new Error('status lookup dropped')
      }
    });
    const uncertainOutcome = await bothDropped.processor.capturePayPalOrder({
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });
    expect(uncertainOutcome).toEqual({
      status: 'verifying',
      code: 'paypal_capture_uncertain',
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });
    expect(paypalCaptureResponse(uncertainOutcome).status).toBe(202);
    expect(bothDropped.memory.transitions).toHaveLength(0);
    expect(bothDropped.triggerEmailOutbox).not.toHaveBeenCalled();
  });

  test('capture rejects merchant/amount mismatch via review_required transition and records operational failure safely', async () => {
    const mismatchOrder = {
      id: paypalFixtureIds.paypalOrderId,
      status: 'COMPLETED',
      purchase_units: [
        {
          invoice_id: paypalFixtureIds.orderNumber,
          custom_id: paypalFixtureIds.localOrderId,
          payee: { merchant_id: 'MERCHANT-MISMATCH' },
          payments: {
            captures: [
              {
                id: paypalFixtureIds.paypalCaptureId,
                status: 'COMPLETED',
                amount: { currency_code: 'USD', value: '42.50' }
              }
            ]
          }
        }
      ]
    };
    const throwingRecorder = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const { processor, memory } = createHarness({
      transportOptions: { captureOrderResponse: mismatchOrder },
      recordOperationalFailure: throwingRecorder
    });

    const outcome = await processor.capturePayPalOrder({
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });

    expect(outcome).toEqual({
      status: 'reconciliation_required',
      code: 'paypal_merchant_mismatch'
    });
    expect(paypalCaptureResponse(outcome).status).toBe(202);
    expect(memory.transitions).toContainEqual(
      expect.objectContaining({
        source: 'paypal_recheck',
        targetStatus: 'review_required',
        orderNumber: paypalFixtureIds.orderNumber,
        releaseReason: 'paypal_reconciliation_mismatch',
        reviewReason: 'paypal_reconciliation_mismatch',
        sanitizedFacts: expect.objectContaining({
          reconciliationCode: 'paypal_merchant_mismatch'
        })
      })
    );
    expect(throwingRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'paypal_capture',
        severity: 'warning',
        errorCode: 'paypal_merchant_mismatch',
        summary: 'PayPal capture reconciliation rejected'
      })
    );
  });

  test('capture keeps incomplete provider facts verifying without releasing the hold', async () => {
    const { processor, memory } = createHarness({
      transportOptions: {
        captureOrderResponse: {
          id: paypalFixtureIds.paypalOrderId,
          status: 'APPROVED',
          purchase_units: [
            {
              invoice_id: paypalFixtureIds.orderNumber,
              custom_id: paypalFixtureIds.localOrderId,
              payee: { merchant_id: paypalFixtureIds.merchantId },
              payments: { captures: [] }
            }
          ]
        }
      }
    });

    const outcome = await processor.capturePayPalOrder({
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });

    expect(outcome).toEqual({ status: 'verifying', code: 'paypal_capture_missing' });
    expect(paypalCaptureResponse(outcome).status).toBe(202);
    expect(memory.transitions).toHaveLength(0);
  });

  test('expired order capture authorizes caller, never POSTs capture, and runs GET-only recovery (late settle, expired, or conservative verifying)', async () => {
    const unauthorizedExpired = createHarness({
      orders: [makeStoredPayPalOrder({ reservationExpiresAt: '2026-06-15T04:00:00.000Z' })],
      authorized: false,
      now: () => EXPIRED_NOW
    });
    await expect(
      unauthorizedExpired.processor.capturePayPalOrder({
        paypalOrderId: paypalFixtureIds.paypalOrderId
      })
    ).resolves.toEqual({ status: 'not_found' });
    expect(unauthorizedExpired.transportCalls).toHaveLength(0);

    const lateCaptured = createHarness({
      orders: [makeStoredPayPalOrder({ reservationExpiresAt: '2026-06-15T04:00:00.000Z' })],
      now: () => EXPIRED_NOW,
      transportOptions: { getOrderResponse: completedProviderOrderFixture }
    });
    const settled = await lateCaptured.processor.capturePayPalOrder({
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });
    expect(settled).toEqual({ status: 'paid', paymentStatus: 'paid' });
    expect(lateCaptured.transportCalls.some((c) => c.url.endsWith('/capture'))).toBe(false);
    expect(lateCaptured.memory.transitions).toContainEqual(
      expect.objectContaining({
        source: 'paypal_recheck',
        targetStatus: 'paid',
        reviewReason: 'late_payment_detected'
      })
    );
    expect(lateCaptured.triggerEmailOutbox).toHaveBeenCalledWith({
      reason: 'paypal_capture_paid'
    });

    const uncapturedExpired = createHarness({
      orders: [
        makeStoredPayPalOrder({
          paymentStatus: 'expired',
          reservationExpiresAt: '2026-06-15T04:00:00.000Z'
        })
      ],
      now: () => EXPIRED_NOW,
      transportOptions: {
        getOrderResponse: {
          id: paypalFixtureIds.paypalOrderId,
          status: 'APPROVED',
          purchase_units: [
            {
              invoice_id: paypalFixtureIds.orderNumber,
              custom_id: paypalFixtureIds.localOrderId,
              payments: { captures: [] }
            }
          ]
        }
      }
    });
    const expiredOutcome = await uncapturedExpired.processor.capturePayPalOrder({
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });
    expect(expiredOutcome).toEqual({ status: 'expired', code: 'paypal_order_expired' });
    expect(paypalCaptureResponse(expiredOutcome).status).toBe(409);
    expect(uncapturedExpired.transportCalls.some((c) => c.url.endsWith('/capture'))).toBe(false);
    expect(uncapturedExpired.memory.transitions).toHaveLength(0);

    const uncertainExpired = createHarness({
      orders: [makeStoredPayPalOrder({ reservationExpiresAt: '2026-06-15T04:00:00.000Z' })],
      now: () => EXPIRED_NOW,
      transportOptions: { getOrderError: new Error('network timeout') }
    });
    const verifyingExpired = await uncertainExpired.processor.capturePayPalOrder({
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });
    expect(verifyingExpired).toEqual({
      status: 'verifying',
      code: 'paypal_provider_uncertain',
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });
    expect(paypalCaptureResponse(verifyingExpired).status).toBe(202);
  });

  test('capture short-circuits already-paid, review_required, and closed terminal orders before any remote POST capture', async () => {
    const alreadyPaid = createHarness({
      orders: [makeStoredPayPalOrder({ paymentStatus: 'paid' })]
    });
    await expect(
      alreadyPaid.processor.capturePayPalOrder({
        paypalOrderId: paypalFixtureIds.paypalOrderId
      })
    ).resolves.toEqual({ status: 'paid', paymentStatus: 'paid' });
    expect(alreadyPaid.transportCalls).toHaveLength(0);

    const lockedForReview = createHarness({
      orders: [makeStoredPayPalOrder({ paymentStatus: 'review_required' })]
    });
    await expect(
      lockedForReview.processor.capturePayPalOrder({
        paypalOrderId: paypalFixtureIds.paypalOrderId
      })
    ).resolves.toEqual({ status: 'review_required', code: 'paypal_order_review_required' });
    expect(lockedForReview.transportCalls).toHaveLength(0);

    for (const closedStatus of ['cancelled', 'failed', 'rejected', 'refunded'] as const) {
      const closed = createHarness({
        orders: [makeStoredPayPalOrder({ paymentStatus: closedStatus })]
      });
      await expect(
        closed.processor.capturePayPalOrder({
          paypalOrderId: paypalFixtureIds.paypalOrderId
        })
      ).resolves.toEqual({ status: 'invalid', code: 'paypal_order_not_eligible' });
      expect(closed.transportCalls).toHaveLength(0);
    }
  });

  test('full create -> capture scenario works across one processor interface and handles unconfigured PayPal cleanly', async () => {
    const lifecycle = createHarness({
      orders: [makeStoredPayPalOrder({ providerOrderId: null })]
    });
    await expect(
      lifecycle.processor.createPayPalOrder({ orderNumber: paypalFixtureIds.orderNumber })
    ).resolves.toEqual({ status: 'awaiting', paypalOrderId: paypalFixtureIds.paypalOrderId });
    await expect(
      lifecycle.processor.capturePayPalOrder({ paypalOrderId: paypalFixtureIds.paypalOrderId })
    ).resolves.toEqual({ status: 'paid', paymentStatus: 'paid' });
    expect(lifecycle.memory.orders.get(paypalFixtureIds.orderNumber)?.paymentStatus).toBe('paid');

    const unconfigured = createHarness({
      orders: [makeStoredPayPalOrder({ providerOrderId: null })],
      config: unconfiguredPayPalConfig
    });
    const unconfiguredOutcome = await unconfigured.processor.createPayPalOrder({
      orderNumber: paypalFixtureIds.orderNumber
    });
    expect(unconfiguredOutcome).toEqual({
      status: 'unconfigured',
      code: 'missing_paypal_server_config'
    });
    expect(paypalCreateResponse(unconfiguredOutcome).status).toBe(503);
  });
});
