import {describe, expect, it} from 'vitest';
import {diffCartQuotes, quoteCartIntent, type QuoteCatalogProduct} from '@/checkout/quote';
import type {CartIntentLine} from '@/cart/types';

const now = '2026-06-15T00:00:00.000Z';

function intent(overrides: Partial<CartIntentLine>): CartIntentLine {
  return {
    productId: '10000000-0000-4000-8000-000000000001',
    variantId: null,
    quantity: 1,
    marketAtAdd: 'vn',
    addedAt: now,
    updatedAt: now,
    ...overrides
  };
}

const pdf: QuoteCatalogProduct = {
  productId: '10000000-0000-4000-8000-000000000001',
  slug: 'bear-pattern',
  title: 'Bear pattern',
  productType: 'pdf_pattern',
  available: true,
  inStock: true,
  currencyCode: 'VND',
  priceMinor: 120000,
  imageUrl: null,
  variants: []
};

const physical: QuoteCatalogProduct = {
  productId: '10000000-0000-4000-8000-000000000002',
  slug: 'handmade-bear',
  title: 'Handmade bear',
  productType: 'physical_finished',
  available: true,
  inStock: true,
  currencyCode: 'VND',
  priceMinor: 350000,
  imageUrl: null,
  variants: [
    {
      variantId: '20000000-0000-4000-8000-000000000001',
      label: 'Small / Brown',
      sku: 'BEAR-S-BR',
      enabled: true,
      inStock: true,
      availableQuantity: 2,
      currencyCode: 'VND',
      priceMinor: 390000
    }
  ]
};

describe('cart quote hydration', () => {
  it('ignores client commercial fields and hydrates mixed lines from catalog data', async () => {
    const quote = await quoteCartIntent({
      locale: 'vi',
      market: 'vn',
      lines: [
        {...intent({productId: pdf.productId}), title: 'Client title', priceMinor: 1},
        {
          ...intent({
            productId: physical.productId,
            variantId: physical.variants[0].variantId,
            quantity: 2
          }),
          stock: 99,
          discountCode: 'CLIENT'
        }
      ],
      catalog: async () => [pdf, physical]
    });

    expect(quote.status).toBe('ready');
    expect(quote.subtotalMinor).toBe(900000);
    expect(quote.shipping).toEqual({status: 'not_calculated', amountMinor: 0});
    expect(quote.lines).toEqual([
      expect.objectContaining({
        title: 'Bear pattern',
        fulfillmentType: 'digital',
        unitPriceMinor: 120000,
        lineSubtotalMinor: 120000
      }),
      expect.objectContaining({
        title: 'Handmade bear',
        fulfillmentType: 'physical',
        variantLabel: 'Small / Brown',
        unitPriceMinor: 390000,
        lineSubtotalMinor: 780000
      })
    ]);
    expect(JSON.stringify(quote)).not.toMatch(/Client title|CLIENT|stock":99/);
  });

  it('returns line-level unavailable, invalid variant, and quantity cap changes before checkout', async () => {
    const quote = await quoteCartIntent({
      locale: 'vi',
      market: 'vn',
      lines: [
        intent({productId: '10000000-0000-4000-8000-000000000003'}),
        intent({productId: physical.productId, variantId: '20000000-0000-4000-8000-000000000099'}),
        intent({productId: physical.productId, variantId: physical.variants[0].variantId, quantity: 5})
      ],
      catalog: async () => [physical]
    });

    expect(quote.status).toBe('blocked');
    expect(quote.subtotalMinor).toBe(780000);
    expect(quote.excludedSubtotalMinor).toBe(740000);
    expect(quote.lines).toEqual([
      expect.objectContaining({status: 'unavailable', change: expect.objectContaining({type: 'unavailable'})}),
      expect.objectContaining({status: 'invalid_variant', change: expect.objectContaining({type: 'invalid_variant'})}),
      expect.objectContaining({
        status: 'quantity_capped',
        requestedQuantity: 5,
        quantity: 2,
        change: expect.objectContaining({type: 'quantity_capped', previousQuantity: 5, currentQuantity: 2})
      })
    ]);
  });

  it('diffs accepted quotes for stale price and availability changes', async () => {
    const before = await quoteCartIntent({
      locale: 'en',
      market: 'intl',
      lines: [intent({productId: pdf.productId, marketAtAdd: 'intl'})],
      catalog: async () => [{...pdf, currencyCode: 'USD', priceMinor: 1000}]
    });
    const after = await quoteCartIntent({
      locale: 'en',
      market: 'intl',
      lines: [intent({productId: pdf.productId, marketAtAdd: 'intl'})],
      catalog: async () => [{...pdf, currencyCode: 'USD', priceMinor: 1200, available: false}]
    });

    expect(diffCartQuotes(before, after)).toEqual([
      expect.objectContaining({type: 'price_changed', previousPriceMinor: 1000, currentPriceMinor: 1200}),
      expect.objectContaining({type: 'availability_changed', previousStatus: 'ready', currentStatus: 'unavailable'})
    ]);
  });
});
