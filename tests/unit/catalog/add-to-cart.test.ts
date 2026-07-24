import {describe, expect, it} from 'vitest';
import {canAddToCart} from '@/catalog/add-to-cart-eligibility';
import {
  createAddToCartIntent,
  shouldResetVariantSelection
} from '@/components/catalog/add-to-cart';

const projection = {
  productId: '11111111-1111-4111-8111-111111111111',
  slug: 'linen-doll',
  locale: 'en',
  market: 'intl',
  productType: 'physical_finished',
  priceMinor: 2_400,
  currencyCode: 'USD',
  available: true,
  inStock: true,
  otherMarket: {market: 'vn', available: true},
  variants: [
    {
      variantId: '22222222-2222-4222-8222-222222222222',
      sku: 'DOLL-BLUE',
      enabled: true,
      stock: 1,
      priceMinor: 3_100,
      currencyCode: 'USD',
      priceSource: 'variant'
    }
  ],
  offerFingerprint: 'current-fingerprint',
  generation: 7,
  contextVersion: 4
} as const;

const readyAgreement = {
  contextStatus: 'ready',
  contextMarket: 'intl',
  contextGeneration: 7,
  contextVersion: 4,
  locale: 'en'
} as const;

describe('catalog add-to-cart availability', () => {
  it('blocks physical products without variants when product inventory is unavailable', () => {
    expect(
      canAddToCart({
        available: true,
        productType: 'physical_finished',
        inStock: false,
        needsVariant: false,
        selectedVariant: null
      })
    ).toBe(false);
  });

  it('allows market-available digital products without inventory checks', () => {
    expect(
      canAddToCart({
        available: true,
        productType: 'pdf_pattern',
        inStock: false,
        needsVariant: false,
        selectedVariant: null
      })
    ).toBe(true);
  });

  it('creates an intent-only cart payload from exact ready agreement', () => {
    const intent = createAddToCartIntent({
      agreement: readyAgreement,
      projection,
      variantId: projection.variants[0].variantId,
      quantity: 1
    });

    expect(intent).toEqual({
      productId: projection.productId,
      variantId: projection.variants[0].variantId,
      quantity: 1,
      marketAtAdd: 'intl'
    });
    expect(Object.keys(intent ?? {}).sort()).toEqual([
      'marketAtAdd',
      'productId',
      'quantity',
      'variantId'
    ]);
    expect(JSON.stringify(intent)).not.toMatch(
      /price|currency|stock|fingerprint|generation|contextVersion/i
    );
  });

  it('fails closed for unresolved, stale, unavailable, and invalid variant agreement', () => {
    const attempts = [
      {agreement: {...readyAgreement, contextStatus: 'resolving'}},
      {agreement: {...readyAgreement, contextStatus: 'error'}},
      {agreement: {...readyAgreement, contextMarket: 'vn'}},
      {agreement: {...readyAgreement, contextGeneration: 6}},
      {agreement: {...readyAgreement, contextVersion: 3}},
      {agreement: {...readyAgreement, locale: 'vi'}},
      {projection: {...projection, available: false}},
      {projection: {...projection, offerFingerprint: 'stale-fingerprint'}},
      {variantId: '33333333-3333-4333-8333-333333333333'}
    ];

    for (const attempt of attempts) {
      expect(
        createAddToCartIntent({
          agreement: attempt.agreement ?? readyAgreement,
          projection: attempt.projection ?? projection,
          variantId: attempt.variantId ?? projection.variants[0].variantId,
          quantity: 1
        }),
        JSON.stringify(attempt)
      ).toBeNull();
    }
  });

  it('resets selection whenever product, market, or offer fingerprint changes', () => {
    const identity = {
      productId: projection.productId,
      market: projection.market,
      offerFingerprint: projection.offerFingerprint
    };

    expect(shouldResetVariantSelection(identity, identity)).toBe(false);
    expect(
      shouldResetVariantSelection(identity, {...identity, productId: 'different-product'})
    ).toBe(true);
    expect(
      shouldResetVariantSelection(identity, {...identity, market: 'vn'})
    ).toBe(true);
    expect(
      shouldResetVariantSelection(identity, {
        ...identity,
        offerFingerprint: 'new-fingerprint'
      })
    ).toBe(true);
  });
});
