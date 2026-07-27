import { describe, expect, it } from 'vitest';
import { subtractCompletedOrderLines, type CompletedOrderLine } from '@/cart/order-completion';
import type { CartIntentLine } from '@/cart/types';

const addedAt = '2026-07-27T00:00:00.000Z';
const completedAt = '2026-07-27T00:10:00.000Z';

function line(overrides: Partial<CartIntentLine> = {}): CartIntentLine {
  return {
    productId: '10000000-0000-4000-8000-000000000001',
    variantId: null,
    quantity: 1,
    marketAtAdd: 'vn',
    addedAt,
    updatedAt: addedAt,
    ...overrides
  };
}

function completedLine(overrides: Partial<CompletedOrderLine> = {}): CompletedOrderLine {
  return {
    productId: '10000000-0000-4000-8000-000000000001',
    variantId: null,
    quantity: 1,
    ...overrides
  };
}

describe('completed order cart reconciliation', () => {
  it('removes an exact ordered line and preserves unrelated lines', () => {
    const unrelated = line({
      productId: '10000000-0000-4000-8000-000000000002',
      quantity: 3
    });

    expect(
      subtractCompletedOrderLines({
        currentLines: [line(), unrelated],
        completedLines: [completedLine()],
        updatedAt: completedAt
      })
    ).toEqual([unrelated]);
  });

  it('preserves the surplus that was capped out of the order', () => {
    expect(
      subtractCompletedOrderLines({
        currentLines: [line({ quantity: 2 })],
        completedLines: [completedLine({ quantity: 1 })],
        updatedAt: completedAt
      })
    ).toEqual([
      expect.objectContaining({
        quantity: 1,
        addedAt,
        updatedAt: completedAt
      })
    ]);
  });

  it('preserves quantities added in another tab after checkout started', () => {
    expect(
      subtractCompletedOrderLines({
        currentLines: [line({ quantity: 4 })],
        completedLines: [completedLine({ quantity: 2 })],
        updatedAt: completedAt
      })
    ).toEqual([expect.objectContaining({ quantity: 2, updatedAt: completedAt })]);
  });

  it('aggregates duplicate completed lines before subtraction', () => {
    expect(
      subtractCompletedOrderLines({
        currentLines: [line({ quantity: 5 })],
        completedLines: [completedLine({ quantity: 1 }), completedLine({ quantity: 2 })],
        updatedAt: completedAt
      })
    ).toEqual([expect.objectContaining({ quantity: 2 })]);
  });

  it('ignores invalid and non-matching completion evidence', () => {
    const current = line({ quantity: 2 });

    expect(
      subtractCompletedOrderLines({
        currentLines: [current],
        completedLines: [
          completedLine({ quantity: 0 }),
          completedLine({
            productId: '10000000-0000-4000-8000-000000000002',
            quantity: 1
          })
        ],
        updatedAt: completedAt
      })
    ).toEqual([current]);
  });
});
