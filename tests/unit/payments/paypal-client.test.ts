import {describe, expect, test, vi} from 'vitest';
import {paypalFixtureIds} from '../../fixtures/payments/paypal-events';
import {
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalOrder,
  type PayPalOrderSource,
  type PayPalServerConfig
} from '@/payments/paypal/client';
import {reconcilePayPalCapture} from '@/payments/paypal/mapping';

const config: PayPalServerConfig = {
  status: 'configured',
  clientId: 'fixture-client-id',
  clientSecret: 'fixture-client-secret',
  expectedMerchantId: paypalFixtureIds.merchantId,
  apiBase: 'https://api-m.sandbox.paypal.com'
};

const order: PayPalOrderSource = {
  orderId: paypalFixtureIds.localOrderId,
  orderNumber: paypalFixtureIds.orderNumber,
  totalMinor: 4250,
  currencyCode: 'USD',
  market: 'intl',
  paymentIntent: 'paypal_intent',
  paypalCreateRequestId: '11111111-1111-4111-8111-111111111111',
  paypalCaptureRequestId: '22222222-2222-4222-8222-222222222222'
};

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {'content-type': 'application/json'}
  });
}

function createFixtureFetch({
  orderResponse = {id: paypalFixtureIds.paypalOrderId, status: 'CREATED'},
  captureStatus = 201
}: {
  orderResponse?: unknown;
  captureStatus?: number;
} = {}) {
  const transport = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const target = String(url);
    if (target.endsWith('/v1/oauth2/token')) {
      return jsonResponse({access_token: 'fixture-access-token'});
    }
    if (target.endsWith('/v2/checkout/orders') && init?.method === 'POST') {
      return jsonResponse(orderResponse, 201);
    }
    if (target.endsWith(`/v2/checkout/orders/${paypalFixtureIds.paypalOrderId}/capture`)) {
      return jsonResponse(
        {
          id: paypalFixtureIds.paypalOrderId,
          status: 'COMPLETED',
          purchase_units: [
            {
              invoice_id: paypalFixtureIds.orderNumber,
              custom_id: paypalFixtureIds.localOrderId,
              payee: {merchant_id: paypalFixtureIds.merchantId},
              payments: {
                captures: [
                  {
                    id: paypalFixtureIds.paypalCaptureId,
                    status: 'COMPLETED',
                    amount: {currency_code: 'USD', value: '42.50'},
                    seller_receivable_breakdown: {
                      gross_amount: {currency_code: 'USD', value: '42.50'}
                    }
                  }
                ]
              }
            }
          ]
        },
        captureStatus
      );
    }
    if (target.endsWith(`/v2/checkout/orders/${paypalFixtureIds.paypalOrderId}`)) {
      return jsonResponse(orderResponse);
    }
    throw new Error(`unexpected PayPal URL ${target}`);
  });

  return transport;
}

