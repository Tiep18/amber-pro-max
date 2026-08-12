import type { CartQuote } from './types';

/**
 * How long a parcel takes to arrive, by destination. There is no lead-time
 * column anywhere in the schema, so these are the shop's stated windows rather
 * than anything the shipping resolver computes — keep them here, in one place,
 * and change them here when the carriers change.
 *
 * Stated in *business* days on purpose: a weekend gap is the most common reason
 * a delivery promise reads as broken when it was not.
 */
export type DeliveryEstimate = {
  minBusinessDays: number;
  maxBusinessDays: number;
};

export const VIETNAM_DELIVERY_ESTIMATE: DeliveryEstimate = {
  minBusinessDays: 2,
  maxBusinessDays: 5
};

export const INTERNATIONAL_DELIVERY_ESTIMATE: DeliveryEstimate = {
  minBusinessDays: 7,
  maxBusinessDays: 14
};

export function deliveryEstimateForCountry(
  countryCode: string | null | undefined
): DeliveryEstimate | null {
  const normalized = countryCode?.trim().toUpperCase() ?? '';
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }
  return normalized === 'VN' ? VIETNAM_DELIVERY_ESTIMATE : INTERNATIONAL_DELIVERY_ESTIMATE;
}

/**
 * Only promised once shipping has actually resolved for the destination. A
 * quote that is still `not_calculated` has no country to promise against, and
 * an `unsupported_destination` one is not going to be delivered at all.
 */
export function deliveryEstimateForQuote(quote: CartQuote | null): DeliveryEstimate | null {
  if (!quote || quote.shipping.status !== 'ready') {
    return null;
  }
  const hasPhysical = quote.lines.some(
    (line) => line.fulfillmentType === 'physical' && line.quantity > 0
  );
  if (!hasPhysical) {
    return null;
  }
  return deliveryEstimateForCountry(quote.shipping.countryCode);
}
