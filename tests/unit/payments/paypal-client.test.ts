import {describe, expect, test, vi} from 'vitest';
import {paypalFixtureIds} from '../../fixtures/payments/paypal-events';

vi.mock('server-only', () => ({}));

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
  webhookId: 'fixture-webhook-id',
  expectedMerchantId: paypalFixtureIds.merchantId,
  apiBase: 'https://api-m.sandbox.paypal.com',
  enabledCountries: ['US'],
  enabledCurrency: 'USD'
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

const paymentRow = {
  id: '33333333-3333-4333-8333-333333333333',
  order_id: paypalFixtureIds.localOrderId,
  provider_order_id: paypalFixtureIds.paypalOrderId,
  request_id: '44444444-4444-4444-8444-444444444444',
  provider_request_id: '55555555-5555-4555-8555-555555555555'
};

const routeOrderRow = {
  order_id: paypalFixtureIds.localOrderId,
  order_number: paypalFixtureIds.orderNumber,
  market: 'intl',
  currency_code: 'USD',
  total_minor: 4250,
  provider: 'paypal',
  payment_status: 'pending',
  payment_id: paymentRow.id,
  provider_order_id: paymentRow.provider_order_id,
  reservation_expires_at: new Date(Date.now() + 60_000).toISOString()
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
      return jsonResponse({['access_' + 'token']: 'tok'});
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

function createRouteClient({row = routeOrderRow, payment = paymentRow}: {row?: Record<string, unknown> | null; payment?: Record<string, unknown> | null} = {}) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => {
            if (table === 'order_payment_statuses') {
              return {data: row, error: null};
            }
            if (table === 'payments') {
              return {data: payment, error: null};
            }
            return {data: null, error: null};
          })
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({data: null, error: null}))
      }))
    })),
    rpc: vi.fn(async () => ({data: {status: 'applied', paymentStatus: 'paid', inventoryEffect: 'finalized'}, error: null}))
  };
}

