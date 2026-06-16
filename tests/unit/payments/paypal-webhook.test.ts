import {beforeEach, describe, expect, test, vi} from 'vitest';
import {
  paypalCompletedCaptureEvent,
  paypalDeclinedCaptureEvent,
  paypalFixtureEvents,
  paypalFixtureHeaders,
  paypalFixtureIds,
  paypalFullRefundEvent,
  paypalMismatchedAmountEvent,
  paypalMismatchedCurrencyEvent,
  paypalMismatchedMerchantEvent,
  paypalPartialRefundEvent,
  paypalPendingCaptureEvent
} from '../../fixtures/payments/paypal-events';
import {
  PAYPAL_WEBHOOK_BODY_LIMIT_BYTES,
  reconcilePayPalEvent,
  verifyPayPalWebhook
} from '@/payments/paypal/verification';

vi.mock('server-only', () => ({}));

const routeMocks = vi.hoisted(() => ({
  adminClient: null as unknown,
  paypalVerificationStatus: 'SUCCESS' as 'SUCCESS' | 'FAILURE'
}));

vi.mock('@/lib/env/server', () => ({
  getServerEnv: () => ({
    paypal: {
      status: 'configured',
      clientId: 'fixture-client-id',
      clientSecret: 'fixture-client-secret',
      webhookId: 'WEBHOOK-FIXTURE-ID',
      expectedMerchantId: 'MERCHANT-TEST-ONLY',
      apiBase: 'https://api-m.sandbox.paypal.com',
      enabledCountries: ['US'],
      enabledCurrency: 'USD'
    }
  })
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => routeMocks.adminClient
}));

const configuredPayPal = {
  status: 'configured' as const,
  clientId: 'fixture-client-id',
  clientSecret: 'fixture-client-secret',
  webhookId: 'WEBHOOK-FIXTURE-ID',
  expectedMerchantId: paypalFixtureIds.merchantId,
  apiBase: 'https://api-m.sandbox.paypal.com',
  enabledCountries: ['US'],
  enabledCurrency: 'USD' as const
};

const order = {
  orderId: paypalFixtureIds.localOrderId,
  orderNumber: paypalFixtureIds.orderNumber,
  totalMinor: 4250,
  currencyCode: 'USD' as const,
  market: 'intl' as const,
  paymentIntent: 'paypal_intent' as const,
  providerOrderId: paypalFixtureIds.paypalOrderId,
  paypalCreateRequestId: 'create-request-fixture',
  paypalCaptureRequestId: 'capture-request-fixture'
};

function rawBody(event: unknown) {
  return JSON.stringify(event);
}

function verificationTransport(status: 'SUCCESS' | 'FAILURE' = 'SUCCESS') {
  const calls: Array<{url: string; init?: RequestInit}> = [];
  return {
    calls,
    transport: async (url: string, init?: RequestInit) => {
      calls.push({url, init});
      if (url.endsWith('/v1/oauth2/token')) {
        return Response.json({access_token: 'ok'}, {status: 200});
      }
      if (url.endsWith('/v1/notifications/verify-webhook-signature')) {
        return Response.json({verification_status: status}, {status: 200});
      }
      throw new Error(`unexpected url ${url}`);
    }
  };
}

type TableRows = {
  payments: Record<string, unknown>[];
  order_payment_statuses: Record<string, unknown>[];
  payment_events: Record<string, unknown>[];
};

