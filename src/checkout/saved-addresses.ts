import type {Locale} from '@/i18n/routing';
import {beginQuoteRequest, type CheckoutQuoteLifecycleState} from './quote-lifecycle';
import {shippingAddressSchema, type ShippingAddress} from './shipping-address';
import type {CartQuote, QuoteCartActionInput} from './types';

export function buildSavedAddressQuoteRefreshInput({
  locale,
  acceptedQuote,
  shippingAddress
}: {
  locale: Locale;
  acceptedQuote: CartQuote | null;
  shippingAddress: ShippingAddress;
}): QuoteCartActionInput {
  const address = shippingAddressSchema.parse(shippingAddress);
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
    destinationCountryCode: address.countryCode,
    destinationRegionCode: address.region,
    shippingQuoteVersion: 2,
    discountCode:
      acceptedQuote?.discount.status === 'applied' || acceptedQuote?.discount.status === 'not_eligible'
        ? acceptedQuote.discount.code
        : null,
    priorAcceptedQuoteHash: acceptedQuote?.hash ?? null
  };
}

export function beginSavedAddressQuoteRequest({
  state,
  locale,
  shippingAddress
}: {
  state: CheckoutQuoteLifecycleState;
  locale: Locale;
  shippingAddress: ShippingAddress;
}) {
  const address = shippingAddressSchema.parse(shippingAddress);
  const transition = beginQuoteRequest(state, {
    countryCode: address.countryCode,
    regionCode: address.region
  });
  return {
    ...transition,
    shippingAddress: address,
    quoteInput: buildSavedAddressQuoteRefreshInput({
      locale,
      acceptedQuote: state.acceptedQuote,
      shippingAddress: address
    })
  };
}