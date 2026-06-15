import {describe, expect, test, vi} from 'vitest';
import {submitCheckout, submitCheckoutInputSchema} from '@/checkout/submit-checkout';

describe('submitCheckoutInputSchema', () => {
  test('requires accepted quote hash, idempotency key, contact email, and payment intent', () => {
    const parsed = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: {status: 'ready', hash: 'hash'},
      idempotencyKey: 'idem-key',
      contactEmail: 'customer@example.com',
      paymentIntent: 'paypal_intent'
    });

    expect(parsed.success).toBe(true);
  });

  test('rejects unsupported payment intents before the RPC boundary', () => {
    const parsed = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: {status: 'ready', hash: 'hash'},
      idempotencyKey: 'idem-key',
      contactEmail: 'customer@example.com',
      paymentIntent: 'capture_now'
    });

    expect(parsed.success).toBe(false);
  });
});

describe('submitCheckout', () => {
  test('calls the single submit_checkout RPC and maps pending-payment handoff data', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: 'success',
        orderId: 'order-1',
        orderNumber: 'ATB-0001',
        reservationExpiresAt: '2026-06-15T00:15:00.000Z',
        guestAccessToken: 'guest-token'
      },
      error: null
    });

    const result = await submitCheckout(
      {
        locale: 'en',
        market: 'intl',
        lines: [],
        acceptedQuoteHash: 'hash',
        acceptedQuote: {status: 'ready', hash: 'hash'},
        idempotencyKey: 'idem-key',
        contactEmail: 'customer@example.com',
        paymentIntent: 'paypal_intent'
      },
      {rpc} as never
    );

    expect(rpc).toHaveBeenCalledWith('submit_checkout', {
      p_payload: expect.objectContaining({idempotencyKey: 'idem-key', paymentIntent: 'paypal_intent'})
    });
    expect(result).toEqual({
      status: 'success',
      orderId: 'order-1',
      orderNumber: 'ATB-0001',
      reservationExpiresAt: '2026-06-15T00:15:00.000Z',
      guestAccessToken: 'guest-token'
    });
  });
});
