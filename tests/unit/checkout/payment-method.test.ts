import {describe, expect, test} from 'vitest';
import {
  checkoutPaymentIntentFor,
  checkoutPaymentIntentForQuote
} from '@/checkout/payment-method';

describe('checkout payment method', () => {
  test.each([
    ['vn', 'VND', 'vietqr_intent'],
    ['intl', 'USD', 'paypal_intent']
  ] as const)('derives %s + %s as %s', (market, currencyCode, expected) => {
    expect(checkoutPaymentIntentFor(market, currencyCode)).toBe(expected);
    expect(checkoutPaymentIntentForQuote({market, currencyCode})).toBe(expected);
  });

  test.each([
    ['vn', 'USD'],
    ['intl', 'VND'],
    ['vn', null],
    [null, 'VND'],
    ['unknown', 'USD']
  ])('fails closed for invalid pair %s + %s', (market, currencyCode) => {
    expect(checkoutPaymentIntentFor(market, currencyCode)).toBeNull();
  });

  test.each([null, undefined, [], 'vn', {market: 'vn'}, {currencyCode: 'VND'}])(
    'fails closed for malformed quote %#',
    (quote) => {
      expect(checkoutPaymentIntentForQuote(quote)).toBeNull();
    }
  );
});
