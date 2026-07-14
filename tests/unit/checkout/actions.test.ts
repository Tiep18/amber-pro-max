import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
  createSupabaseServerClientMock,
  acknowledgeRecoveryMock,
  getGuestCheckoutRecoveryMock,
  getGuestOrderAccessHashMock,
  getAuthorizedOrderPaymentMock,
  prepareRecoveryMock,
  quoteCartIntentMock,
  recordOperationalFailureMock,
  setGuestOrderAccessCookieMock,
  submitCheckoutMock
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  acknowledgeRecoveryMock: vi.fn(),
  getGuestCheckoutRecoveryMock: vi.fn(),
  getGuestOrderAccessHashMock: vi.fn(),
  getAuthorizedOrderPaymentMock: vi.fn(),
  prepareRecoveryMock: vi.fn(),
  quoteCartIntentMock: vi.fn(),
  recordOperationalFailureMock: vi.fn(),
  setGuestOrderAccessCookieMock: vi.fn(),
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
  acknowledgeGuestCheckoutRecoveryFromServer: acknowledgeRecoveryMock,
  getGuestCheckoutRecoveryFromServer: getGuestCheckoutRecoveryMock,
  getGuestOrderAccessHashFromServer: getGuestOrderAccessHashMock,
  hashGuestOrderAccessToken: vi.fn((value: string) => `hash:${value}`),
  prepareGuestCheckoutRecoveryFromServer: prepareRecoveryMock,
  setGuestOrderAccessCookieFromServer: setGuestOrderAccessCookieMock
}));
vi.mock('@/payments/queries', () => ({getAuthorizedOrderPayment: getAuthorizedOrderPaymentMock}));
vi.mock('@/operations/errors', () => ({
  recordOperationalFailure: recordOperationalFailureMock
}));

import {
  acknowledgeGuestCheckoutRecoveryAction,
  prepareGuestCheckoutRecoveryAction,
  refreshCheckoutQuoteAction,
  submitCheckoutAction
} from '@/checkout/actions';

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

