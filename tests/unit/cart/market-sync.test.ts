import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MarketCode } from '@/catalog/market';
import type { CartIntentLine } from '@/cart/types';
import type { CartQuote, CartQuoteLine } from '@/checkout/types';
import type { Locale } from '@/i18n/routing';

const modulePath = '@/cart/market-sync';
const now = '2026-07-23T00:00:00.000Z';

type ChangeFact = {
  lineId: string;
  title: string;
  previous?: string | number | null;
  current?: string | number | null;
};

type GroupedChanges = {
  removed: ChangeFact[];
  unavailable: ChangeFact[];
  repriced: ChangeFact[];
  currencyChanged: ChangeFact[];
  quantityAdjusted: ChangeFact[];
};

type CartMarketSyncState = {
  status: 'idle' | 'updating' | 'ready' | 'error';
  committedMarket: MarketCode;
  contextVersion: number;
  nextRequestId: number;
  activeRequestId: number | null;
  intentLines: CartIntentLine[];
  quote: CartQuote | null;
  previousQuote: CartQuote | null;
  changes: GroupedChanges;
  issue: { code: 'market_mutation_failed' | 'requote_failed'; retryable: true } | null;
};

type MarketSyncModule = {
  beginMarketRequote: (
    state: CartMarketSyncState,
    input: {
      locale: Locale;
      committedMarket: MarketCode;
      contextVersion: number;
      lines: CartIntentLine[];
    }
  ) => {
    state: CartMarketSyncState;
    request: { requestId: number; locale: Locale; lines: CartIntentLine[] };
  };
  settleMarketRequote: (
    state: CartMarketSyncState,
    requestId: number,
    quote: CartQuote
  ) => CartMarketSyncState;
  failMarketRequote: (
    state: CartMarketSyncState,
    requestId: number,
    issue: { code: 'market_mutation_failed' | 'requote_failed'; cause?: unknown }
  ) => CartMarketSyncState;
  diffMarketCartQuotes: (previous: CartQuote, current: CartQuote) => GroupedChanges;
};

async function loadMarketSync(): Promise<MarketSyncModule> {
  return (await import(/* @vite-ignore */ modulePath)) as MarketSyncModule;
}

function intent(productId: string, overrides: Partial<CartIntentLine> = {}): CartIntentLine {
  return {
    productId,
    variantId: null,
    quantity: 1,
    marketAtAdd: 'vn',
    addedAt: now,
    updatedAt: now,
    ...overrides
  };
}

const digitalIntent = intent('10000000-0000-4000-8000-000000000001');
const physicalIntent = intent('10000000-0000-4000-8000-000000000002', {
  variantId: '20000000-0000-4000-8000-000000000001',
  quantity: 2
});
const mixedIntent = [digitalIntent, physicalIntent];

function quoteLine(lineId: string, overrides: Partial<CartQuoteLine> = {}): CartQuoteLine {
  return {
    lineId,
    productId: lineId === 'digital-line' ? digitalIntent.productId : physicalIntent.productId,
    variantId: lineId === 'digital-line' ? null : physicalIntent.variantId,
    slug: lineId === 'digital-line' ? 'bear-pattern' : 'handmade-bear',
    title: lineId === 'digital-line' ? 'Bear pattern' : 'Handmade bear',
    fulfillmentType: lineId === 'digital-line' ? 'digital' : 'physical',
    status: 'ready',
    quantity: lineId === 'digital-line' ? 1 : 2,
    requestedQuantity: lineId === 'digital-line' ? 1 : 2,
    marketAtAdd: 'vn',
    currencyCode: 'VND',
    unitPriceMinor: lineId === 'digital-line' ? 120_000 : 390_000,
    lineSubtotalMinor: lineId === 'digital-line' ? 120_000 : 780_000,
    excludedSubtotalMinor: 0,
    variantLabel: lineId === 'digital-line' ? null : 'Small / Brown',
    imageUrl: null,
    categoryIds: [],
    collectionIds: [],
    discountAllocationMinor: 0,
    change: null,
    ...overrides
  };
}

