import { describe, expect, it, vi } from 'vitest';

const PLAN_09_06 = 'expected red: Plan 09-06 owns projection implementation';

const vnOnlyProduct = {
  productId: 'product-vn',
  slug: 'gau-vang',
  title: 'Gấu vàng',
  productType: 'physical_finished',
  imageUrl: '/vn.jpg',
  priceMinor: 450_000,
  currencyCode: 'VND',
  available: true,
  inStock: true
} as const;

const intlOnlyProduct = {
  productId: 'product-intl',
  slug: 'amber-bear',
  title: 'Amber bear',
  productType: 'physical_finished',
  imageUrl: '/intl.jpg',
  priceMinor: 2_400,
  currencyCode: 'USD',
  available: true,
  inStock: true
} as const;

const bothMarketProduct = {
  productId: 'product-both',
  slug: 'moc-khoa',
  title: 'Móc khóa',
  productType: 'pdf_pattern',
  imageUrl: '/both.jpg',
  priceMinor: 90_000,
  currencyCode: 'VND',
  available: true,
  inStock: true
} as const;

const vnFacets = [
  { kind: 'category', id: 'category-amigurumi', slug: 'thu-bong', label: 'Thú bông', count: 2 },
  { kind: 'collection', id: 'collection-spring', slug: 'mua-xuan', label: 'Mùa xuân', count: 1 },
  { kind: 'technique', id: 'technique-crochet', slug: 'moc-len', label: 'Móc len', count: 2 },
  { kind: 'tag', id: 'tag-gift', slug: 'qua-tang', label: 'Quà tặng', count: 1 }
] as const;

const intlFacets = [
  { kind: 'category', id: 'category-amigurumi', slug: 'toys', label: 'Toys', count: 2 },
  { kind: 'collection', id: 'collection-holiday', slug: 'holiday', label: 'Holiday', count: 1 },
  { kind: 'technique', id: 'technique-crochet', slug: 'crochet', label: 'Crochet', count: 2 },
  { kind: 'tag', id: 'tag-gift', slug: 'gift', label: 'Gift', count: 1 }
] as const;

async function projectionModules() {
  // @ts-expect-error -- Plan 09-06 creates this module and promotes these expected-red contracts.
  const schemas = await import('@/catalog/projection-schemas');
  // @ts-expect-error -- Plan 09-06 creates this module and promotes these expected-red contracts.
  const projections = await import('@/catalog/projections');
  return { ...schemas, ...projections };
}

