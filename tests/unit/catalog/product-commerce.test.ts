import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

async function productCommerceModule() {
  return import('@/catalog/projections');
}

async function productCommerceComponentModule() {
  return import('@/components/catalog/product-commerce');
}

const parentPriceProduct = {
  productId: 'product-parent',
  slug: 'amber-bear',
  locale: 'en',
  market: 'intl',
  productType: 'physical_finished',
  priceMinor: 2_400,
  currencyCode: 'USD',
  available: true,
  inStock: true,
  otherMarket: { market: 'vn', available: true },
  variants: [
    {
      variantId: 'variant-small',
      sku: 'BEAR-S',
      enabled: true,
      stock: 3,
      priceMinor: 2_400,
      currencyCode: 'USD',
      priceSource: 'parent'
    }
  ]
} as const;

const variantOverrideProduct = {
  ...parentPriceProduct,
  productId: 'product-variant',
  slug: 'linen-doll',
  variants: [
    {
      variantId: 'variant-blue',
      sku: 'DOLL-BLUE',
      enabled: true,
      stock: 1,
      priceMinor: 3_100,
      currencyCode: 'USD',
      priceSource: 'variant'
    },
    {
      variantId: 'variant-red',
      sku: 'DOLL-RED',
      enabled: false,
      stock: 0,
      priceMinor: 2_400,
      currencyCode: 'USD',
      priceSource: 'parent'
    }
  ]
} as const;

describe('product commerce projection contracts', () => {
  it('DTO exposes complete public offer facts', async () => {
    const { projectProductCommerce } = await productCommerceModule();
    const projection = projectProductCommerce(parentPriceProduct);

    expect(projection).toMatchObject(parentPriceProduct);
    expect(projection.offerFingerprint).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(Object.keys(projection).sort()).toEqual([
      'available',
      'currencyCode',
      'inStock',
      'locale',
      'market',
      'offerFingerprint',
      'otherMarket',
      'priceMinor',
      'productId',
      'productType',
      'slug',
      'variants'
    ]);
  });

  it('parent prices and variant overrides remain independent', async () => {
    const { projectProductCommerce } = await productCommerceModule();
    const inherited = projectProductCommerce(parentPriceProduct);
    const overridden = projectProductCommerce(variantOverrideProduct);

    expect(inherited.variants[0]).toMatchObject({
      variantId: 'variant-small',
      priceMinor: 2_400,
      currencyCode: 'USD',
      priceSource: 'parent',
      enabled: true,
      stock: 3
    });
    expect(overridden.priceMinor).toBe(2_400);
    expect(overridden.variants).toEqual([
      expect.objectContaining({
        variantId: 'variant-blue',
        priceMinor: 3_100,
        priceSource: 'variant',
        stock: 1
      }),
      expect.objectContaining({
        variantId: 'variant-red',
        priceMinor: 2_400,
        priceSource: 'parent',
        enabled: false,
        stock: 0
      })
    ]);
  });

  it('unavailable and market-exclusive products fail closed', async () => {
    const { projectProductCommerce } = await productCommerceModule();
    const unavailable = projectProductCommerce({
      ...parentPriceProduct,
      available: false,
      inStock: false,
      otherMarket: { market: 'vn', available: true },
      variants: parentPriceProduct.variants.map((variant) => ({
        ...variant,
        enabled: false,
        stock: 0
      }))
    });

    expect(unavailable).toMatchObject({
      market: 'intl',
      available: false,
      inStock: false,
      otherMarket: { market: 'vn', available: true }
    });
    expect(
      unavailable.variants.every(
        (variant: { enabled: boolean; stock: number }) => !variant.enabled && variant.stock === 0
      )
    ).toBe(true);
  });

  it(
    'fingerprint is deterministic and changes only with public offer facts',
    async () => {
      const { projectProductCommerce } = await productCommerceModule();
      const first = projectProductCommerce(parentPriceProduct);
      const reordered = projectProductCommerce({
        ...parentPriceProduct,
        variants: [...parentPriceProduct.variants].reverse(),
        privatePdfPath: 'must-not-participate',
        requestCookie: 'must-not-participate'
      });
      const changedOffer = projectProductCommerce({ ...parentPriceProduct, priceMinor: 2_500 });
      const changedInventory = projectProductCommerce({ ...parentPriceProduct, inStock: false });

      expect(reordered.offerFingerprint).toBe(first.offerFingerprint);
      expect(changedOffer.offerFingerprint).not.toBe(first.offerFingerprint);
      expect(changedInventory.offerFingerprint).not.toBe(first.offerFingerprint);
      expect(JSON.stringify(reordered)).not.toContain('privatePdfPath');
      expect(JSON.stringify(reordered)).not.toContain('requestCookie');
    }
  );

  it('Add to Cart requires exact ready agreement', async () => {
    const { isProductCommerceAgreement, projectProductCommerce } = await productCommerceModule();
    const projection = {
      ...projectProductCommerce(variantOverrideProduct),
      generation: 7,
      contextVersion: 4
    };
    const exact = {
      contextStatus: 'ready',
      contextMarket: 'intl',
      contextGeneration: 7,
      contextVersion: 4,
      locale: 'en',
      productId: 'product-variant',
      variantId: 'variant-blue',
      offerFingerprint: projection.offerFingerprint
    };

    expect(isProductCommerceAgreement(exact, projection)).toBe(true);

    const mismatches = [
      { ...exact, contextStatus: 'resolving' },
      { ...exact, contextStatus: 'error' },
      { ...exact, contextMarket: 'vn' },
      { ...exact, contextGeneration: 6 },
      { ...exact, contextVersion: 3 },
      { ...exact, locale: 'vi' },
      { ...exact, productId: 'different-product' },
      { ...exact, variantId: 'different-variant' },
      { ...exact, offerFingerprint: 'changed-fingerprint' }
    ];

    for (const input of mismatches) {
      expect(isProductCommerceAgreement(input, projection), JSON.stringify(input)).toBe(false);
    }
  });
});

