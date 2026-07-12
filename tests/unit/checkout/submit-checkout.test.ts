import {describe, expect, test, vi} from 'vitest';
import {submitCheckout, submitCheckoutInputSchema} from '@/checkout/submit-checkout';

describe('submitCheckoutInputSchema', () => {
  const digitalQuote = {
    status: 'ready',
    hash: 'hash',
    market: 'intl',
    currencyCode: 'USD',
    lines: [{fulfillmentType: 'digital', quantity: 1}],
    shipping: {status: 'no_shipping_required', amountMinor: 0, countryCode: null}
  };

  const physicalQuote = {
    status: 'ready',
    hash: 'hash',
    market: 'intl',
    currencyCode: 'USD',
    lines: [{fulfillmentType: 'physical', quantity: 1}],
    shipping: {status: 'ready', amountMinor: 750, countryCode: 'US'}
  };

  const shippingAddress = {
    recipientName: 'Taylor Customer',
    phoneNumber: '+15551234567',
    countryCode: 'US',
    region: 'CA',
    locality: 'San Francisco',
    addressLine1: '123 Market Street',
    addressLine2: 'Suite 5',
    postalCode: '94105'
  };

  test('requires accepted quote hash, idempotency key, contact email, and payment intent', () => {
    const parsed = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: digitalQuote,
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

  test('allows digital-only checkout without a shipping address', () => {
    const parsed = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: digitalQuote,
      idempotencyKey: 'idem-key',
      contactEmail: 'customer@example.com',
      paymentIntent: 'paypal_intent',
      shippingAddress: null
    });

    expect(parsed.success).toBe(true);
  });

  test('requires a full shipping address for physical checkout', () => {
    const parsed = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: physicalQuote,
      idempotencyKey: 'idem-key',
      contactEmail: 'customer@example.com',
      paymentIntent: 'paypal_intent',
      shippingAddress: null
    });

    expect(parsed.success).toBe(false);
  });

  test('accepts a complete physical shipping address whose country matches the quote', () => {
    const parsed = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: physicalQuote,
      idempotencyKey: 'idem-key',
      contactEmail: 'customer@example.com',
      paymentIntent: 'paypal_intent',
      shippingAddress
    });

    expect(parsed.success).toBe(true);
  });

  test('requires US physical submit to include a two-letter state or territory and postal code', () => {
    const missingRegion = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: physicalQuote,
      idempotencyKey: 'idem-key',
      contactEmail: 'customer@example.com',
      paymentIntent: 'paypal_intent',
      shippingAddress: {...shippingAddress, region: null}
    });
    const longRegion = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: physicalQuote,
      idempotencyKey: 'idem-key',
      contactEmail: 'customer@example.com',
      paymentIntent: 'paypal_intent',
      shippingAddress: {...shippingAddress, region: 'California'}
    });
    const missingPostal = submitCheckoutInputSchema.safeParse({
      locale: 'en',
      market: 'intl',
      lines: [],
      acceptedQuoteHash: 'hash',
      acceptedQuote: physicalQuote,
      idempotencyKey: 'idem-key',
      contactEmail: 'customer@example.com',
      paymentIntent: 'paypal_intent',
      shippingAddress: {...shippingAddress, postalCode: null}
    });

    expect(missingRegion.success).toBe(false);
    expect(longRegion.success).toBe(false);
    expect(missingPostal.success).toBe(false);
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
        acceptedQuote: {status: 'ready', hash: 'hash', market: 'intl', currencyCode: 'USD'},
        idempotencyKey: 'idem-key',
        contactEmail: 'customer@example.com',
        paymentIntent: 'paypal_intent',
        shippingAddress: null
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

  test('forwards the immutable shipping address snapshot to submit_checkout for physical orders', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: 'success',
        orderId: 'order-1',
        orderNumber: 'ATB-0001',
        reservationExpiresAt: '2026-06-15T00:15:00.000Z'
      },
      error: null
    });
    const shippingAddress = {
      recipientName: 'Taylor Customer',
      phoneNumber: '+15551234567',
      countryCode: 'US',
      region: 'CA',
      locality: 'San Francisco',
      addressLine1: '123 Market Street',
      addressLine2: null,
      postalCode: '94105'
    };

    await submitCheckout(
      {
        locale: 'en',
        market: 'intl',
        lines: [],
        acceptedQuoteHash: 'hash',
        acceptedQuote: {
          status: 'ready',
          hash: 'hash',
          market: 'intl',
          currencyCode: 'USD',
          lines: [{fulfillmentType: 'physical', quantity: 1}],
          shipping: {status: 'ready', amountMinor: 750, countryCode: 'US'}
        },
        idempotencyKey: 'idem-key',
        contactEmail: 'customer@example.com',
        paymentIntent: 'paypal_intent',
        shippingAddress
      },
      {rpc} as never
    );

    expect(rpc).toHaveBeenCalledWith('submit_checkout', {
      p_payload: expect.objectContaining({shippingAddress})
    });
  });
});