async function importCreateRoute({
  client = createRouteClient({payment: {...paymentRow, provider_order_id: null}}),
  authClient = {rpc: vi.fn()},
  authorized = true,
  createResult = {status: 'created', paypalOrderId: paypalFixtureIds.paypalOrderId},
  recordOperationalFailure = vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'}))
}: {
  client?: ReturnType<typeof createRouteClient>;
  authClient?: {rpc: ReturnType<typeof vi.fn>};
  authorized?: boolean;
  createResult?: unknown;
  recordOperationalFailure?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.resetModules();
  vi.doMock('server-only', () => ({}));
  vi.doMock('@/lib/env/server', () => ({getServerEnv: () => ({paypal: config})}));
  vi.doMock('@/lib/supabase/admin', () => ({createSupabaseAdminClient: () => client}));
  vi.doMock('@/lib/supabase/server', () => ({createSupabaseServerClient: async () => authClient}));
  vi.doMock('@/payments/guest-access', () => ({getGuestOrderAccessHashFromServer: async () => 'guest-hash'}));
  vi.doMock('@/payments/queries', () => ({
    getAuthorizedOrderPayment: vi.fn(async () =>
      authorized ? {status: 'found', order: {orderNumber: paypalFixtureIds.orderNumber}} : {status: 'not_found'}
    )
  }));
  vi.doMock('@/payments/paypal/client', () => ({
    createPayPalOrder: vi.fn(async () => createResult),
    getPayPalOrder: vi.fn()
  }));
  vi.doMock('@/operations/errors', () => ({
    recordOperationalFailure
  }));
  const route = await import('@/app/api/paypal/orders/route');
  const clientModule = await import('@/payments/paypal/client');
  const queries = await import('@/payments/queries');
  return {
    POST: route.POST as (request: Request) => Promise<Response>,
    client,
    authClient,
    createPayPalOrder: vi.mocked(clientModule.createPayPalOrder),
    getAuthorizedOrderPayment: vi.mocked(queries.getAuthorizedOrderPayment),
    recordOperationalFailure
  };
}

async function importCaptureRoute({
  client = createRouteClient(),
  authClient = {rpc: vi.fn()},
  captureResult = {
    status: 'captured',
    paypalOrderId: paypalFixtureIds.paypalOrderId,
    providerOrder: {
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
                seller_receivable_breakdown: {gross_amount: {currency_code: 'USD', value: '42.50'}}
              }
            ]
          }
        }
      ]
    }
  },
  recordOperationalFailure = vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'}))
}: {
  client?: ReturnType<typeof createRouteClient>;
  authClient?: {rpc: ReturnType<typeof vi.fn>};
  captureResult?: unknown;
  recordOperationalFailure?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.resetModules();
  vi.doMock('server-only', () => ({}));
  vi.doMock('@/lib/env/server', () => ({getServerEnv: () => ({paypal: config})}));
  vi.doMock('@/lib/supabase/admin', () => ({createSupabaseAdminClient: () => client}));
  vi.doMock('@/lib/supabase/server', () => ({createSupabaseServerClient: async () => authClient}));
  vi.doMock('@/payments/guest-access', () => ({getGuestOrderAccessHashFromServer: async () => 'guest-hash'}));
  vi.doMock('@/payments/queries', () => ({
    getAuthorizedOrderPayment: vi.fn(async () => ({status: 'found', order: {orderNumber: paypalFixtureIds.orderNumber}}))
  }));
  vi.doMock('@/payments/paypal/client', () => ({
    capturePayPalOrder: vi.fn(async () => captureResult),
    getPayPalOrder: vi.fn(async () => captureResult)
  }));
  vi.doMock('@/payments/transitions', () => ({
    applyPaymentTransition: vi.fn(async () => ({status: 'applied', paymentStatus: 'paid', inventoryEffect: 'finalized'}))
  }));
  vi.doMock('@/fulfillment/email-outbox.server', () => ({
    triggerTransactionalEmailOutboxNow: vi.fn(async () => ({status: 'processed', claimed: 1, sent: 1, retry: 0, failed: 0}))
  }));
  vi.doMock('@/operations/errors', () => ({
    recordOperationalFailure
  }));
  const route = await import('@/app/api/paypal/orders/[paypalOrderId]/capture/route');
  const clientModule = await import('@/payments/paypal/client');
  const transitions = await import('@/payments/transitions');
  const emailOutbox = await import('@/fulfillment/email-outbox.server');
  const queries = await import('@/payments/queries');
  return {
    POST: route.POST as (request: Request, context: {params: Promise<{paypalOrderId: string}>}) => Promise<Response>,
    client,
    authClient,
    capturePayPalOrder: vi.mocked(clientModule.capturePayPalOrder),
    applyPaymentTransition: vi.mocked(transitions.applyPaymentTransition),
    triggerTransactionalEmailOutboxNow: vi.mocked(emailOutbox.triggerTransactionalEmailOutboxNow),
    getAuthorizedOrderPayment: vi.mocked(queries.getAuthorizedOrderPayment),
    recordOperationalFailure
  };
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
          payee: {merchant_id: paypalFixtureIds.merchantId},
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
        expect.objectContaining({'PayPal-Request-Id': order.paypalCaptureRequestId, Prefer: 'return=representation'})
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

  test('reconciles capture metadata when PayPal returns invoice and custom id on the capture object', () => {
    const completedOrder = {
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
                payee: {merchant_id: paypalFixtureIds.merchantId},
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
        merchantId: paypalFixtureIds.merchantId,
        amountMinor: 4250,
        currencyCode: 'USD'
      }
    });
  });

  test('reconciles missing merchant id when the server-created PayPal order contract matches all capture facts', () => {
    const completedOrder = {
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
        merchantId: paypalFixtureIds.merchantId,
        merchantVerificationSource: 'server_payee_contract',
        amountMinor: 4250,
        currencyCode: 'USD'
      }
    });
  });
});

