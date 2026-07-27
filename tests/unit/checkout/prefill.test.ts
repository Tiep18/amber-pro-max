import {describe, expect, it} from 'vitest';
import {
  canAcceptPrefilledQuoteWithoutReview,
  checkoutPrefillDestination
} from '@/checkout/prefill';

describe('checkout prefill', () => {
  it('prefers a saved destination and preserves its state', () => {
    expect(
      checkoutPrefillDestination({
        market: 'vn',
        savedDestination: {countryCode: 'us', regionCode: 'ca'},
        quotedDestination: {countryCode: 'VN', regionCode: null}
      })
    ).toEqual({countryCode: 'US', regionCode: 'CA'});
  });

  it('falls back to the quoted destination before the market default', () => {
    expect(
      checkoutPrefillDestination({
        market: 'vn',
        quotedDestination: {countryCode: 'au', regionCode: null}
      })
    ).toEqual({countryCode: 'AU', regionCode: null});
  });

  it('defaults Vietnam market to Vietnam', () => {
    expect(checkoutPrefillDestination({market: 'vn'})).toEqual({
      countryCode: 'VN',
      regionCode: null
    });
  });

  it('does not infer a destination for the international market', () => {
    expect(checkoutPrefillDestination({market: 'intl'})).toEqual({
      countryCode: null,
      regionCode: null
    });
  });

  it('accepts initial shipping updates directly only within the same market', () => {
    expect(canAcceptPrefilledQuoteWithoutReview('vn', 'vn')).toBe(true);
    expect(canAcceptPrefilledQuoteWithoutReview('intl', 'intl')).toBe(true);
    expect(canAcceptPrefilledQuoteWithoutReview('vn', 'intl')).toBe(false);
  });
});
