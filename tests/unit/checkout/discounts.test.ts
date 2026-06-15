import {describe, expect, test} from 'vitest';
import {allocateDiscount, validateDiscountCode, type DiscountRule, type DiscountQuoteLine} from '@/checkout/discounts';

const now = new Date('2026-06-15T00:00:00.000Z');

function line(overrides: Partial<DiscountQuoteLine>): DiscountQuoteLine {
  return {
    lineId: 'line-a',
    productId: 'product-a',
    variantId: null,
    categoryIds: [],
    collectionIds: [],
    fulfillmentType: 'physical',
    quantity: 1,
    currencyCode: 'USD',
    lineSubtotalMinor: 1000,
    ...overrides
  };
}

const percentRule: DiscountRule = {
  id: 'discount-percent',
  code: 'MIXED10',
  discountType: 'percentage',
  percentageBps: 1000,
  amountMinor: null,
  currencyCode: null,
  market: 'intl',
  startsAt: '2026-06-01T00:00:00.000Z',
  endsAt: '2026-07-01T00:00:00.000Z',
  active: true,
  usageLimit: 10,
  usedCount: 0,
  minimumSubtotalMinor: 0,
  eligibleCustomerIds: [],
  eligibleProductIds: [],
  eligibleCategoryIds: [],
  eligibleCollectionIds: []
};

describe('allocateDiscount', () => {
  test('allocates percentage discounts with deterministic integer remainder handling', () => {
    const allocation = allocateDiscount({
      rule: percentRule,
      currencyCode: 'USD',
      lines: [
        line({lineId: 'line-a', lineSubtotalMinor: 333}),
        line({lineId: 'line-b', productId: 'product-b', lineSubtotalMinor: 333}),
        line({lineId: 'line-c', productId: 'product-c', lineSubtotalMinor: 334})
      ]
    });

    expect(allocation).toEqual({
      status: 'applied',
      discountMinor: 100,
      allocations: [
        {lineId: 'line-a', amountMinor: 33},
        {lineId: 'line-b', amountMinor: 33},
        {lineId: 'line-c', amountMinor: 34}
      ]
    });
  });

  test('caps fixed discounts at eligible subtotal and ignores ineligible lines', () => {
    const allocation = allocateDiscount({
      rule: {
        ...percentRule,
        discountType: 'fixed',
        percentageBps: null,
        amountMinor: 2500,
        currencyCode: 'USD',
        eligibleProductIds: ['product-a']
      },
      currencyCode: 'USD',
      lines: [line({lineId: 'line-a', productId: 'product-a', lineSubtotalMinor: 1200}), line({lineId: 'line-b', productId: 'product-b', lineSubtotalMinor: 800})]
    });

    expect(allocation).toEqual({
      status: 'applied',
      discountMinor: 1200,
      allocations: [{lineId: 'line-a', amountMinor: 1200}]
    });
  });
});

describe('validateDiscountCode', () => {
  test('rejects exhausted, wrong-market, and guest customer-targeted codes safely', () => {
    expect(validateDiscountCode({...percentRule, usedCount: 10}, {code: 'mixed10', market: 'intl', currencyCode: 'USD', subtotalMinor: 1000, now, userId: null, lines: []})).toMatchObject({
      status: 'not_eligible',
      reason: 'usage_exhausted'
    });
    expect(validateDiscountCode(percentRule, {code: 'mixed10', market: 'vn', currencyCode: 'VND', subtotalMinor: 1000, now, userId: null, lines: []})).toMatchObject({
      status: 'not_eligible',
      reason: 'wrong_market'
    });
    expect(validateDiscountCode({...percentRule, eligibleCustomerIds: ['user-a']}, {code: 'mixed10', market: 'intl', currencyCode: 'USD', subtotalMinor: 1000, now, userId: null, lines: []})).toMatchObject({
      status: 'not_eligible',
      reason: 'customer_required'
    });
  });
});
