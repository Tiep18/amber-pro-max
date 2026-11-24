import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createPayPalProcessor,
  PAYPAL_WEBHOOK_BODY_LIMIT_BYTES,
  type PayPalAdapters
} from '@/payments/paypal/processor';
import { paypalWebhookResponse } from '@/payments/paypal/server';
import {
  createInMemoryPayPalStore,
  createMockPayPalTransport,
  makeStoredPayPalOrder,
  paypalFixtureConfig,
  unconfiguredPayPalConfig
} from '../../fixtures/payments/paypal-adapters';
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

const OPEN_NOW = Date.parse('2026-06-15T03:00:00.000Z');
const EXPIRED_NOW = Date.parse('2026-06-15T05:00:00.000Z');

type OperationalFailureRecorder = NonNullable<PayPalAdapters['recordOperationalFailure']>;
type EmailOutboxTrigger = NonNullable<PayPalAdapters['triggerEmailOutbox']>;

function rawBody(event: unknown) {
  return JSON.stringify(event);
}

function createWebhookHarness({
  orders = [makeStoredPayPalOrder()],
  existingEvents = [],
  config = paypalFixtureConfig,
  now = () => OPEN_NOW,
  transportOptions,
  recordOperationalFailure,
  triggerEmailOutbox
}: {
  orders?: ReturnType<typeof makeStoredPayPalOrder>[];
  existingEvents?: Array<{ id: string; providerEventId: string; deliveryCount: number }>;
  config?: typeof paypalFixtureConfig | typeof unconfiguredPayPalConfig;
  now?: () => number;
  transportOptions?: Parameters<typeof createMockPayPalTransport>[0];
  recordOperationalFailure?: OperationalFailureRecorder;
  triggerEmailOutbox?: EmailOutboxTrigger;
} = {}) {
  const memory = createInMemoryPayPalStore({ orders, existingEvents });
  const mockTransport = createMockPayPalTransport(transportOptions);
  const recordSpy = vi.fn<OperationalFailureRecorder>(
    recordOperationalFailure ??
      (async () => ({
        status: 'recorded',
        errorId: '76000000-0000-4000-8000-000000000001'
      }))
  );
  const emailSpy = vi.fn<EmailOutboxTrigger>(
    triggerEmailOutbox ??
      (async () => ({
        status: 'processed',
        claimed: 1,
        sent: 1,
        retry: 0,
        failed: 0
      }))
  );
  const processor = createPayPalProcessor({
    config,
    store: memory.store,
    transport: mockTransport.transport,
    triggerEmailOutbox: emailSpy,
    recordOperationalFailure: recordSpy,
    log: () => {},
    now
  });

  return {
    processor,
    memory,
    transportCalls: mockTransport.calls,
    recordOperationalFailure: recordSpy,
    triggerEmailOutbox: emailSpy
  };
}

