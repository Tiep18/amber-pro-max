import type {Locale} from '@/i18n/routing';
import type {ShippingAddress} from './shipping-address';
import type {CartQuote} from './types';

export function buildSavedAddressQuoteRefreshInput({
  locale,
  acceptedQuote,
  shippingAddress
}: {
  locale: Locale;
  acceptedQuote: CartQuote | null;
  shippingAddress: ShippingAddress;
}) {
  return {
    locale,
    market: acceptedQuote?.market ?? (locale === 'vi' ? 'vn' : 'intl'),
    lines:
      acceptedQuote?.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.requestedQuantity,
        marketAtAdd: line.marketAtAdd,
        addedAt: acceptedQuote.quotedAt,
        updatedAt: acceptedQuote.quotedAt
      })) ?? [],
    destinationCountryCode: shippingAddress.countryCode,
    acceptedQuote
  };
}