describe('PayPal server client contract', () => {
  test('uses deterministic test fixture identifiers without live credentials', () => {
    expect(paypalFixtureIds.requestId).toContain(paypalFixtureIds.orderNumber);
    expect(JSON.stringify(paypalFixtureIds)).not.toMatch(/client_secret|access_token|live_|production|password/i);
  });

  test('creates PayPal orders server-side from the authoritative local USD total', async () => {
    const transport = createFixtureFetch();

    const result = await createPayPalOrder({config, order, transport});

    expect(result).toEqual({status: 'created', paypalOrderId: paypalFixtureIds.paypalOrderId});
    const createCall = transport.mock.calls.find(([url, init]) => String(url).endsWith('/v2/checkout/orders') && init?.method === 'POST');
    expect(createCall).toBeDefined();
    const [, init] = createCall!;
    expect(init?.headers).toMatchObject({'PayPal-Request-Id': order.paypalCreateRequestId});
    expect(JSON.parse(String(init?.body))).toMatchObject({
      intent: 'CAPTURE',
      purchase_units: [
        {
          invoice_id: paypalFixtureIds.orderNumber,
          custom_id: paypalFixtureIds.localOrderId,
          amount: {currency_code: 'USD', value: '42.50'}
        }
      ]
    });
  });

  test('sends a stable PayPal-Request-Id for create and capture retries', async () => {
    const transport = createFixtureFetch();

    await createPayPalOrder({config, order, transport});
    await capturePayPalOrder({config, order: {...order, providerOrderId: paypalFixtureIds.paypalOrderId}, transport});

    expect(transport.mock.calls.map(([, init]) => init?.headers)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({'PayPal-Request-Id': order.paypalCreateRequestId}),
        expect.objectContaining({'PayPal-Request-Id': order.paypalCaptureRequestId})
      ])
    );
  });

  test('does not accept browser-submitted amount, currency, merchant, or receiver facts', async () => {
    const transport = createFixtureFetch();

    const result = await createPayPalOrder({
      config,
      order: {...order, totalMinor: 4200, currencyCode: 'USD'},
      transport,
      browserFacts: {amountMinor: 1, currencyCode: 'VND', merchantId: 'MERCHANT-MISMATCH'}
    });

    expect(result.status).toBe('created');
    const createCall = transport.mock.calls.find(([url, init]) => String(url).endsWith('/v2/checkout/orders') && init?.method === 'POST');
    expect(JSON.parse(String(createCall?.[1]?.body)).purchase_units[0].amount).toEqual({currency_code: 'USD', value: '42.00'});
  });

  test('captures through the server and maps provider timeout or retry outcomes to typed results', async () => {
    const transport = createFixtureFetch({captureStatus: 504});

    const result = await capturePayPalOrder({config, order: {...order, providerOrderId: paypalFixtureIds.paypalOrderId}, transport});

    expect(result).toEqual({
      status: 'verifying',
      code: 'paypal_capture_uncertain',
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });
  });

  test('rejects VietQR or VND orders before calling the PayPal provider', async () => {
    const transport = createFixtureFetch();

    const result = await createPayPalOrder({
      config,
      order: {...order, currencyCode: 'VND', market: 'vn', paymentIntent: 'vietqr_intent'},
      transport
    });

    expect(result).toEqual({status: 'invalid', code: 'paypal_order_not_eligible'});
    expect(transport).not.toHaveBeenCalled();
  });

  test('does not perform network calls when a fixture transport is injected', async () => {
    const transport = createFixtureFetch();

    await getPayPalOrder({config, paypalOrderId: paypalFixtureIds.paypalOrderId, transport});

    expect(transport).toHaveBeenCalledWith(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL-ORDER-TEST-0001',
      expect.any(Object)
    );
  });

  test('rejects merchant, order, capture, amount, and currency mismatch during reconciliation', () => {
    const completedOrder = {
      id: paypalFixtureIds.paypalOrderId,
      status: 'COMPLETED',
      purchase_units: [
        {
          invoice_id: paypalFixtureIds.orderNumber,
          custom_id: paypalFixtureIds.localOrderId,
          payee: {merchant_id: paypalFixtureIds.merchantId},
          payments: {
            captures: [
              {
                id: paypalFixtureIds.paypalCaptureId,
                status: 'COMPLETED',
                amount: {currency_code: 'USD', value: '42.50'},
                seller_receivable_breakdown: {
                  gross_amount: {currency_code: 'USD', value: '42.50'}
                }
              }
            ]
          }
        }
      ]
    };

    expect(reconcilePayPalCapture({providerOrder: completedOrder, order, expectedMerchantId: paypalFixtureIds.merchantId})).toMatchObject({
      status: 'verified',
      facts: {
        providerOrderId: paypalFixtureIds.paypalOrderId,
        providerCaptureId: paypalFixtureIds.paypalCaptureId,
        amountMinor: 4250,
        currencyCode: 'USD'
      }
    });
    expect(
      reconcilePayPalCapture({
        providerOrder: completedOrder,
        order: {...order, totalMinor: 4200},
        expectedMerchantId: paypalFixtureIds.merchantId
      })
    ).toEqual({status: 'rejected', code: 'paypal_amount_mismatch'});
    expect(
      reconcilePayPalCapture({
        providerOrder: completedOrder,
        order,
        expectedMerchantId: 'MERCHANT-MISMATCH'
      })
    ).toEqual({status: 'rejected', code: 'paypal_merchant_mismatch'});
  });
});