describe('PayPal webhook processor contract', () => {
  test('fixtures cover completed, declined, merchant mismatch, amount mismatch, currency mismatch, and refund cases', () => {
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
    expect(paypalFixtureHeaders['paypal-transmission-sig']).toBe(
      'fixture-signature-not-valid-for-production'
    );
  });

  test('verifies required headers, reads body once, hashes digest, delegates one verified transition, and triggers paid email', async () => {
    const { processor, memory, transportCalls, triggerEmailOutbox } = createWebhookHarness();
    const bodyText = rawBody(paypalCompletedCaptureEvent);
    const readRawBody = vi.fn(async () => bodyText);

    const outcome = await processor.handlePayPalWebhook({
      headers: new Headers(paypalFixtureHeaders),
      readRawBody
    });

    expect(readRawBody).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ status: 'accepted', result: 'applied' });
    expect(paypalWebhookResponse(outcome).status).toBe(200);

    const verifyCall = transportCalls.find(
      (call) =>
        call.method === 'POST' && call.url.endsWith('/v1/notifications/verify-webhook-signature')
    );
    expect(JSON.parse(String(verifyCall?.init?.body))).toMatchObject({
      auth_algo: paypalFixtureHeaders['paypal-auth-algo'],
      cert_url: paypalFixtureHeaders['paypal-cert-url'],
      transmission_id: paypalFixtureHeaders['paypal-transmission-id'],
      transmission_sig: paypalFixtureHeaders['paypal-transmission-sig'],
      transmission_time: paypalFixtureHeaders['paypal-transmission-time'],
      webhook_id: paypalFixtureConfig.webhookId,
      webhook_event: paypalCompletedCaptureEvent
    });

    expect(memory.transitions).toHaveLength(1);
    expect(memory.transitions[0]).toMatchObject({
      source: 'paypal_webhook',
      targetStatus: 'paid',
      providerEventId: paypalCompletedCaptureEvent.id,
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      orderNumber: paypalFixtureIds.orderNumber,
      amountMinor: 4250,
      currencyCode: 'USD',
      verificationStatus: 'verified'
    });
    expect(memory.transitions[0]?.payloadDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(triggerEmailOutbox).toHaveBeenCalledWith({ reason: 'paypal_webhook_paid' });
  });

  test('rejects forged signatures, malformed JSON, missing headers, oversized Content-Length, and network errors cleanly', async () => {
    const oversizedRead = vi.fn(async () => 'never-read');
    const contentLengthHarness = createWebhookHarness();
    const tooLargeHeader = await contentLengthHarness.processor.handlePayPalWebhook({
      headers: { ...paypalFixtureHeaders, 'content-length': String(PAYPAL_WEBHOOK_BODY_LIMIT_BYTES + 1) },
      readRawBody: oversizedRead
    });
    expect(tooLargeHeader).toEqual({
      status: 'rejected',
      code: 'paypal_webhook_body_too_large'
    });
    expect(paypalWebhookResponse(tooLargeHeader).status).toBe(413);
    expect(oversizedRead).not.toHaveBeenCalled();

    const tooLargeBody = await contentLengthHarness.processor.handlePayPalWebhook({
      headers: paypalFixtureHeaders,
      rawBody: 'x'.repeat(PAYPAL_WEBHOOK_BODY_LIMIT_BYTES + 1)
    });
    expect(tooLargeBody).toEqual({ status: 'rejected', code: 'paypal_webhook_body_too_large' });

    const missingHeaders = await contentLengthHarness.processor.handlePayPalWebhook({
      headers: {},
      rawBody: rawBody(paypalCompletedCaptureEvent)
    });
    expect(missingHeaders).toEqual({ status: 'rejected', code: 'missing_paypal_webhook_headers' });
    expect(paypalWebhookResponse(missingHeaders).status).toBe(400);

    const malformed = await contentLengthHarness.processor.handlePayPalWebhook({
      headers: paypalFixtureHeaders,
      rawBody: '{'
    });
    expect(malformed).toEqual({ status: 'malformed', code: 'malformed_paypal_webhook' });
    expect(paypalWebhookResponse(malformed).status).toBe(400);

    const forged = createWebhookHarness({
      transportOptions: { webhookVerifyStatus: 'FAILURE' }
    });
    const forgedOutcome = await forged.processor.handlePayPalWebhook({
      headers: new Headers(paypalFixtureHeaders),
      rawBody: rawBody(paypalCompletedCaptureEvent)
    });
    expect(forgedOutcome).toEqual({
      status: 'rejected',
      code: 'paypal_webhook_signature_rejected'
    });
    expect(paypalWebhookResponse(forgedOutcome).status).toBe(400);
    expect(forged.memory.receipts).toHaveLength(0);
    expect(forged.memory.transitions).toHaveLength(0);
    expect(forged.recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'paypal_webhook',
        severity: 'warning',
        errorCode: 'paypal_webhook_signature_rejected',
        summary: 'PayPal webhook verification failed',
        facts: expect.objectContaining({
          eventType: paypalCompletedCaptureEvent.event_type,
          providerEventId: paypalCompletedCaptureEvent.id
        })
      })
    );
    expect(JSON.stringify(forged.recordOperationalFailure.mock.calls)).not.toMatch(
      /paypal-transmission-sig|rawBody|fixture-signature/i
    );

    const verifyTransportThrow = createWebhookHarness({
      transportOptions: { webhookVerifyError: new Error('network reset') }
    });
    const providerErrOutcome = await verifyTransportThrow.processor.handlePayPalWebhook({
      headers: paypalFixtureHeaders,
      rawBody: rawBody(paypalCompletedCaptureEvent)
    });
    expect(providerErrOutcome).toEqual({ status: 'error', code: 'paypal_provider_error' });
    expect(paypalWebhookResponse(providerErrOutcome).status).toBe(502);
    expect(verifyTransportThrow.memory.transitions).toHaveLength(0);

    const unconfigured = createWebhookHarness({ config: unconfiguredPayPalConfig });
    const unconfiguredOutcome = await unconfigured.processor.handlePayPalWebhook({
      headers: paypalFixtureHeaders,
      rawBody: rawBody(paypalCompletedCaptureEvent)
    });
    expect(unconfiguredOutcome).toEqual({
      status: 'unconfigured',
      code: 'missing_paypal_server_config'
    });
    expect(paypalWebhookResponse(unconfiguredOutcome).status).toBe(503);
  });

  test('forged signatures keep rejection response stable when operational recording fails', async () => {
    const throwingRecorder = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const { processor, memory } = createWebhookHarness({
      transportOptions: { webhookVerifyStatus: 'FAILURE' },
      recordOperationalFailure: throwingRecorder
    });

    const outcome = await processor.handlePayPalWebhook({
      headers: paypalFixtureHeaders,
      rawBody: rawBody(paypalCompletedCaptureEvent)
    });

    expect(outcome).toEqual({
      status: 'rejected',
      code: 'paypal_webhook_signature_rejected'
    });
    expect(paypalWebhookResponse(outcome).status).toBe(400);
    expect(memory.receipts).toHaveLength(0);
    expect(memory.transitions).toHaveLength(0);
  });

  test('duplicate event increments delivery history and skips repeated transition effects', async () => {
    const { processor, memory, triggerEmailOutbox } = createWebhookHarness({
      existingEvents: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          providerEventId: paypalCompletedCaptureEvent.id,
          deliveryCount: 1
        }
      ]
    });

    const outcome = await processor.handlePayPalWebhook({
      headers: paypalFixtureHeaders,
      rawBody: rawBody(paypalCompletedCaptureEvent)
    });

    expect(outcome).toEqual({ status: 'duplicate' });
    expect(paypalWebhookResponse(outcome).status).toBe(200);
    expect(memory.transitions).toHaveLength(0);
    expect(triggerEmailOutbox).not.toHaveBeenCalled();
    expect(memory.events.get(paypalCompletedCaptureEvent.id)?.deliveryCount).toBe(2);
  });

  test('validates merchant, amount, currency mismatches and routes to review_required receipt without paid transition', async () => {
    for (const [event, expectedCode] of [
      [paypalMismatchedMerchantEvent, 'paypal_merchant_mismatch'],
      [paypalMismatchedAmountEvent, 'paypal_amount_mismatch'],
      [paypalMismatchedCurrencyEvent, 'paypal_currency_mismatch']
    ] as const) {
      const { processor, memory, triggerEmailOutbox } = createWebhookHarness();
      const outcome = await processor.handlePayPalWebhook({
        headers: paypalFixtureHeaders,
        rawBody: rawBody(event)
      });

      expect(outcome).toEqual({ status: 'review_required', code: expectedCode });
      expect(paypalWebhookResponse(outcome).status).toBe(202);
      expect(memory.transitions).toHaveLength(0);
      expect(memory.receipts).toContainEqual(
        expect.objectContaining({
          providerEventId: event.id,
          verificationStatus: 'rejected'
        })
      );
      expect(triggerEmailOutbox).not.toHaveBeenCalled();
    }
  });

  test('routes declined, pending, unsupported, late settlement, unknown order, and refund visibility events accurately', async () => {
    const declined = createWebhookHarness();
    await expect(
      declined.processor.handlePayPalWebhook({
        headers: paypalFixtureHeaders,
        rawBody: rawBody(paypalDeclinedCaptureEvent)
      })
    ).resolves.toMatchObject({ status: 'accepted', result: 'applied' });
    expect(declined.memory.transitions[0]).toMatchObject({
      targetStatus: 'failed',
      releaseReason: 'paypal_capture_failed'
    });

    const pending = createWebhookHarness({
      orders: [makeStoredPayPalOrder({ paymentStatus: 'paid' })]
    });
    await expect(
      pending.processor.handlePayPalWebhook({
        headers: paypalFixtureHeaders,
        rawBody: rawBody(paypalPendingCaptureEvent)
      })
    ).resolves.toEqual({ status: 'ignored', code: 'paypal_capture_pending' });
    expect(pending.memory.transitions).toHaveLength(0);
    expect(pending.triggerEmailOutbox).not.toHaveBeenCalled();
    expect(pending.memory.receipts[0]).toMatchObject({
      providerEventId: paypalPendingCaptureEvent.id,
      verificationStatus: 'verified'
    });

    const unsupported = createWebhookHarness();
    await expect(
      unsupported.processor.handlePayPalWebhook({
        headers: paypalFixtureHeaders,
        rawBody: rawBody({ ...paypalCompletedCaptureEvent, event_type: 'CHECKOUT.ORDER.APPROVED' })
      })
    ).resolves.toEqual({ status: 'ignored', code: 'unsupported_paypal_webhook_event' });

    const late = createWebhookHarness({
      orders: [makeStoredPayPalOrder({ reservationExpiresAt: '2026-06-15T04:00:00.000Z' })],
      now: () => EXPIRED_NOW
    });
    await expect(
      late.processor.handlePayPalWebhook({
        headers: paypalFixtureHeaders,
        rawBody: rawBody(paypalCompletedCaptureEvent)
      })
    ).resolves.toMatchObject({ status: 'accepted', result: 'applied' });
    expect(late.memory.transitions[0]).toMatchObject({
      targetStatus: 'paid',
      reviewReason: 'late_payment_detected'
    });

    const partialRefund = createWebhookHarness({
      orders: [makeStoredPayPalOrder({ paymentStatus: 'paid' })]
    });
    await expect(
      partialRefund.processor.handlePayPalWebhook({
        headers: paypalFixtureHeaders,
        rawBody: rawBody(paypalPartialRefundEvent)
      })
    ).resolves.toEqual({ status: 'refund_visibility', refundStatus: 'partially_refunded' });
    expect(partialRefund.memory.refundVisibilityRecords[0]).toMatchObject({
      refundStatus: 'partially_refunded',
      refundedAmountMinor: 1250
    });
    expect(partialRefund.memory.transitions).toHaveLength(0);

    const fullRefund = createWebhookHarness({
      orders: [makeStoredPayPalOrder({ paymentStatus: 'paid' })]
    });
    await expect(
      fullRefund.processor.handlePayPalWebhook({
        headers: paypalFixtureHeaders,
        rawBody: rawBody(paypalFullRefundEvent)
      })
    ).resolves.toEqual({ status: 'refund_visibility', refundStatus: 'refunded' });
    expect(fullRefund.memory.refundVisibilityRecords[0]).toMatchObject({
      refundStatus: 'refunded',
      refundedAmountMinor: 4250
    });

    const missingOrder = createWebhookHarness({ orders: [] });
    const missingOutcome = await missingOrder.processor.handlePayPalWebhook({
      headers: paypalFixtureHeaders,
      rawBody: rawBody(paypalCompletedCaptureEvent)
    });
    expect(missingOutcome).toEqual({ status: 'ignored', code: 'paypal_order_not_found' });
    expect(paypalWebhookResponse(missingOutcome).status).toBe(202);
  });
});