function createRouteClient({existingEvent = false, orderPaymentStatus = 'pending'} = {}) {
  const rows: TableRows = {
    payments: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        order_id: paypalFixtureIds.localOrderId,
        provider_order_id: paypalFixtureIds.paypalOrderId,
        request_id: 'capture-request-fixture',
        provider_request_id: 'create-request-fixture'
      }
    ],
    order_payment_statuses: [
      {
        order_id: paypalFixtureIds.localOrderId,
        order_number: paypalFixtureIds.orderNumber,
        market: 'intl',
        currency_code: 'USD',
        total_minor: 4250,
        provider: 'paypal',
        payment_status: orderPaymentStatus,
        reservation_expires_at: new Date(Date.now() + 900_000).toISOString()
      }
    ],
    payment_events: existingEvent
      ? [
          {
            id: '33333333-3333-4333-8333-333333333333',
            payment_id: '22222222-2222-4222-8222-222222222222',
            provider: 'paypal',
            provider_event_id: paypalCompletedCaptureEvent.id,
            delivery_count: 1
          }
        ]
      : []
  };
  const inserts: Array<{table: string; value: Record<string, unknown>}> = [];
  const updates: Array<{table: string; value: Record<string, unknown>; filters: Record<string, string>}> = [];
  const rpc = vi.fn(async (_fn: string, args?: Record<string, unknown>) => ({
    data: {status: 'applied', paymentStatus: 'paid', transitionId: '44444444-4444-4444-8444-444444444444'},
    error: null,
    args
  }));

  function filterRows(table: keyof TableRows, filters: Record<string, string>) {
    return rows[table].filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value));
  }

  const client = {
    rpc,
    from(table: keyof TableRows) {
      return {
        select: () => {
          const filters: Record<string, string> = {};
          const builder = {
            eq(column: string, value: string) {
              filters[column] = value;
              return builder;
            },
            maybeSingle: async () => ({data: filterRows(table, filters)[0] ?? null, error: null})
          };
          return builder;
        },
        insert: (value: Record<string, unknown>) => {
          inserts.push({table, value});
          return Promise.resolve({data: null, error: null});
        },
        update: (value: Record<string, unknown>) => {
          const filters: Record<string, string> = {};
          const builder = {
            eq(column: string, filterValue: string) {
              filters[column] = filterValue;
              return builder;
            },
            then(resolve: (value: {data: null; error: null}) => void) {
              updates.push({table, value, filters});
              resolve({data: null, error: null});
            }
          };
          return builder;
        }
      };
    }
  };

  return {client, rpc, inserts, updates};
}

function webhookRequest(event: unknown) {
  const body = rawBody(event);
  const text = vi.fn(async () => body);
  return {
    headers: new Headers(paypalFixtureHeaders),
    text
  } as unknown as Request & {text: typeof text};
}

async function loadWebhookRoute() {
  return import('@/app/api/webhooks/paypal/route');
}

beforeEach(() => {
  routeMocks.paypalVerificationStatus = 'SUCCESS';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/v1/oauth2/token')) {
        return Response.json({access_token: 'ok'}, {status: 200});
      }
      if (url.endsWith('/v1/notifications/verify-webhook-signature')) {
        return Response.json({verification_status: routeMocks.paypalVerificationStatus}, {status: 200});
      }
      throw new Error(`unexpected route fetch ${url}`);
    })
  );
});

