import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
  createSupabaseServerClientMock,
  getRequestMarketMock,
  quoteCartIntentMock,
  recordOperationalFailureMock
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getRequestMarketMock: vi.fn(),
  quoteCartIntentMock: vi.fn(),
  recordOperationalFailureMock: vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'}))
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock
}));
vi.mock('@/catalog/page-context', () => ({
  getRequestMarket: getRequestMarketMock
}));
vi.mock('@/checkout/quote', () => ({
  quoteCartIntent: quoteCartIntentMock
}));
vi.mock('@/operations/errors', () => ({
  recordOperationalFailure: recordOperationalFailureMock
}));

import {refreshCartQuoteAction} from '@/cart/actions';

describe('cart action operational recording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServerClientMock.mockResolvedValue({rpc: vi.fn()});
    getRequestMarketMock.mockResolvedValue('intl');
  });

  it('records quote refresh failures without exposing raw cart or database details', async () => {
    quoteCartIntentMock.mockRejectedValue(new Error('cart quote failed for buyer@example.test'));

    await expect(refreshCartQuoteAction({
      locale: 'en',
      lines: [
        {
          productId: '33333333-3333-4333-8333-333333333333',
          variantId: null,
          quantity: 1,
          marketAtAdd: 'intl',
          title: 'Do not log me'
        }
      ],
      destinationCountryCode: 'US',
      discountCode: 'SECRET-DISCOUNT'
    })).resolves.toEqual({status: 'error', code: 'quote_failed'});

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'checkout',
        severity: 'error',
        errorCode: 'cart.quote_refresh_failed',
        summary: 'Cart quote refresh failed',
        facts: expect.objectContaining({
          action: 'cart_quote_refresh',
          market: 'intl',
          code: 'quote_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/buyer@example|Do not log me|SECRET-DISCOUNT|cart quote failed/i);
  });
});
