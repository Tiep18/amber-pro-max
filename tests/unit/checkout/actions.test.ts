import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
  createSupabaseServerClientMock,
  quoteCartIntentMock,
  recordOperationalFailureMock,
  submitCheckoutMock
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  quoteCartIntentMock: vi.fn(),
  recordOperationalFailureMock: vi.fn(),
  submitCheckoutMock: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock
}));
vi.mock('@/checkout/quote', () => ({
  quoteCartIntent: quoteCartIntentMock
}));
vi.mock('@/checkout/submit-checkout', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/checkout/submit-checkout')>();
  return {
    ...original,
    submitCheckout: submitCheckoutMock
  };
});
vi.mock('@/payments/guest-access', () => ({
  setGuestOrderAccessCookieFromServer: vi.fn()
}));
vi.mock('@/operations/errors', () => ({
  recordOperationalFailure: recordOperationalFailureMock
}));

import {refreshCheckoutQuoteAction, submitCheckoutAction} from '@/checkout/actions';

const readyQuote = {
  status: 'ready',
  locale: 'en',
  market: 'intl',
  currencyCode: 'USD',
  lines: [],
  subtotalMinor: 0,
  excludedSubtotalMinor: 0,
  discount: {status: 'not_applied', amountMinor: 0},
  shipping: {status: 'no_shipping_required', amountMinor: 0, countryCode: null},
  totalMinor: 0,
  changes: [],
  hash: 'hash',
  quotedAt: '2026-07-08T00:00:00.000Z'
};

function validCheckoutInput() {
  return {
    locale: 'en',
    market: 'intl',
    lines: [],
    acceptedQuoteHash: 'hash',
    acceptedQuote: readyQuote,
    idempotencyKey: 'idem-key',
    contactEmail: 'buyer@example.test',
    paymentIntent: 'paypal_intent',
    shippingAddress: null
  };
}

describe('checkout operational error instrumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({data: {user: null}, error: null}))
      }
    });
    recordOperationalFailureMock.mockResolvedValue({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    });
  });

  it('records checkout quote exceptions and returns the operational error id', async () => {
    quoteCartIntentMock.mockRejectedValue(new Error('quote database failed for buyer@example.test'));

    await expect(refreshCheckoutQuoteAction(validCheckoutInput())).resolves.toEqual({
      status: 'error',
      code: 'checkout_quote_failed',
      errorId: '76000000-0000-4000-8000-000000000001'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'checkout',
        errorCode: 'checkout_quote_failed',
        summary: 'Checkout quote failed',
        facts: expect.objectContaining({
          market: 'intl'
        })
      })
    );
  });

  it('records checkout submit exceptions and returns the operational error id', async () => {
    submitCheckoutMock.mockRejectedValue(new Error('submit rpc failed for buyer@example.test'));

    await expect(submitCheckoutAction(validCheckoutInput())).resolves.toEqual({
      status: 'error',
      code: 'checkout_submit_failed',
      errorId: '76000000-0000-4000-8000-000000000001'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'checkout',
        errorCode: 'checkout_submit_failed',
        summary: 'Checkout submit failed',
        facts: expect.objectContaining({
          market: 'intl',
          paymentIntent: 'paypal_intent'
        })
      })
    );
  });
});