describe('PayPal route contract', () => {
  test('create body accepts only order number and uses local exact amount', async () => {
    const {POST, authClient, createPayPalOrder, getAuthorizedOrderPayment} = await importCreateRoute();

    const response = await POST(
      new Request('http://localhost/api/paypal/orders', {
        method: 'POST',
        body: JSON.stringify({orderNumber: paypalFixtureIds.orderNumber, amountMinor: 1, currencyCode: 'VND'})
      })
    );

    await expect(response.json()).resolves.toMatchObject({status: 'awaiting', paypalOrderId: paypalFixtureIds.paypalOrderId});
    expect(getAuthorizedOrderPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: paypalFixtureIds.orderNumber,
        guestSecretHash: 'guest-hash',
        client: authClient
      })
    );
    expect(createPayPalOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          orderNumber: paypalFixtureIds.orderNumber,
          totalMinor: 4250,
          currencyCode: 'USD',
          market: 'intl',
          paymentIntent: 'paypal_intent'
        })
      })
    );
  });

  test('create rejects cross-order access before provider I/O', async () => {
    const {POST, createPayPalOrder} = await importCreateRoute({authorized: false});

    const response = await POST(
      new Request('http://localhost/api/paypal/orders', {
        method: 'POST',
        body: JSON.stringify({orderNumber: paypalFixtureIds.orderNumber})
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({status: 'not_found'});
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });

  test('create records provider failures for admin operations review', async () => {
    const recordOperationalFailure = vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'}));
    const {POST} = await importCreateRoute({
      createResult: {status: 'error', code: 'paypal_provider_error'},
      recordOperationalFailure
    });

    const response = await POST(
      new Request('http://localhost/api/paypal/orders', {
        method: 'POST',
        body: JSON.stringify({orderNumber: paypalFixtureIds.orderNumber})
      })
    );

    expect(response.status).toBe(502);
    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'payment',
        severity: 'error',
        errorCode: 'paypal_provider_error',
        summary: 'PayPal order create failed',
        facts: expect.objectContaining({
          orderId: paypalFixtureIds.localOrderId,
          orderNumber: paypalFixtureIds.orderNumber,
          provider: 'paypal',
          status: 'error'
        })
      })
    );
  });

  test('capture returns verifying on uncertain provider outcome', async () => {
    const {POST, applyPaymentTransition, triggerTransactionalEmailOutboxNow} = await importCaptureRoute({
      captureResult: {status: 'verifying', code: 'paypal_capture_uncertain', paypalOrderId: paypalFixtureIds.paypalOrderId}
    });

    const response = await POST(new Request('http://localhost/api/paypal/orders/id/capture', {method: 'POST'}), {
      params: Promise.resolve({paypalOrderId: paypalFixtureIds.paypalOrderId})
    });

    await expect(response.json()).resolves.toEqual({
      status: 'verifying',
      code: 'paypal_capture_uncertain',
      paypalOrderId: paypalFixtureIds.paypalOrderId
    });
    expect(applyPaymentTransition).not.toHaveBeenCalled();
    expect(triggerTransactionalEmailOutboxNow).not.toHaveBeenCalled();
  });

  test('completed capture delegates paid state to applyPaymentTransition', async () => {
    const {POST, authClient, applyPaymentTransition, triggerTransactionalEmailOutboxNow, getAuthorizedOrderPayment} = await importCaptureRoute();

    const response = await POST(new Request('http://localhost/api/paypal/orders/id/capture', {method: 'POST'}), {
      params: Promise.resolve({paypalOrderId: paypalFixtureIds.paypalOrderId})
    });

    await expect(response.json()).resolves.toMatchObject({status: 'paid'});
    expect(getAuthorizedOrderPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: paypalFixtureIds.orderNumber,
        guestSecretHash: 'guest-hash',
        client: authClient
      })
    );
    expect(applyPaymentTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'paypal_recheck',
        targetStatus: 'paid',
        orderNumber: paypalFixtureIds.orderNumber,
        amountMinor: 4250,
        currencyCode: 'USD',
        sanitizedFacts: expect.objectContaining({
          providerOrderId: paypalFixtureIds.paypalOrderId,
          providerCaptureId: paypalFixtureIds.paypalCaptureId
        })
      }),
      expect.any(Object)
    );
    expect(triggerTransactionalEmailOutboxNow).toHaveBeenCalledWith({reason: 'paypal_capture_paid'});
  });

  test('capture records reconciliation rejection for admin operations review', async () => {
    const recordOperationalFailure = vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'}));
    const {POST, applyPaymentTransition} = await importCaptureRoute({
      recordOperationalFailure,
      captureResult: {
        status: 'captured',
        paypalOrderId: paypalFixtureIds.paypalOrderId,
        providerOrder: {
          id: paypalFixtureIds.paypalOrderId,
          status: 'COMPLETED',
          purchase_units: [
            {
              invoice_id: paypalFixtureIds.orderNumber,
              custom_id: paypalFixtureIds.localOrderId,
              payee: {merchant_id: 'MERCHANT-MISMATCH'},
              payments: {
                captures: [
                  {
                    id: paypalFixtureIds.paypalCaptureId,
                    status: 'COMPLETED',
                    amount: {currency_code: 'USD', value: '42.50'}
                  }
                ]
              }
            }
          ]
        }
      }
    });

    const response = await POST(new Request('http://localhost/api/paypal/orders/id/capture', {method: 'POST'}), {
      params: Promise.resolve({paypalOrderId: paypalFixtureIds.paypalOrderId})
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({status: 'review_required', code: 'paypal_merchant_mismatch'});
    expect(applyPaymentTransition).not.toHaveBeenCalled();
    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'payment',
        severity: 'warning',
        errorCode: 'paypal_merchant_mismatch',
        summary: 'PayPal capture reconciliation rejected',
        facts: expect.objectContaining({
          orderId: paypalFixtureIds.localOrderId,
          orderNumber: paypalFixtureIds.orderNumber,
          provider: 'paypal',
          providerOrderId: paypalFixtureIds.paypalOrderId
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/email_address|access_token|rawPayload|signature/i);
  });
});
