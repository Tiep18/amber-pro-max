import {describe, expect, test, vi} from 'vitest';
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
    expect(result.status === 'verified' ? result.rawBody : undefined).toBeUndefined();
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