function cartQuote(
  locale: Locale,
  market: MarketCode,
  lines: CartQuoteLine[],
  overrides: Partial<CartQuote> = {}
): CartQuote {
  const currencyCode = market === 'vn' ? 'VND' : 'USD';
  const subtotalMinor = lines.reduce((total, line) => total + line.lineSubtotalMinor, 0);
  return {
    status: lines.some((line) => line.status !== 'ready')
      ? 'blocked'
      : lines.length
        ? 'ready'
        : 'empty',
    locale,
    market,
    currencyCode: lines.length ? currencyCode : null,
    lines,
    subtotalMinor,
    excludedSubtotalMinor: lines.reduce((total, line) => total + line.excludedSubtotalMinor, 0),
    discount: { status: 'not_applied', amountMinor: 0 },
    shipping: lines.some((line) => line.fulfillmentType === 'physical')
      ? { status: 'not_calculated', amountMinor: 0 }
      : { status: 'no_shipping_required', amountMinor: 0, countryCode: null },
    totalMinor: subtotalMinor,
    changes: lines.flatMap((line) => (line.change ? [line.change] : [])),
    hash: `${locale}-${market}-${lines.map((line) => line.lineId).join('-')}`,
    quotedAt: now,
    ...overrides
  };
}

const emptyVnQuote = cartQuote('vi', 'vn', []);
const digitalVnQuote = cartQuote('vi', 'vn', [quoteLine('digital-line')]);
const physicalVnQuote = cartQuote('vi', 'vn', [quoteLine('physical-line')]);
const mixedVnQuote = cartQuote('vi', 'vn', [quoteLine('digital-line'), quoteLine('physical-line')]);
const mixedIntlQuote = cartQuote(
  'vi',
  'intl',
  [
    quoteLine('digital-line', {
      marketAtAdd: 'vn',
      currencyCode: 'USD',
      unitPriceMinor: 1_000,
      lineSubtotalMinor: 1_000
    }),
    quoteLine('physical-line', {
      marketAtAdd: 'vn',
      currencyCode: 'USD',
      unitPriceMinor: 2_500,
      lineSubtotalMinor: 5_000
    })
  ],
  { hash: 'authoritative-intl-mixed' }
);

function readyState(overrides: Partial<CartMarketSyncState> = {}): CartMarketSyncState {
  return {
    status: 'ready',
    committedMarket: 'vn',
    contextVersion: 4,
    nextRequestId: 0,
    activeRequestId: null,
    intentLines: mixedIntent,
    quote: mixedVnQuote,
    previousQuote: null,
    changes: {
      removed: [],
      unavailable: [],
      repriced: [],
      currencyChanged: [],
      quantityAdjusted: []
    },
    issue: null,
    ...overrides
  };
}