describe('PayPal webhook verification contract', () => {
  test('fixtures cover completed, declined, merchant mismatch, and amount mismatch cases', () => {
    expect(paypalFixtureEvents.map((event) => event.id)).toEqual([
      paypalCompletedCaptureEvent.id,
      paypalDeclinedCaptureEvent.id,
      paypalPendingCaptureEvent.id,
      paypalMismatchedMerchantEvent.id,
      paypalMismatchedAmountEvent.id,
      paypalMismatchedCurrencyEvent.id,
      paypalPartialRefundEvent.id,
      paypalFullRefundEvent.id
    ]);
    expect(paypalFixtureHeaders['paypal-transmission-sig']).toBe('fixture-signature-not-valid-for-production');
  });

  test('completed fixture carries the provider order, merchant, amount, currency, local order, and order number facts', () => {
    expect(paypalCompletedCaptureEvent.event_type).toBe('PAYMENT.CAPTURE.COMPLETED');
    expect(paypalCompletedCaptureEvent.resource.amount).toEqual({currency_code: 'USD', value: '42.50'});
    expect(paypalCompletedCaptureEvent.resource.payee.merchant_id).toBe('MERCHANT-TEST-ONLY');
    expect(paypalCompletedCaptureEvent.resource.custom_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(paypalCompletedCaptureEvent.resource.invoice_id).toBe('ATB-20260615-0001');
  });

  test('verifies required transmission headers with the exact parsed original event and records only a digest', async () => {
    const verifier = verificationTransport('SUCCESS');
    const body = rawBody(paypalCompletedCaptureEvent);

    const result = await verifyPayPalWebhook({
      rawBody: body,
      headers: paypalFixtureHeaders,
      config: configuredPayPal,
      transport: verifier.transport
    });

    expect(result.status).toBe('verified');
    expect(result).toMatchObject({
      eventId: paypalCompletedCaptureEvent.id,
      eventType: paypalCompletedCaptureEvent.event_type
    });
    expect('rawBody' in result).toBe(false);
    expect(result.status === 'verified' ? result.payloadDigest : '').toMatch(/^[a-f0-9]{64}$/);

    const verificationCall = verifier.calls.find((call) => call.url.endsWith('/v1/notifications/verify-webhook-signature'));
    expect(JSON.parse(String(verificationCall?.init?.body))).toMatchObject({
      auth_algo: paypalFixtureHeaders['paypal-auth-algo'],
      cert_url: paypalFixtureHeaders['paypal-cert-url'],
      transmission_id: paypalFixtureHeaders['paypal-transmission-id'],
      transmission_sig: paypalFixtureHeaders['paypal-transmission-sig'],
      transmission_time: paypalFixtureHeaders['paypal-transmission-time'],
      webhook_id: configuredPayPal.webhookId,
      webhook_event: paypalCompletedCaptureEvent
    });
  });

  test('rejects forged signatures, malformed JSON, missing headers, and oversized bodies', async () => {
    await expect(
      verifyPayPalWebhook({
        rawBody: rawBody(paypalCompletedCaptureEvent),
        headers: paypalFixtureHeaders,
        config: configuredPayPal,
        transport: verificationTransport('FAILURE').transport
      })
    ).resolves.toMatchObject({status: 'rejected', code: 'paypal_webhook_signature_rejected'});

    await expect(
      verifyPayPalWebhook({
        rawBody: '{',
        headers: paypalFixtureHeaders,
        config: configuredPayPal,
        transport: verificationTransport('SUCCESS').transport
      })
    ).resolves.toMatchObject({status: 'malformed', code: 'malformed_paypal_webhook'});

    await expect(
      verifyPayPalWebhook({
        rawBody: rawBody(paypalCompletedCaptureEvent),
        headers: {},
        config: configuredPayPal,
        transport: verificationTransport('SUCCESS').transport
      })
    ).resolves.toMatchObject({status: 'rejected', code: 'missing_paypal_webhook_headers'});

    await expect(
      verifyPayPalWebhook({
        rawBody: 'x'.repeat(PAYPAL_WEBHOOK_BODY_LIMIT_BYTES + 1),
        headers: paypalFixtureHeaders,
        config: configuredPayPal,
        transport: verificationTransport('SUCCESS').transport
      })
    ).resolves.toMatchObject({status: 'rejected', code: 'paypal_webhook_body_too_large'});
  });

  test('validates provider order mapping, merchant, amount, and currency before marking paid', () => {
    expect(
      reconcilePayPalEvent({event: paypalCompletedCaptureEvent, order, expectedMerchantId: paypalFixtureIds.merchantId})
    ).toMatchObject({
      status: 'transition',
      targetStatus: 'paid',
      providerEventId: paypalCompletedCaptureEvent.id,
      amountMinor: 4250,
      currencyCode: 'USD',
      sanitizedFacts: {
        providerOrderId: paypalFixtureIds.paypalOrderId,
        providerCaptureId: paypalFixtureIds.paypalCaptureId,
        merchantId: paypalFixtureIds.merchantId,
        amountMinor: 4250,
        currencyCode: 'USD'
      }
    });

    expect(
      reconcilePayPalEvent({event: paypalMismatchedMerchantEvent, order, expectedMerchantId: paypalFixtureIds.merchantId})
    ).toMatchObject({status: 'rejected', code: 'paypal_merchant_mismatch'});
    expect(reconcilePayPalEvent({event: paypalMismatchedAmountEvent, order, expectedMerchantId: paypalFixtureIds.merchantId})).toMatchObject({
      status: 'rejected',
      code: 'paypal_amount_mismatch'
    });
    expect(reconcilePayPalEvent({event: paypalMismatchedCurrencyEvent, order, expectedMerchantId: paypalFixtureIds.merchantId})).toMatchObject({
      status: 'rejected',
      code: 'paypal_currency_mismatch'
    });
  });

  test('maps declined, pending, unsupported, duplicate, late, and refund events without unsafe paid effects', () => {
    expect(reconcilePayPalEvent({event: paypalDeclinedCaptureEvent, order, expectedMerchantId: paypalFixtureIds.merchantId})).toMatchObject({
      status: 'transition',
      targetStatus: 'failed'
    });
    expect(reconcilePayPalEvent({event: paypalPendingCaptureEvent, order, expectedMerchantId: paypalFixtureIds.merchantId})).toMatchObject({
      status: 'ignored',
      code: 'paypal_capture_pending'
    });
    expect(
      reconcilePayPalEvent({
        event: {...paypalCompletedCaptureEvent, event_type: 'CHECKOUT.ORDER.APPROVED'},
        order,
        expectedMerchantId: paypalFixtureIds.merchantId
      })
    ).toMatchObject({status: 'ignored', code: 'unsupported_paypal_webhook_event'});
    expect(
      reconcilePayPalEvent({event: paypalCompletedCaptureEvent, order, expectedMerchantId: paypalFixtureIds.merchantId, alreadyProcessed: true})
    ).toMatchObject({status: 'duplicate', providerEventId: paypalCompletedCaptureEvent.id});
    expect(
      reconcilePayPalEvent({event: paypalCompletedCaptureEvent, order, expectedMerchantId: paypalFixtureIds.merchantId, orderExpired: true})
    ).toMatchObject({status: 'transition', targetStatus: 'paid', reviewReason: 'late_payment_detected'});
    expect(reconcilePayPalEvent({event: paypalPartialRefundEvent, order, expectedMerchantId: paypalFixtureIds.merchantId})).toMatchObject({
      status: 'refund_visibility',
      refundStatus: 'partially_refunded',
      refundedAmountMinor: 1250
    });
    expect(reconcilePayPalEvent({event: paypalFullRefundEvent, order, expectedMerchantId: paypalFixtureIds.merchantId})).toMatchObject({
      status: 'refund_visibility',
      refundStatus: 'refunded',
      refundedAmountMinor: 4250
    });
  });
});

describe('PayPal webhook route contract', () => {
  test('valid completed capture reads the body once and delegates one verified transition', async () => {
    const state = createRouteClient();
    routeMocks.adminClient = state.client;
    const request = webhookRequest(paypalCompletedCaptureEvent);
    const {POST} = await loadWebhookRoute();

    const response = await POST(request);
    const body = await response.json();

    expect(request.text).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(body).toMatchObject({status: 'accepted', result: 'applied'});
    expect(state.rpc).toHaveBeenCalledTimes(1);
    expect(state.rpc.mock.calls[0][0]).toBe('apply_payment_transition');
    expect(state.rpc.mock.calls[0][1].p_payload).toMatchObject({
      source: 'paypal_webhook',
      targetStatus: 'paid',
      providerEventId: paypalCompletedCaptureEvent.id,
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      orderNumber: paypalFixtureIds.orderNumber,
      amountMinor: 4250,
      currencyCode: 'USD',
      verificationStatus: 'verified'
    });
  });

  test('duplicate event increments delivery history and does not repeat transition effects', async () => {
    const state = createRouteClient({existingEvent: true});
    routeMocks.adminClient = state.client;
    const {POST} = await loadWebhookRoute();

    const response = await POST(webhookRequest(paypalCompletedCaptureEvent));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({status: 'duplicate'});
    expect(state.rpc).not.toHaveBeenCalled();
    expect(state.updates).toEqual([
      {
        table: 'payment_events',
        value: expect.objectContaining({last_received_at: expect.any(String), delivery_count: 2}),
        filters: {id: '33333333-3333-4333-8333-333333333333'}
      }
    ]);
  });

  test('forged signatures fail safely without receipt mutation or transition', async () => {
    const state = createRouteClient();
    routeMocks.adminClient = state.client;
    routeMocks.paypalVerificationStatus = 'FAILURE';
    const {POST} = await loadWebhookRoute();

    const response = await POST(webhookRequest(paypalCompletedCaptureEvent));

    expect(response.status).toBe(400);
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  test('pending out-of-order event records a verified no-op receipt without transition', async () => {
    const state = createRouteClient({orderPaymentStatus: 'paid'});
    routeMocks.adminClient = state.client;
    const {POST} = await loadWebhookRoute();

    const response = await POST(webhookRequest(paypalPendingCaptureEvent));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({status: 'ignored', code: 'paypal_capture_pending'});
    expect(state.rpc).not.toHaveBeenCalled();
    expect(state.inserts).toEqual([
      {
        table: 'payment_events',
        value: expect.objectContaining({
          payment_id: '22222222-2222-4222-8222-222222222222',
          provider: 'paypal',
          provider_event_id: paypalPendingCaptureEvent.id,
          event_type: 'PAYMENT.CAPTURE.PENDING',
          source: 'paypal_webhook',
          verification_status: 'verified',
          delivery_count: 1
        })
      }
    ]);
  });
});
