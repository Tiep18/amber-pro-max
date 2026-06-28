import { describe, expect, it } from 'vitest';
import { cartLinesFingerprint, readCartQuoteCache, writeCartQuoteCache } from '@/cart/quote-cache';
import type { CartIntentLine } from '@/cart/types';
import type { CartQuote } from '@/checkout/types';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}

const lines: CartIntentLine[] = [
  {
    productId: '10000000-0000-4000-8000-000000000001',
    variantId: null,
    quantity: 2,
    marketAtAdd: 'vn',
    addedAt: '2026-06-15T00:00:00.000Z',
    updatedAt: '2026-06-15T00:00:00.000Z'
  }
];

const quote = {
  status: 'empty',
  locale: 'vi',
  market: 'vn',
  currencyCode: null,
  lines: [],
  subtotalMinor: 0,
  excludedSubtotalMinor: 0,
  discount: { status: 'not_applied', amountMinor: 0 },
  shipping: { status: 'not_calculated', amountMinor: 0 },
  totalMinor: 0,
  changes: [],
  hash: 'quote-hash',
  quotedAt: '2026-06-15T00:00:00.000Z'
} satisfies CartQuote;

describe('cart quote cache', () => {
  it('uses a stable fingerprint for commercial line inputs', () => {
    expect(cartLinesFingerprint(lines)).toBe(cartLinesFingerprint([{ ...lines[0] }]));
    expect(cartLinesFingerprint([{ ...lines[0], quantity: 3 }])).not.toBe(
      cartLinesFingerprint(lines)
    );
  });

  it('returns only a fresh quote matching locale and cart lines', () => {
    const storage = memoryStorage();
    writeCartQuoteCache({ locale: 'vi', lines, quote, storage, now: 1_000 });

    expect(readCartQuoteCache({ locale: 'vi', lines, storage, now: 60_000 })).toEqual(quote);
    expect(readCartQuoteCache({ locale: 'en', lines, storage, now: 60_000 })).toBeNull();
    expect(
      readCartQuoteCache({
        locale: 'vi',
        lines: [{ ...lines[0], quantity: 3 }],
        storage,
        now: 60_000
      })
    ).toBeNull();
    expect(readCartQuoteCache({ locale: 'vi', lines, storage, now: 301_001 })).toBeNull();
  });

  it('fails closed for malformed storage', () => {
    const storage = memoryStorage();
    storage.setItem('amigurumi.cartQuote.v1', '{bad json');
    expect(readCartQuoteCache({ locale: 'vi', lines, storage, now: 1_000 })).toBeNull();
  });
});
