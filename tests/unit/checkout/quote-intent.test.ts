import {describe, expect, test} from 'vitest';
import {quoteIntentLines} from '@/checkout/quote-intent';
import type {CartQuote} from '@/checkout/types';

describe('checkout quote intent', () => {
  test('uses the accepted quote quantities and market evidence for submit', () => {
    const quote = {
      quotedAt: '2026-07-27T06:00:00.000Z',
      lines: [
        {
          productId: '10000000-0000-4000-8000-000000000001',
          variantId: null,
          requestedQuantity: 3,
          marketAtAdd: 'vn'
        },
        {
          productId: '10000000-0000-4000-8000-000000000002',
          variantId: '20000000-0000-4000-8000-000000000002',
          requestedQuantity: 2,
          marketAtAdd: 'intl'
        }
      ]
    } as Pick<CartQuote, 'lines' | 'quotedAt'>;

    expect(quoteIntentLines(quote)).toEqual([
      {
        productId: '10000000-0000-4000-8000-000000000001',
        variantId: null,
        quantity: 3,
        marketAtAdd: 'vn',
        addedAt: quote.quotedAt,
        updatedAt: quote.quotedAt
      },
      {
        productId: '10000000-0000-4000-8000-000000000002',
        variantId: '20000000-0000-4000-8000-000000000002',
        quantity: 2,
        marketAtAdd: 'intl',
        addedAt: quote.quotedAt,
        updatedAt: quote.quotedAt
      }
    ]);
  });
});