describe('cart market synchronization contract', () => {
  it(
    'empty, digital, physical variant, and mixed intents start exactly one authoritative request',
    async () => {
      const sync = await loadMarketSync();
      const fixtures = [
        { name: 'empty', lines: [] as CartIntentLine[], quote: emptyVnQuote },
        { name: 'digital', lines: [digitalIntent], quote: digitalVnQuote },
        { name: 'physical variant', lines: [physicalIntent], quote: physicalVnQuote },
        { name: 'mixed', lines: mixedIntent, quote: mixedVnQuote }
      ];

      for (const fixture of fixtures) {
        const begun = sync.beginMarketRequote(
          readyState({ intentLines: fixture.lines, quote: fixture.quote }),
          {
            locale: 'vi',
            committedMarket: 'intl',
            contextVersion: 5,
            lines: fixture.lines
          }
        );

        expect(begun.request, fixture.name).toEqual({
          requestId: 1,
          locale: 'vi',
          lines: fixture.lines
        });
        expect(begun.request, fixture.name).not.toHaveProperty('market');
        expect(begun.request, fixture.name).not.toHaveProperty('contextVersion');
        expect(begun.request, fixture.name).not.toHaveProperty('quote');
        expect(begun.state, fixture.name).toMatchObject({
          status: 'updating',
          committedMarket: 'intl',
          contextVersion: 5,
          activeRequestId: 1,
          intentLines: fixture.lines,
          quote: null,
          previousQuote: fixture.quote,
          issue: null
        });
      }
    }
  );

  it('VN to INTL and INTL to VN requests increase monotonically', async () => {
    const sync = await loadMarketSync();
    const toIntl = sync.beginMarketRequote(readyState(), {
      locale: 'vi',
      committedMarket: 'intl',
      contextVersion: 5,
      lines: mixedIntent
    });
    const backToVn = sync.beginMarketRequote(toIntl.state, {
      locale: 'en',
      committedMarket: 'vn',
      contextVersion: 6,
      lines: mixedIntent
    });

    expect(toIntl.request.requestId).toBe(1);
    expect(backToVn.request.requestId).toBe(2);
    expect(backToVn.state).toMatchObject({
      status: 'updating',
      committedMarket: 'vn',
      contextVersion: 6,
      activeRequestId: 2,
      quote: null
    });
  });

  it('late success and error responses are exact no-ops', async () => {
    const sync = await loadMarketSync();
    const first = sync.beginMarketRequote(readyState(), {
      locale: 'vi',
      committedMarket: 'intl',
      contextVersion: 5,
      lines: mixedIntent
    });
    const second = sync.beginMarketRequote(first.state, {
      locale: 'vi',
      committedMarket: 'vn',
      contextVersion: 6,
      lines: mixedIntent
    });

    expect(sync.settleMarketRequote(second.state, first.request.requestId, mixedIntlQuote)).toBe(
      second.state
    );
    expect(
      sync.failMarketRequote(second.state, first.request.requestId, {
        code: 'requote_failed',
        cause: new Error('private upstream detail')
      })
    ).toBe(second.state);
  });

  it(
    'newest success atomically replaces all authoritative quote fields',
    async () => {
      const sync = await loadMarketSync();
      const begun = sync.beginMarketRequote(readyState(), {
        locale: 'vi',
        committedMarket: 'intl',
        contextVersion: 5,
        lines: mixedIntent
      });
      const settled = sync.settleMarketRequote(
        begun.state,
        begun.request.requestId,
        mixedIntlQuote
      );

      expect(settled).toMatchObject({
        status: 'ready',
        committedMarket: 'intl',
        contextVersion: 5,
        activeRequestId: null,
        intentLines: mixedIntent,
        quote: mixedIntlQuote,
        previousQuote: mixedVnQuote,
        issue: null
      });
      expect(settled.quote).toEqual(
        expect.objectContaining({
          lines: mixedIntlQuote.lines,
          currencyCode: 'USD',
          discount: mixedIntlQuote.discount,
          shipping: mixedIntlQuote.shipping,
          subtotalMinor: 6_000,
          totalMinor: 6_000
        })
      );
    }
  );

  it(
    'removed, unavailable, repriced, currency, and quantity changes are grouped facts',
    async () => {
      const sync = await loadMarketSync();
      const previous = cartQuote('en', 'intl', [
        quoteLine('digital-line', {
          currencyCode: 'USD',
          unitPriceMinor: 1_000,
          lineSubtotalMinor: 1_000
        }),
        quoteLine('physical-line', {
          currencyCode: 'USD',
          unitPriceMinor: 2_500,
          lineSubtotalMinor: 5_000
        }),
        quoteLine('removed-line', {
          productId: '10000000-0000-4000-8000-000000000003',
          title: 'Removed doll',
          currencyCode: 'USD',
          unitPriceMinor: 3_000,
          lineSubtotalMinor: 3_000
        })
      ]);
      const current = cartQuote('vi', 'vn', [
        quoteLine('digital-line', {
          status: 'unavailable',
          currencyCode: 'VND',
          unitPriceMinor: 0,
          lineSubtotalMinor: 0,
          excludedSubtotalMinor: 120_000,
          change: { type: 'unavailable' }
        }),
        quoteLine('physical-line', {
          status: 'quantity_capped',
          requestedQuantity: 2,
          quantity: 1,
          currencyCode: 'VND',
          unitPriceMinor: 420_000,
          lineSubtotalMinor: 420_000,
          excludedSubtotalMinor: 420_000,
          change: { type: 'quantity_capped', previousQuantity: 2, currentQuantity: 1 }
        })
      ]);

      const changes = sync.diffMarketCartQuotes(previous, current);

      expect(changes.removed).toEqual([
        expect.objectContaining({ lineId: 'removed-line', title: 'Removed doll' })
      ]);
      expect(changes.unavailable).toEqual([
        expect.objectContaining({ lineId: 'digital-line', title: 'Bear pattern' })
      ]);
      expect(changes.repriced).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            lineId: 'physical-line',
            previous: 2_500,
            current: 420_000
          })
        ])
      );
      expect(changes.currencyChanged).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lineId: 'digital-line', previous: 'USD', current: 'VND' }),
          expect.objectContaining({ lineId: 'physical-line', previous: 'USD', current: 'VND' })
        ])
      );
      expect(changes.quantityAdjusted).toEqual([
        expect.objectContaining({ lineId: 'physical-line', previous: 2, current: 1 })
      ]);
    }
  );

  it(
    'mutation or requote failure keeps intent, rolls back context when required, and exposes bounded retry',
    async () => {
      const sync = await loadMarketSync();
      const begun = sync.beginMarketRequote(readyState(), {
        locale: 'vi',
        committedMarket: 'intl',
        contextVersion: 5,
        lines: mixedIntent
      });

      for (const code of ['market_mutation_failed', 'requote_failed'] as const) {
        const failed = sync.failMarketRequote(begun.state, begun.request.requestId, {
          code,
          cause: new Error('unbounded provider response')
        });

        expect(failed).toMatchObject({
          status: 'error',
          committedMarket: code === 'market_mutation_failed' ? 'vn' : 'intl',
          contextVersion: code === 'market_mutation_failed' ? 4 : 5,
          activeRequestId: null,
          intentLines: mixedIntent,
          quote: null,
          previousQuote: mixedVnQuote,
          issue: { code, retryable: true }
        });
        expect(JSON.stringify(failed)).not.toContain('unbounded provider response');
        expect(failed.quote).not.toEqual(
          expect.objectContaining({ currencyCode: 'VND', totalMinor: 900_000 })
        );
      }
    }
  );
});