function validQuoteInput() {
  return {
    locale: 'en',
    market: 'intl',
    lines: [],
    destinationCountryCode: 'us',
    destinationRegionCode: 'ca',
    shippingQuoteVersion: 2 as const,
    priorAcceptedQuoteHash: 'hash'
  };
}
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
    getGuestCheckoutRecoveryMock.mockResolvedValue({attemptId: 'a'.repeat(43), proof: 'b'.repeat(43)});
    prepareRecoveryMock.mockResolvedValue({status: 'ready'});
  });

  it('records checkout quote exceptions and returns the operational error id', async () => {
    quoteCartIntentMock.mockRejectedValue(new Error('quote database failed for buyer@example.test'));

    await expect(refreshCheckoutQuoteAction(validQuoteInput())).resolves.toEqual({
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

  it('returns checkout error states when operational recording fails', async () => {
    recordOperationalFailureMock.mockRejectedValue(new Error('operational table unavailable'));
    quoteCartIntentMock.mockRejectedValue(new Error('quote failed'));
    submitCheckoutMock.mockRejectedValue(new Error('submit failed'));

    await expect(refreshCheckoutQuoteAction(validQuoteInput())).resolves.toEqual({
      status: 'error',
      code: 'checkout_quote_failed'
    });
    await expect(submitCheckoutAction(validCheckoutInput())).resolves.toEqual({
      status: 'error',
      code: 'checkout_submit_failed'
    });
  });

  it('prepares guest recovery without returning either credential', async () => {
    await expect(prepareGuestCheckoutRecoveryAction(validCheckoutInput())).resolves.toEqual({status: 'ready'});
    expect(prepareRecoveryMock).toHaveBeenCalledWith(expect.stringContaining('buyer@example.test'));
  });

  it('injects server-held recovery into submit and returns metadata only', async () => {
    submitCheckoutMock.mockResolvedValue({
      status: 'success', orderId: 'order-1', orderNumber: 'ATB-1', reservationExpiresAt: '2026-07-14T10:00:00Z'
    });
    await expect(submitCheckoutAction(validCheckoutInput())).resolves.toEqual({
      status: 'success', orderId: 'order-1', orderNumber: 'ATB-1', reservationExpiresAt: '2026-07-14T10:00:00Z', orderPath: '/en/orders/ATB-1'
    });
    expect(submitCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({guestCartId: null, guestRecovery: {attemptId: 'a'.repeat(43), proof: 'b'.repeat(43)}}),
      expect.anything()
    );
  });

  it('recovers the same guest attempt when the first response has no headers or body', async () => {
    submitCheckoutMock.mockResolvedValue({
      status: 'success', orderId: 'order-1', orderNumber: 'ATB-1', reservationExpiresAt: '2026-07-14T10:00:00Z'
    });
    await submitCheckoutAction(validCheckoutInput());
    await submitCheckoutAction(validCheckoutInput());
    expect(getGuestCheckoutRecoveryMock).toHaveBeenCalledTimes(2);
    expect(submitCheckoutMock).toHaveBeenCalledTimes(2);
    expect(setGuestOrderAccessCookieMock).toHaveBeenCalledTimes(2);
    expect(acknowledgeRecoveryMock).not.toHaveBeenCalled();
  });

  it('keeps recovery after order-cookie headers apply but submit navigation is lost', async () => {
    submitCheckoutMock.mockResolvedValue({
      status: 'success', orderId: 'order-1', orderNumber: 'ATB-1', reservationExpiresAt: '2026-07-14T10:00:00Z'
    });
    await submitCheckoutAction(validCheckoutInput());
    expect(setGuestOrderAccessCookieMock).toHaveBeenCalledOnce();
    expect(acknowledgeRecoveryMock).not.toHaveBeenCalled();
    await submitCheckoutAction(validCheckoutInput());
    expect(setGuestOrderAccessCookieMock).toHaveBeenCalledTimes(2);
    expect(acknowledgeRecoveryMock).not.toHaveBeenCalled();
  });

  it('does not submit a guest order without a delivered preparation cookie', async () => {
    getGuestCheckoutRecoveryMock.mockResolvedValue(null);
    await expect(submitCheckoutAction(validCheckoutInput())).resolves.toEqual({status: 'invalid', code: 'guest_recovery_required'});
    expect(submitCheckoutMock).not.toHaveBeenCalled();
  });

  it('clears recovery only after the order cookie authorizes the same order', async () => {
    getGuestOrderAccessHashMock.mockResolvedValue(`hash:${'b'.repeat(43)}`);
    getAuthorizedOrderPaymentMock.mockResolvedValue({status: 'found', order: {}});
    acknowledgeRecoveryMock.mockResolvedValue({status: 'cleared'});
    await expect(acknowledgeGuestCheckoutRecoveryAction('ATB-1')).resolves.toEqual({status: 'cleared'});
    expect(acknowledgeRecoveryMock).toHaveBeenCalledWith('ATB-1', expect.objectContaining({proof: 'b'.repeat(43)}));
  });

  it('preserves signed-in submit without guest recovery credentials', async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {getUser: vi.fn(async () => ({data: {user: {id: 'user-1'}}, error: null}))}
    });
    getGuestCheckoutRecoveryMock.mockResolvedValue(null);
    submitCheckoutMock.mockResolvedValue({
      status: 'success', orderId: 'order-2', orderNumber: 'ATB-2', reservationExpiresAt: '2026-07-14T10:00:00Z'
    });
    await expect(submitCheckoutAction(validCheckoutInput())).resolves.toMatchObject({status: 'success', orderId: 'order-2'});
    expect(submitCheckoutMock).toHaveBeenCalledWith(
      expect.not.objectContaining({guestRecovery: expect.anything()}),
      expect.anything()
    );
    expect(setGuestOrderAccessCookieMock).not.toHaveBeenCalled();
  });
});