describe('storefront catalog projection contracts', () => {
  describe('strict public input boundary', () => {
    it.fails(PLAN_09_06, async () => {
      const { catalogProjectionQuerySchema } = await projectionModules();
      const input = {
        locale: ' en ',
        surface: 'catalog',
        search: '  amber bear  ',
        productType: 'physical_finished',
        categorySlug: ' toys ',
        collectionSlug: ' spring ',
        techniqueSlug: ' crochet ',
        tagSlug: ' gift ',
        sort: 'price_asc',
        limit: '24'
      };

      expect(catalogProjectionQuerySchema.parse(input)).toEqual({
        locale: 'en',
        surface: 'catalog',
        search: 'amber bear',
        productType: 'physical_finished',
        categorySlug: 'toys',
        collectionSlug: 'spring',
        techniqueSlug: 'crochet',
        tagSlug: 'gift',
        sort: 'price_asc',
        limit: 24
      });
    });

    it.fails(PLAN_09_06, async () => {
      const { catalogProjectionQuerySchema } = await projectionModules();
      const validLocales = ['vi', 'en'];
      const validSurfaces = ['home', 'catalog', 'category', 'collection', 'technique', 'tag'];
      const validSorts = ['newest', 'price_asc', 'price_desc', 'title'];

      for (const locale of validLocales) {
        for (const surface of validSurfaces) {
          for (const sort of validSorts) {
            expect(
              catalogProjectionQuerySchema.safeParse({ locale, surface, sort, limit: 48 }).success
            ).toBe(true);
          }
        }
      }
    });

    it.fails(PLAN_09_06, async () => {
      const { catalogProjectionQuerySchema } = await projectionModules();
      const invalidInputs = [
        { locale: 'fr', surface: 'catalog' },
        { locale: 'en', surface: 'search' },
        { locale: 'en', surface: 'catalog', sort: 'popular' },
        { locale: 'en', surface: 'catalog', limit: 0 },
        { locale: 'en', surface: 'catalog', limit: 49 },
        { locale: 'en', surface: 'catalog', search: 'x'.repeat(101) },
        { locale: 'en', surface: 'catalog', categorySlug: 'x'.repeat(101) },
        { locale: 'en', surface: 'catalog', collectionSlug: 'x'.repeat(101) },
        { locale: 'en', surface: 'catalog', techniqueSlug: 'x'.repeat(101) },
        { locale: 'en', surface: 'catalog', tagSlug: 'x'.repeat(101) },
        { locale: ['en', 'vi'], surface: 'catalog' },
        { locale: 'en', surface: ['catalog', 'home'] },
        { locale: 'en', surface: 'catalog', market: 'vn' },
        { locale: 'en', surface: 'catalog', unexpected: 'poison' }
      ];

      for (const input of invalidInputs) {
        expect(catalogProjectionQuerySchema.safeParse(input).success, JSON.stringify(input)).toBe(
          false
        );
      }
    });
  });

  it.fails(
    `${PLAN_09_06}; active-market products and facets replace the SEO shell atomically`,
    async () => {
      const { projectCatalog } = await projectionModules();
      const loadProducts = vi.fn(async ({ market }: { market: 'vn' | 'intl' }) =>
        market === 'vn'
          ? [vnOnlyProduct, bothMarketProduct]
          : [intlOnlyProduct, { ...bothMarketProduct, currencyCode: 'USD', priceMinor: 500 }]
      );
      const loadFacets = vi.fn(async ({ market }: { market: 'vn' | 'intl' }) =>
        market === 'vn' ? vnFacets : intlFacets
      );

      const seoDefaultShell = { products: [vnOnlyProduct, bothMarketProduct], facets: vnFacets };
      const result = await projectCatalog(
        {
          locale: 'vi',
          market: 'intl',
          surface: 'catalog',
          search: null,
          productType: null,
          categorySlug: null,
          collectionSlug: null,
          techniqueSlug: null,
          tagSlug: null,
          sort: 'newest',
          limit: 24
        },
        { loadProducts, loadFacets }
      );

      expect(result).not.toEqual(seoDefaultShell);
      expect(result.products).toEqual([
        intlOnlyProduct,
        { ...bothMarketProduct, currencyCode: 'USD', priceMinor: 500 }
      ]);
      expect(
        result.products.map((product: { productId: string }) => product.productId)
      ).not.toContain('product-vn');
      expect(result.facets).toEqual(intlFacets);
      expect(result.facets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'category' }),
          expect.objectContaining({ kind: 'collection' }),
          expect.objectContaining({ kind: 'technique' }),
          expect.objectContaining({ kind: 'tag' })
        ])
      );
    }
  );

  it.fails(
    `${PLAN_09_06}; every shaping dimension participates in reusable cache calls`,
    async () => {
      const { projectCatalog } = await projectionModules();
      const base = {
        locale: 'en',
        market: 'intl',
        surface: 'catalog',
        search: 'bear',
        productType: 'physical_finished',
        categorySlug: 'toys',
        collectionSlug: 'spring',
        techniqueSlug: 'crochet',
        tagSlug: 'gift',
        sort: 'price_asc',
        limit: 24
      } as const;
      const loadProducts = vi.fn(async (_input: typeof base) => []);
      const loadFacets = vi.fn(async (_input: typeof base) => []);

      await projectCatalog(base, { loadProducts, loadFacets });

      expect(loadProducts).toHaveBeenCalledWith(base);
      expect(loadFacets).toHaveBeenCalledWith(base);

      const variants = [
        { ...base, locale: 'vi' },
        { ...base, market: 'vn' },
        { ...base, surface: 'category' },
        { ...base, search: 'rabbit' },
        { ...base, productType: 'pdf_pattern' },
        { ...base, categorySlug: 'patterns' },
        { ...base, collectionSlug: 'holiday' },
        { ...base, techniqueSlug: 'knit' },
        { ...base, tagSlug: 'beginner' },
        { ...base, sort: 'title' },
        { ...base, limit: 12 }
      ];

      for (const variant of variants) {
        await projectCatalog(variant, { loadProducts, loadFacets });
      }

      expect(new Set(loadProducts.mock.calls.map(([input]) => JSON.stringify(input))).size).toBe(
        12
      );
      expect(new Set(loadFacets.mock.calls.map(([input]) => JSON.stringify(input))).size).toBe(12);

      await projectCatalog({ ...base, search: '  bear  ' }, { loadProducts, loadFacets });
      expect(loadProducts.mock.calls.at(-1)?.[0]).toEqual(base);
      expect(loadFacets.mock.calls.at(-1)?.[0]).toEqual(base);
    }
  );
});