describe('product commerce island lifecycle', () => {
  it('accepts only the latest matching context generation and projection identity', async () => {
    const { isCurrentProductProjectionRequest } = await productCommerceComponentModule();
    const current = {
      requestId: 4,
      generation: 7,
      contextVersion: 3,
      market: 'intl',
      locale: 'en',
      productSlug: 'amber-bear'
    } as const;

    expect(isCurrentProductProjectionRequest(current, current)).toBe(true);
    expect(
      isCurrentProductProjectionRequest(current, { ...current, requestId: 3 })
    ).toBe(false);
    expect(
      isCurrentProductProjectionRequest(current, { ...current, generation: 6 })
    ).toBe(false);
    expect(
      isCurrentProductProjectionRequest(current, { ...current, contextVersion: 2 })
    ).toBe(false);
    expect(
      isCurrentProductProjectionRequest(current, { ...current, market: 'vn' })
    ).toBe(false);
    expect(
      isCurrentProductProjectionRequest(current, {
        ...current,
        productSlug: 'different-product'
      })
    ).toBe(false);
  });

  it('keeps static SEO facts in the page shell and visitor commerce in the private island', async () => {
    const [pageSource, commerceSource] = await Promise.all([
      readFile(
        new URL(
          '../../../src/app/[locale]/product/[productSlug]/page.tsx',
          import.meta.url
        ),
        'utf8'
      ),
      readFile(
        new URL('../../../src/components/catalog/product-commerce.tsx', import.meta.url),
        'utf8'
      )
    ]);

    expect(pageSource).toContain("export const dynamic = 'force-static'");
    expect(pageSource).toContain('export const revalidate = 300');
    expect(pageSource).toContain('marketForLocale(locale)');
    expect(pageSource).toContain('<ProductCommerce');
    expect(pageSource).not.toContain('<AddToCart');
    expect(pageSource).not.toContain('<UnavailableMarket');

    expect(commerceSource).toContain("cache: 'no-store'");
    expect(commerceSource).toContain('new AbortController()');
    expect(commerceSource).toContain('aria-live="polite"');
    expect(commerceSource).toContain('aria-hidden="true"');
    expect(commerceSource).toContain('offerFingerprint');
  });
});
