import {describe, expect, it} from 'vitest';
import {mergeCartIntents} from '@/cart/merge';
import type {CartIntentLine} from '@/cart/types';

const baseTime = '2026-06-15T00:00:00.000Z';

function line(overrides: Partial<CartIntentLine>): CartIntentLine {
  return {
    productId: '10000000-0000-4000-8000-000000000001',
    variantId: null,
    quantity: 1,
    marketAtAdd: 'vn',
    addedAt: baseTime,
    updatedAt: baseTime,
    ...overrides
  };
}

describe('cart intent merge', () => {
  it('combines matching product and variant lines while preserving separate variants', () => {
    const result = mergeCartIntents({
      baseLines: [
        line({productId: '10000000-0000-4000-8000-000000000001', variantId: '20000000-0000-4000-8000-000000000001', quantity: 1}),
        line({productId: '10000000-0000-4000-8000-000000000001', variantId: '20000000-0000-4000-8000-000000000002', quantity: 2})
      ],
      incomingLines: [
        line({productId: '10000000-0000-4000-8000-000000000001', variantId: '20000000-0000-4000-8000-000000000001', quantity: 3})
      ],
      quantityCaps: {},
      now: baseTime
    });

    expect(result.lines).toEqual([
      expect.objectContaining({variantId: '20000000-0000-4000-8000-000000000001', quantity: 4}),
      expect.objectContaining({variantId: '20000000-0000-4000-8000-000000000002', quantity: 2})
    ]);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'combined_quantity',
        productId: '10000000-0000-4000-8000-000000000001',
        variantId: '20000000-0000-4000-8000-000000000001',
        previousQuantity: 1,
        requestedQuantity: 4,
        finalQuantity: 4
      })
    );
  });

  it('reports capped quantities for later server validation without dropping the line', () => {
    const result = mergeCartIntents({
      baseLines: [line({quantity: 2})],
      incomingLines: [line({quantity: 4})],
      quantityCaps: {'10000000-0000-4000-8000-000000000001': 5},
      now: baseTime
    });

    expect(result.lines).toEqual([expect.objectContaining({quantity: 5})]);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'quantity_capped',
        previousQuantity: 2,
        requestedQuantity: 6,
        finalQuantity: 5,
        cap: 5
      })
    );
  });

  it('models not-merged lines explicitly for account merge prompts', () => {
    const result = mergeCartIntents({
      baseLines: [],
      incomingLines: [line({productId: 'not-a-uuid'})],
      quantityCaps: {},
      now: baseTime
    });

    expect(result.lines).toEqual([]);
    expect(result.changes).toContainEqual(
      expect.objectContaining({
        type: 'not_merged',
        reason: 'invalid_intent'
      })
    );
  });
});
