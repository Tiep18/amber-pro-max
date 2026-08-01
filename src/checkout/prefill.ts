import type {MarketCode} from '@/catalog/market';

export type CheckoutPrefillDestination = {
  countryCode: string | null;
  regionCode: string | null;
};

export type CheckoutQuoteChangeSource = 'prefill' | 'destination' | 'upstream' | 'submit' | 'discount';

function normalizeCode(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim().toUpperCase() ?? '';
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function checkoutPrefillDestination({
  market,
  savedDestination,
  quotedDestination
}: {
  market: MarketCode;
  savedDestination?: CheckoutPrefillDestination | null;
  quotedDestination?: CheckoutPrefillDestination | null;
}): CheckoutPrefillDestination {
  const savedCountry = normalizeCode(savedDestination?.countryCode, 2);
  if (savedCountry) {
    return {
      countryCode: savedCountry,
      regionCode: normalizeCode(savedDestination?.regionCode, 3)
    };
  }

  const quotedCountry = normalizeCode(quotedDestination?.countryCode, 2);
  if (quotedCountry) {
    return {
      countryCode: quotedCountry,
      regionCode: normalizeCode(quotedDestination?.regionCode, 3)
    };
  }

  return market === 'vn'
    ? {countryCode: 'VN', regionCode: null}
    : {countryCode: null, regionCode: null};
}

export function shouldReviewCheckoutQuoteChange(source: CheckoutQuoteChangeSource) {
  return source !== 'prefill';
}
