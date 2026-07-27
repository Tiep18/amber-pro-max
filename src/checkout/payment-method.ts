import type {CheckoutPaymentIntent} from './schemas';

export function checkoutPaymentIntentFor(
  market: unknown,
  currencyCode: unknown
): CheckoutPaymentIntent | null {
  if (market === 'vn' && currencyCode === 'VND') {
    return 'vietqr_intent';
  }
  if (market === 'intl' && currencyCode === 'USD') {
    return 'paypal_intent';
  }
  return null;
}

export function checkoutPaymentIntentForQuote(quote: unknown): CheckoutPaymentIntent | null {
  if (!quote || typeof quote !== 'object' || Array.isArray(quote)) {
    return null;
  }
  const candidate = quote as {market?: unknown; currencyCode?: unknown};
  return checkoutPaymentIntentFor(candidate.market, candidate.currencyCode);
}