describe('CartProvider storefront context integration', () => {
  it('nests cart below authoritative storefront context and wires guarded requotes', () => {
    const layoutSource = readFileSync(
      join(process.cwd(), 'src/app/[locale]/layout.tsx'),
      'utf8'
    );
    const providerSource = readFileSync(
      join(process.cwd(), 'src/components/cart/cart-provider.tsx'),
      'utf8'
    );

    expect(layoutSource.indexOf('<StorefrontContextProvider')).toBeLessThan(
      layoutSource.indexOf('<CartProvider')
    );
    expect(providerSource).toContain('useStorefrontContext');
    expect(providerSource).toContain('clearCartQuoteCache');
    expect(providerSource).toContain('beginMarketRequote');
    expect(providerSource).toContain('settleMarketRequote');
    expect(providerSource).toContain('failMarketRequote');
    expect(providerSource).toMatch(
      /refreshCartQuoteAction\(\{\s*locale,\s*lines: begun\.request\.lines\s*\}\)/
    );
    expect(providerSource).not.toMatch(
      /refreshCartQuoteAction\(\{[^}]*\b(?:market|contextVersion|price|fingerprint)\b/s
    );
  });

  it('keeps cart intent visible while masking stale commerce and blocking checkout', () => {
    const cartPageSource = readFileSync(
      join(process.cwd(), 'src/components/cart/cart-page.tsx'),
      'utf8'
    );
    const miniCartSource = readFileSync(
      join(process.cwd(), 'src/components/cart/mini-cart.tsx'),
      'utf8'
    );

    for (const source of [cartPageSource, miniCartSource]) {
      expect(source).toContain('previousQuote');
      expect(source).toContain('commerceMasked={quoteUnsafe}');
      expect(source).toContain('CartChangeSummary');
      expect(source).toContain("blockReason === 'requote_failed'");
      expect(source).toContain('void retry()');
    }
  });
});
