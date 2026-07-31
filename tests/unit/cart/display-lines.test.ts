import { describe, expect, it } from 'vitest';
import type { CartIntentLine } from '@/cart/types';
import type { CartQuote, CartQuoteLine } from '@/checkout/types';
import { selectCartDisplayLines } from '@/cart/display-lines';

const now = '2026-07-31T00:00:00.000Z';
const productId = '10000000-0000-4000-8000-000000000001';

function intent(): CartIntentLine {
  return {
    productId,
    variantId: null,
    quantity: 1,
    marketAtAdd: 'intl',
    addedAt: now,
    updatedAt: now
  };
}

function quoteLine(): CartQuoteLine {
  return {
    lineId: `${productId}:product`,
    productId,
    variantId: null,
    slug: 'garden-snail-pdf-pattern',
    title: 'Garden Snail PDF Pattern',
    fulfillmentType: 'digital',
    status: 'ready',
    quantity: 1,
    requestedQuantity: 1,
    marketAtAdd: 'intl',
    currencyCode: 'USD',
    unitPriceMinor: 650,
    lineSubtotalMinor: 650,
    excludedSubtotalMinor: 0,
    variantLabel: null,
    imageUrl: null,
    categoryIds: [],
    collectionIds: [],
    discountAllocationMinor: 0,
    change: null
  };
}

function quote(lines: CartQuoteLine[]): CartQuote {
  return {
    status: lines.length ? 'ready' : 'empty',
    locale: 'en',
    market: 'intl',
    currencyCode: lines.length ? 'USD' : null,
    lines,
    subtotalMinor: lines.reduce((total, line) => total + line.lineSubtotalMinor, 0),
    excludedSubtotalMinor: 0,
    discount: { status: 'not_applied', amountMinor: 0 },
    shipping: { status: 'no_shipping_required', amountMinor: 0, countryCode: null },
    totalMinor: lines.reduce((total, line) => total + line.lineSubtotalMinor, 0),
    changes: [],
    quotedAt: now,
    hash: lines.length ? 'one-line' : 'empty'
  };
}

describe('selectCartDisplayLines', () => {
  const line = quoteLine();
  const previousQuote = quote([line]);
  const removedLineIds = new Set([line.lineId]);

  it('hides a user-removed line immediately while requote is pending', () => {
    expect(
      selectCartDisplayLines({
        quote: null,
        previousQuote,
        intentLines: [],
        removedLineIds,
        usePreviousQuoteFallback: true
      })
    ).toEqual([]);
  });

  it('does not restore a user-removed line after the empty quote settles', () => {
    expect(
      selectCartDisplayLines({
        quote: quote([]),
        previousQuote,
        intentLines: [],
        removedLineIds,
        usePreviousQuoteFallback: false
      })
    ).toEqual([]);
  });

  it('keeps a market-removed line visible when its cart intent still exists', () => {
    expect(
      selectCartDisplayLines({
        quote: quote([]),
        previousQuote,
        intentLines: [intent()],
        removedLineIds,
        usePreviousQuoteFallback: false
      })
    ).toEqual([line]);
  });
});
