import { describe, expect, it } from 'vitest';
import {
  deliveryEstimateForCountry,
  deliveryEstimateForQuote,
  INTERNATIONAL_DELIVERY_ESTIMATE,
  VIETNAM_DELIVERY_ESTIMATE
} from '@/checkout/delivery-estimate';
import type { CartQuote } from '@/checkout/types';

function quote(overrides: Partial<CartQuote> = {}): CartQuote {
  return {
    status: 'ready',
    locale: 'en',
    market: 'intl',
    currencyCode: 'USD',
    lines: [
      {
        lineId: 'line-1',
        productId: '10000000-0000-4000-8000-000000000001',
        variantId: null,
        slug: 'bear',
        title: 'Bear',
        fulfillmentType: 'physical',
        status: 'ready',
        quantity: 1,
        requestedQuantity: 1,
        marketAtAdd: 'intl',
        currencyCode: 'USD',
        unitPriceMinor: 3000,
        lineSubtotalMinor: 3000,
        excludedSubtotalMinor: 0,
        variantLabel: null,
        imageUrl: null,
        categoryIds: [],
        collectionIds: [],
        discountAllocationMinor: 0,
        change: null
      }
    ],
    subtotalMinor: 3000,
    excludedSubtotalMinor: 0,
    discount: { status: 'not_applied', amountMinor: 0 },
    shipping: {
      status: 'ready',
      version: 2,
      amountMinor: 750,
      countryCode: 'US',
      regionCode: null,
      firstItemLineId: 'line-1',
      chargeableUnitCount: 1,
      allocations: []
    },
    totalMinor: 3750,
    changes: [],
    hash: 'quote-a',
    quotedAt: '2026-07-12T00:00:00.000Z',
    ...overrides
  };
}

describe('deliveryEstimateForCountry', () => {
  it('separates the Vietnam window from every other destination', () => {
    expect(deliveryEstimateForCountry('VN')).toEqual(VIETNAM_DELIVERY_ESTIMATE);
    expect(deliveryEstimateForCountry('vn')).toEqual(VIETNAM_DELIVERY_ESTIMATE);
    expect(deliveryEstimateForCountry('US')).toEqual(INTERNATIONAL_DELIVERY_ESTIMATE);
    expect(deliveryEstimateForCountry('AU')).toEqual(INTERNATIONAL_DELIVERY_ESTIMATE);
  });

  it('promises nothing without a real country code', () => {
    expect(deliveryEstimateForCountry(null)).toBeNull();
    expect(deliveryEstimateForCountry(undefined)).toBeNull();
    expect(deliveryEstimateForCountry('')).toBeNull();
    expect(deliveryEstimateForCountry('USA')).toBeNull();
    expect(deliveryEstimateForCountry('1')).toBeNull();
  });

  it('states both windows in ascending, non-zero business days', () => {
    for (const estimate of [VIETNAM_DELIVERY_ESTIMATE, INTERNATIONAL_DELIVERY_ESTIMATE]) {
      expect(estimate.minBusinessDays).toBeGreaterThan(0);
      expect(estimate.maxBusinessDays).toBeGreaterThan(estimate.minBusinessDays);
    }
  });
});

describe('deliveryEstimateForQuote', () => {
  it('promises a window once shipping has resolved for the destination', () => {
    expect(deliveryEstimateForQuote(quote())).toEqual(INTERNATIONAL_DELIVERY_ESTIMATE);
    expect(
      deliveryEstimateForQuote(
        quote({
          market: 'vn',
          currencyCode: 'VND',
          shipping: {
            status: 'ready',
            version: 2,
            amountMinor: 30000,
            countryCode: 'VN',
            regionCode: null,
            firstItemLineId: 'line-1',
            chargeableUnitCount: 1,
            allocations: []
          }
        })
      )
    ).toEqual(VIETNAM_DELIVERY_ESTIMATE);
  });

  it('promises nothing before shipping resolves, or when it cannot be delivered', () => {
    expect(deliveryEstimateForQuote(null)).toBeNull();
    expect(
      deliveryEstimateForQuote(quote({ shipping: { status: 'not_calculated', amountMinor: 0 } }))
    ).toBeNull();
    expect(
      deliveryEstimateForQuote(
        quote({
          shipping: {
            status: 'unsupported_destination',
            version: 2,
            amountMinor: null,
            countryCode: 'AQ',
            regionCode: null,
            unsupportedLineIds: ['line-1']
          }
        })
      )
    ).toBeNull();
  });

  it('promises nothing for a cart with nothing to deliver', () => {
    const digital = quote({
      lines: [{ ...quote().lines[0], fulfillmentType: 'digital' }],
      shipping: { status: 'no_shipping_required', amountMinor: 0, countryCode: null }
    });
    expect(deliveryEstimateForQuote(digital)).toBeNull();

    const removedPhysical = quote({
      lines: [{ ...quote().lines[0], quantity: 0, status: 'unavailable' }]
    });
    expect(deliveryEstimateForQuote(removedPhysical)).toBeNull();
  });
});
