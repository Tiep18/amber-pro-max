import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/catalog/product-card-view', () => ({
  ProductCardView: () => null
}));
vi.mock('@/components/storefront-context', () => ({
  useStorefrontContext: () => ({
    status: 'resolving',
    market: null,
    generation: 0,
    contextVersion: 0
  })
}));

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
  const schemas = await import('@/catalog/projection-schemas');
  const projections = await import('@/catalog/projections');
  return { ...schemas, ...projections };
}

async function catalogCommerceModule() {
  return import('@/components/catalog/catalog-commerce');
}

describe('storefront catalog projection contracts', () => {
  describe('strict public input boundary', () => {
    it('normalizes supported projection inputs', async () => {
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
        offset: '0',
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
        offset: 0,
        limit: 24
      });
    });

    it('accepts every supported locale, surface, and sort combination', async () => {
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

    it('rejects malformed, oversized, caller-market, and unknown inputs', async () => {
      const { catalogProjectionQuerySchema } = await projectionModules();
      const invalidInputs = [
        { locale: 'fr', surface: 'catalog' },
        { locale: 'en', surface: 'search' },
        { locale: 'en', surface: 'catalog', sort: 'popular' },
        { locale: 'en', surface: 'catalog', offset: -1 },
        { locale: 'en', surface: 'catalog', offset: 10_001 },
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

  it('active-market products and facets replace the SEO shell atomically', async () => {
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
        offset: 0,
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
  });

  it('every shaping dimension participates in reusable cache calls', async () => {
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
      offset: 0,
      limit: 24
    } as const;
    const loadProducts = vi.fn(async (input: typeof base) => {
      void input;
      return [];
    });
    const loadFacets = vi.fn(async (input: typeof base) => {
      void input;
      return [];
    });

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
      { ...base, offset: 24 },
      { ...base, limit: 12 }
    ];

    for (const variant of variants) {
      await projectCatalog(variant, { loadProducts, loadFacets });
    }

    expect(new Set(loadProducts.mock.calls.map(([input]) => JSON.stringify(input))).size).toBe(13);
    expect(new Set(loadFacets.mock.calls.map(([input]) => JSON.stringify(input))).size).toBe(13);

    await projectCatalog({ ...base, search: '  bear  ' }, { loadProducts, loadFacets });
    expect(loadProducts.mock.calls.at(-1)?.[0]).toEqual(base);
    expect(loadFacets.mock.calls.at(-1)?.[0]).toEqual(base);
  });

  it('commits matching products and facets as one ready snapshot', async () => {
    const {
      beginCatalogCommerceRequest,
      createCatalogCommerceState,
      settleCatalogCommerceRequest
    } = await catalogCommerceModule();
    const initial = createCatalogCommerceState([vnOnlyProduct]);
    const identity = {
      locale: 'en',
      market: 'intl',
      surface: 'catalog',
      contextGeneration: 7,
      contextVersion: 3,
      queryKey: 'search=amber&sort=newest'
    } as const;
    const begun = beginCatalogCommerceRequest(initial, identity);
    const projection = {
      locale: 'en',
      market: 'intl',
      surface: 'catalog',
      products: [intlOnlyProduct],
      facets: intlFacets,
      totalCount: 1
    } as const;

    const settled = settleCatalogCommerceRequest(begun.state, begun.request, projection);

    expect(settled).toMatchObject({
      status: 'ready',
      products: projection.products,
      facets: projection.facets,
      identity
    });
    expect(settled.products).not.toContain(vnOnlyProduct);
  });

  it('hides stale products behind a skeleton until the current filtered projection settles', async () => {
    const {
      beginCatalogCommerceRequest,
      catalogResultsArePending,
      createCatalogCommerceState,
      settleCatalogCommerceRequest
    } = await catalogCommerceModule();
    const initial = createCatalogCommerceState([vnOnlyProduct]);
    const identity = {
      locale: 'en',
      market: 'intl',
      surface: 'catalog',
      contextGeneration: 2,
      contextVersion: 4,
      queryKey: 'sort=newest&productType=pdf_pattern'
    } as const;

    expect(
      catalogResultsArePending({
        state: initial,
        currentQueryKey: 'sort=newest',
        filtersActive: false,
        navigationPending: false
      })
    ).toBe(false);
    expect(
      catalogResultsArePending({
        state: initial,
        currentQueryKey: identity.queryKey,
        filtersActive: true,
        navigationPending: false
      })
    ).toBe(true);

    const begun = beginCatalogCommerceRequest(initial, identity);
    expect(begun.state.products).toEqual([]);
    expect(
      catalogResultsArePending({
        state: begun.state,
        currentQueryKey: identity.queryKey,
        filtersActive: true,
        navigationPending: false
      })
    ).toBe(true);

    const settled = settleCatalogCommerceRequest(begun.state, begun.request, {
      locale: 'en',
      market: 'intl',
      surface: 'catalog',
      products: [intlOnlyProduct],
      facets: intlFacets,
      totalCount: 1
    });
    expect(
      catalogResultsArePending({
        state: settled,
        currentQueryKey: identity.queryKey,
        filtersActive: true,
        navigationPending: false
      })
    ).toBe(false);
    expect(settled.products).toEqual([intlOnlyProduct]);
  });

  it('retains non-authoritative facets only across same-context filter requests', async () => {
    const {
      beginCatalogCommerceRequest,
      createCatalogCommerceState,
      settleCatalogCommerceRequest
    } = await catalogCommerceModule();
    const readyIdentity = {
      locale: 'en',
      market: 'intl',
      surface: 'catalog',
      contextGeneration: 4,
      contextVersion: 7,
      queryKey: 'sort=newest'
    } as const;
    const initial = createCatalogCommerceState([intlOnlyProduct]);
    const begun = beginCatalogCommerceRequest(initial, readyIdentity);
    const ready = settleCatalogCommerceRequest(begun.state, begun.request, {
      locale: 'en',
      market: 'intl',
      surface: 'catalog',
      products: [intlOnlyProduct],
      facets: intlFacets,
      totalCount: 1
    });

    const filtered = beginCatalogCommerceRequest(ready, {
      ...readyIdentity,
      queryKey: 'sort=newest&productType=pdf_pattern'
    });
    expect(filtered.state.products).toEqual([]);
    expect(filtered.state.facets).toEqual(intlFacets);

    const marketChanged = beginCatalogCommerceRequest(ready, {
      ...readyIdentity,
      market: 'vn',
      contextGeneration: 5,
      contextVersion: 8
    });
    expect(marketChanged.state.products).toEqual([]);
    expect(marketChanged.state.facets).toEqual([]);
  });

  it('accepts a ready catalog product without optional image metadata', async () => {
    const { parseCatalogProjectionResponse } = await catalogCommerceModule();
    const parsed = parseCatalogProjectionResponse({
      status: 'ready',
      projection: {
        locale: 'en',
        market: 'intl',
        surface: 'catalog',
        products: [
          {
            product_id: 'product-without-image',
            slug: 'guest-race-pattern',
            title: 'Guest race pattern',
            description: '',
            product_type: 'pdf_pattern',
            currency_code: 'USD',
            price_minor: 2500,
            primary_image_bucket: null,
            primary_image_path: null,
            primary_image_alt: null,
            in_stock: true,
            published_at: '2026-07-23T12:32:48.379769+00:00'
          }
        ],
        facets: [],
        totalCount: 1
      }
    });

    expect(parsed).toMatchObject({
      market: 'intl',
      totalCount: 1,
      products: [
        {
          product_id: 'product-without-image',
          primary_image_bucket: null,
          currency_code: 'USD'
        }
      ]
    });
  });

  it('ignores stale generations and mismatched response markets without partial replacement', async () => {
    const {
      beginCatalogCommerceRequest,
      createCatalogCommerceState,
      settleCatalogCommerceRequest
    } = await catalogCommerceModule();
    const initial = createCatalogCommerceState([vnOnlyProduct]);
    const first = beginCatalogCommerceRequest(initial, {
      locale: 'vi',
      market: 'vn',
      surface: 'catalog',
      contextGeneration: 1,
      contextVersion: 1,
      queryKey: 'sort=newest'
    });
    const second = beginCatalogCommerceRequest(first.state, {
      locale: 'vi',
      market: 'intl',
      surface: 'catalog',
      contextGeneration: 2,
      contextVersion: 2,
      queryKey: 'sort=newest'
    });
    const staleProjection = {
      locale: 'vi',
      market: 'vn',
      surface: 'catalog',
      products: [vnOnlyProduct],
      facets: vnFacets,
      totalCount: 1
    } as const;
    const wrongMarketProjection = {
      locale: 'vi',
      market: 'vn',
      surface: 'catalog',
      products: [bothMarketProduct],
      facets: vnFacets,
      totalCount: 1
    } as const;

    expect(settleCatalogCommerceRequest(second.state, first.request, staleProjection)).toBe(
      second.state
    );
    expect(settleCatalogCommerceRequest(second.state, second.request, wrongMarketProjection)).toBe(
      second.state
    );
  });
});
