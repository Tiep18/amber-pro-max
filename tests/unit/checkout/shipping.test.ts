import {describe, expect, test} from 'vitest';
import {calculateShippingQuote, selectChargeablePhysicalUnits, type ShippingQuoteLine} from '@/checkout/shipping';

const baseLine = {
  currencyCode: 'USD',
  productId: 'product-a',
  quantity: 1,
  shippingProfileId: 'profile-a',
  variantId: null
} satisfies Omit<ShippingQuoteLine, 'fulfillmentType' | 'lineId' | 'rule'>;

function physicalLine(input: Partial<ShippingQuoteLine> & Pick<ShippingQuoteLine, 'lineId' | 'rule'>): ShippingQuoteLine {
  return {
    ...baseLine,
    fulfillmentType: 'physical',
    ...input
  };
}

describe('selectChargeablePhysicalUnits', () => {
  test('excludes digital and free-shipping units from shipping charges', () => {
    const lines: ShippingQuoteLine[] = [
      {
        ...baseLine,
        fulfillmentType: 'digital',
        lineId: 'digital-pattern',
        quantity: 10,
        rule: {additionalItemFeeMinor: 200, countryCode: 'US', firstItemFeeMinor: 500}
      },
      physicalLine({
        lineId: 'free-physical',
        rule: {additionalItemFeeMinor: 0, countryCode: 'US', firstItemFeeMinor: 0}
      }),
      physicalLine({
        lineId: 'paid-physical',
        rule: {additionalItemFeeMinor: 100, countryCode: 'US', firstItemFeeMinor: 400}
      })
    ];

    expect(selectChargeablePhysicalUnits(lines).map((unit) => unit.lineId)).toEqual(['paid-physical']);
  });
});

describe('calculateShippingQuote', () => {
  test('uses the highest first-item fee once and each remaining unit additional fee', () => {
    const quote = calculateShippingQuote({
      countryCode: 'US',
      currencyCode: 'USD',
      lines: [
        physicalLine({
          lineId: 'lower-first-two-units',
          quantity: 2,
          rule: {additionalItemFeeMinor: 125, countryCode: 'US', firstItemFeeMinor: 500}
        }),
        physicalLine({
          lineId: 'highest-first-one-unit',
          rule: {additionalItemFeeMinor: 300, countryCode: 'US', firstItemFeeMinor: 900}
        })
      ]
    });

    expect(quote).toMatchObject({
      status: 'ready',
      amountMinor: 1150,
      currencyCode: 'USD',
      countryCode: 'US'
    });
  });

  test('is independent of cart insertion order when fees tie', () => {
    const first = physicalLine({
      lineId: 'alpha',
      productId: 'product-alpha',
      rule: {additionalItemFeeMinor: 225, countryCode: 'US', firstItemFeeMinor: 700}
    });
    const second = physicalLine({
      lineId: 'beta',
      productId: 'product-beta',
      rule: {additionalItemFeeMinor: 175, countryCode: 'US', firstItemFeeMinor: 700}
    });

    const original = calculateShippingQuote({countryCode: 'US', currencyCode: 'USD', lines: [first, second]});
    const reversed = calculateShippingQuote({countryCode: 'US', currencyCode: 'USD', lines: [second, first]});

    expect(original).toEqual(reversed);
    expect(original).toMatchObject({amountMinor: 875, firstItemLineId: 'alpha'});
  });

  test('preserves highest-first-once totals for mixed profiles, quantities, and free shipping', () => {
    const quote = calculateShippingQuote({
      countryCode: 'US',
      currencyCode: 'USD',
      lines: [
        physicalLine({
          lineId: 'profile-a-two-units',
          quantity: 2,
          rule: {additionalItemFeeMinor: 100, countryCode: 'US', firstItemFeeMinor: 500}
        }),
        physicalLine({
          lineId: 'profile-b-three-units',
          quantity: 3,
          shippingProfileId: 'profile-b',
          rule: {additionalItemFeeMinor: 250, countryCode: 'US', firstItemFeeMinor: 900}
        }),
        physicalLine({
          lineId: 'free-line',
          quantity: 4,
          rule: {additionalItemFeeMinor: 0, countryCode: 'US', firstItemFeeMinor: 0}
        })
      ]
    });

    expect(quote).toMatchObject({
      status: 'ready',
      amountMinor: 1600,
      chargeableUnitCount: 5,
      firstItemLineId: 'profile-b-three-units'
    });
  });

  test('blocks unsupported destinations without returning a placeholder amount', () => {
    const quote = calculateShippingQuote({
      countryCode: 'CA',
      currencyCode: 'USD',
      lines: [
        physicalLine({
          lineId: 'physical-us-only',
          rule: {additionalItemFeeMinor: 100, countryCode: 'US', firstItemFeeMinor: 500}
        })
      ]
    });

    expect(quote).toEqual({
      status: 'unsupported_destination',
      amountMinor: null,
      countryCode: 'CA',
      currencyCode: 'USD',
      unsupportedLineIds: ['physical-us-only']
    });
  });

  test('returns no_shipping_required for digital-only carts', () => {
    const quote = calculateShippingQuote({
      countryCode: 'US',
      currencyCode: 'USD',
      lines: [
        {
          ...baseLine,
          fulfillmentType: 'digital',
          lineId: 'pattern',
          rule: null
        }
      ]
    });

    expect(quote).toMatchObject({status: 'no_shipping_required', amountMinor: 0});
  });
});
