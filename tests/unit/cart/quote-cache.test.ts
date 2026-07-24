import { describe, expect, it } from 'vitest';
import * as quoteCacheModule from '@/cart/quote-cache';
import type { MarketCode } from '@/catalog/market';
import type { CartIntentLine } from '@/cart/types';
import type { CartQuote } from '@/checkout/types';
import type { Locale } from '@/i18n/routing';

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

function emptyQuote(locale: Locale = 'vi', market: MarketCode = 'vn'): CartQuote {
  return {
    status: 'empty',
    locale,
    market,
    currencyCode: null,
    lines: [],
    subtotalMinor: 0,
    excludedSubtotalMinor: 0,
    discount: { status: 'not_applied', amountMinor: 0 },
    shipping: { status: 'not_calculated', amountMinor: 0 },
    totalMinor: 0,
    changes: [],
    hash: `quote-${locale}-${market}`,
    quotedAt: '2026-06-15T00:00:00.000Z'
  };
}

type CacheIdentity = {
  locale: Locale;
  market: MarketCode;
  contextVersion: number;
  lines: CartIntentLine[];
  storage?: Storage | null;
  now?: number;
};

type MarketAwareQuoteCache = {
  cartLinesFingerprint: typeof quoteCacheModule.cartLinesFingerprint;
  readCartQuoteCache: (options: CacheIdentity) => CartQuote | null;
  writeCartQuoteCache: (options: CacheIdentity & { quote: CartQuote }) => void;
  clearCartQuoteCache: (storage?: Storage | null) => void;
};

const marketAwareCache = quoteCacheModule as unknown as MarketAwareQuoteCache;

describe('cart quote cache', () => {
  it('uses a stable fingerprint for commercial line inputs', () => {
    expect(marketAwareCache.cartLinesFingerprint(lines)).toBe(
      marketAwareCache.cartLinesFingerprint([{ ...lines[0] }])
    );
    expect(marketAwareCache.cartLinesFingerprint([{ ...lines[0], quantity: 3 }])).not.toBe(
      marketAwareCache.cartLinesFingerprint(lines)
    );
  });

  it(
    'reads only an exact locale, market, context-version, line, TTL, and quote-market match',
    () => {
      const storage = memoryStorage();
      const identity = {
        locale: 'vi',
        market: 'vn',
        contextVersion: 7,
        lines,
        storage
      } as const;
      const quote = emptyQuote();
      marketAwareCache.writeCartQuoteCache({ ...identity, quote, now: 1_000 });

      expect(marketAwareCache.readCartQuoteCache({ ...identity, now: 60_000 })).toEqual(quote);
      expect(
        marketAwareCache.readCartQuoteCache({ ...identity, locale: 'en', now: 60_000 })
      ).toBeNull();
      expect(
        marketAwareCache.readCartQuoteCache({ ...identity, market: 'intl', now: 60_000 })
      ).toBeNull();
      expect(
        marketAwareCache.readCartQuoteCache({ ...identity, contextVersion: 8, now: 60_000 })
      ).toBeNull();
      expect(
        marketAwareCache.readCartQuoteCache({
          ...identity,
          lines: [{ ...lines[0], quantity: 3 }],
          now: 60_000
        })
      ).toBeNull();
      expect(marketAwareCache.readCartQuoteCache({ ...identity, now: 301_001 })).toBeNull();
    }
  );

  it('rejects an authoritative quote whose market mismatches identity', () => {
    const storage = memoryStorage();
    const identity = {
      locale: 'vi',
      market: 'vn',
      contextVersion: 7,
      lines,
      storage
    } as const;

    marketAwareCache.writeCartQuoteCache({
      ...identity,
      quote: emptyQuote('vi', 'intl'),
      now: 1_000
    });

    expect(marketAwareCache.readCartQuoteCache({ ...identity, now: 2_000 })).toBeNull();
  });

  it('rejects legacy v1 payloads without migration', () => {
    const storage = memoryStorage();
    storage.setItem(
      'amigurumi.cartQuote.v1',
      JSON.stringify({
        locale: 'vi',
        fingerprint: marketAwareCache.cartLinesFingerprint(lines),
        validatedAt: 1_000,
        quote: emptyQuote()
      })
    );

    expect(
      marketAwareCache.readCartQuoteCache({
        locale: 'vi',
        market: 'vn',
        contextVersion: 7,
        lines,
        storage,
        now: 2_000
      })
    ).toBeNull();
  });

  it('clears the current cache without exposing stored payloads', () => {
    const storage = memoryStorage();
    const identity = {
      locale: 'vi',
      market: 'vn',
      contextVersion: 7,
      lines,
      storage
    } as const;
    marketAwareCache.writeCartQuoteCache({ ...identity, quote: emptyQuote(), now: 1_000 });

    marketAwareCache.clearCartQuoteCache(storage);

    expect(marketAwareCache.readCartQuoteCache({ ...identity, now: 2_000 })).toBeNull();
  });

  it('fails closed for malformed storage', () => {
    const storage = memoryStorage();
    storage.setItem('amigurumi.cartQuote.v1', '{bad json');
    expect(
      marketAwareCache.readCartQuoteCache({
        locale: 'vi',
        market: 'vn',
        contextVersion: 7,
        lines,
        storage,
        now: 1_000
      })
    ).toBeNull();
  });
});
