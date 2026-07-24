'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  catalogListStateFromSearchParams,
  hasCatalogFilters,
  type CatalogListState
} from '@/catalog/list-state';
import type { CatalogFacet, CatalogProduct, CatalogProductType } from '@/catalog/queries';
import type { CatalogProjection, CatalogProjectionInput } from '@/catalog/projections';
import type { MarketCode } from '@/catalog/market';
import type { Locale } from '@/i18n/routing';
import {
  CatalogFilterContent,
  type CatalogFilterLabels
} from '@/components/catalog/catalog-filter-content';
import { CatalogControlsClient } from '@/components/catalog/catalog-controls-client';
import { CatalogMobileFilters } from '@/components/catalog/catalog-mobile-filters';
import { CatalogResultGrid } from '@/components/catalog/catalog-result-grid';
import { ProductCardView, type ProductCardLabels } from '@/components/catalog/product-card-view';
import { useStorefrontContext } from '@/components/storefront-context';

type CatalogSurface = CatalogProjectionInput['surface'];

export type CatalogCommerceIdentity = {
  locale: Locale;
  market: MarketCode;
  surface: CatalogSurface;
  contextGeneration: number;
  contextVersion: number;
  queryKey: string;
};

export type CatalogCommerceRequest = {
  generation: number;
  identity: CatalogCommerceIdentity;
};

export type CatalogCommerceState = {
  status: 'resolving' | 'ready' | 'error';
  seedProducts: readonly unknown[];
  products: readonly unknown[];
  facets: readonly unknown[];
  generation: number;
  activeGeneration: number | null;
  identity: CatalogCommerceIdentity | null;
  issue: 'context_unavailable' | 'projection_unavailable' | null;
};

export function createCatalogCommerceState(seedProducts: readonly unknown[]): CatalogCommerceState {
  return {
    status: 'resolving',
    seedProducts,
    products: seedProducts,
    facets: [],
    generation: 0,
    activeGeneration: null,
    identity: null,
    issue: null
  };
}

export function beginCatalogCommerceRequest(
  state: CatalogCommerceState,
  identity: CatalogCommerceIdentity
): {
  state: CatalogCommerceState;
  request: CatalogCommerceRequest;
} {
  const generation = state.generation + 1;
  return {
    state: {
      ...state,
      status: 'resolving',
      products: state.seedProducts,
      facets: [],
      generation,
      activeGeneration: generation,
      identity,
      issue: null
    },
    request: { generation, identity }
  };
}

function sameIdentity(left: CatalogCommerceIdentity | null, right: CatalogCommerceIdentity) {
  return (
    left?.locale === right.locale &&
    left.market === right.market &&
    left.surface === right.surface &&
    left.contextGeneration === right.contextGeneration &&
    left.contextVersion === right.contextVersion &&
    left.queryKey === right.queryKey
  );
}

export function settleCatalogCommerceRequest(
  state: CatalogCommerceState,
  request: CatalogCommerceRequest,
  projection: CatalogProjection<unknown, unknown>
): CatalogCommerceState {
  if (
    state.activeGeneration !== request.generation ||
    !sameIdentity(state.identity, request.identity) ||
    projection.locale !== request.identity.locale ||
    projection.market !== request.identity.market ||
    projection.surface !== request.identity.surface
  ) {
    return state;
  }

  return {
    ...state,
    status: 'ready',
    products: projection.products,
    facets: projection.facets,
    activeGeneration: null,
    issue: null
  };
}

export function failCatalogCommerceRequest(
  state: CatalogCommerceState,
  generation: number,
  issue: CatalogCommerceState['issue']
): CatalogCommerceState {
  if (state.activeGeneration !== generation) {
    return state;
  }

  return {
    ...state,
    status: 'error',
    products: state.seedProducts,
    facets: [],
    activeGeneration: null,
    issue
  };
}

export type CatalogFixedFilters = {
  productType?: CatalogProductType;
  categorySlug?: string;
  collectionSlug?: string;
  techniqueSlug?: string;
  tagSlug?: string;
};

type CatalogControlLabels = {
  search: string;
  searchPlaceholder: string;
  searchSubmit: string;
  sort: string;
  newest: string;
  priceAsc: string;
  priceDesc: string;
  titleSort: string;
};

type CatalogShellLabels = {
  productType: string;
  allTypes: string;
  handmadeTab: string;
  patternsTab: string;
  filtersTitle: string;
  openFilters: string;
  closeFilters: string;
  resultCount: string;
  activeFilters: string;
  clearFilters: string;
  filterSearch: string;
  filterType: string;
  filterCategory: string;
  filterTechnique: string;
  filterTag: string;
  filterSort: string;
};

export type CatalogCommerceLabels = {
  card: ProductCardLabels;
  filters: CatalogFilterLabels;
  controls?: CatalogControlLabels;
  shell?: CatalogShellLabels;
  resolving: string;
  loaded: string;
  showing: string;
  loadMore: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  emptyTitle: string;
  emptyBody: string;
  noFilters: string;
  marketNames: Record<MarketCode, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCatalogProduct(value: unknown): value is CatalogProduct {
  if (!isRecord(value)) return false;
  return (
    typeof value.product_id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    (value.product_type === 'pdf_pattern' || value.product_type === 'physical_finished') &&
    typeof value.price_minor === 'number' &&
    Number.isSafeInteger(value.price_minor) &&
    value.price_minor >= 0 &&
    (value.currency_code === 'VND' || value.currency_code === 'USD') &&
    typeof value.in_stock === 'boolean' &&
    typeof value.primary_image_bucket === 'string' &&
    typeof value.primary_image_path === 'string' &&
    typeof value.primary_image_alt === 'string' &&
    typeof value.published_at === 'string'
  );
}

function isCatalogFacet(value: unknown): value is CatalogFacet {
  if (!isRecord(value)) return false;
  return (
    (value.facet_type === 'category' ||
      value.facet_type === 'collection' ||
      value.facet_type === 'technique' ||
      value.facet_type === 'tag') &&
    typeof value.id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.label === 'string' &&
    typeof value.product_count === 'number' &&
    Number.isSafeInteger(value.product_count) &&
    value.product_count >= 0
  );
}

function parseCatalogProjectionResponse(
  value: unknown
): CatalogProjection<CatalogProduct, CatalogFacet> | null {
  if (!isRecord(value) || value.status !== 'ready' || !isRecord(value.projection)) {
    return null;
  }

  const projection = value.projection;
  if (
    (projection.locale !== 'vi' && projection.locale !== 'en') ||
    (projection.market !== 'vn' && projection.market !== 'intl') ||
    !(
      projection.surface === 'home' ||
      projection.surface === 'catalog' ||
      projection.surface === 'category' ||
      projection.surface === 'collection' ||
      projection.surface === 'technique' ||
      projection.surface === 'tag'
    ) ||
    !Array.isArray(projection.products) ||
    !projection.products.every(isCatalogProduct) ||
    !Array.isArray(projection.facets) ||
    !projection.facets.every(isCatalogFacet)
  ) {
    return null;
  }

  return {
    locale: projection.locale,
    market: projection.market,
    surface: projection.surface,
    products: projection.products,
    facets: projection.facets
  };
}

function projectionQuery(
  locale: Locale,
  surface: CatalogSurface,
  state: CatalogListState,
  fixed: CatalogFixedFilters,
  limit: number
) {
  const values = {
    locale,
    surface,
    search: state.search,
    productType: fixed.productType ?? state.productType,
    categorySlug: fixed.categorySlug ?? state.categorySlug,
    collectionSlug: fixed.collectionSlug,
    techniqueSlug: fixed.techniqueSlug ?? state.techniqueSlug,
    tagSlug: fixed.tagSlug ?? state.tagSlug,
    sort: state.sort,
    limit
  };
  const params = new URLSearchParams({
    locale: values.locale,
    surface: values.surface,
    sort: values.sort,
    limit: String(values.limit)
  });
  if (values.search) params.set('search', values.search);
  if (values.productType) params.set('productType', values.productType);
  if (values.categorySlug) params.set('categorySlug', values.categorySlug);
  if (values.collectionSlug) params.set('collectionSlug', values.collectionSlug);
  if (values.techniqueSlug) params.set('techniqueSlug', values.techniqueSlug);
  if (values.tagSlug) params.set('tagSlug', values.tagSlug);
  return params;
}

function facetGroups(facets: readonly CatalogFacet[]) {
  return {
    categories: facets.filter((facet) => facet.facet_type === 'category'),
    techniques: facets.filter((facet) => facet.facet_type === 'technique'),
    tags: facets.filter((facet) => facet.facet_type === 'tag')
  };
}

function replaceTokens(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

type CatalogHrefOverrides = {
  search?: string | null;
  productType?: CatalogListState['productType'] | null;
  categorySlug?: string | null;
  techniqueSlug?: string | null;
  tagSlug?: string | null;
  sort?: CatalogListState['sort'] | null;
};

function catalogHref(
  basePath: string,
  state: CatalogListState,
  overrides: CatalogHrefOverrides = {}
) {
  const params = new URLSearchParams();
  const search = 'search' in overrides ? overrides.search : state.search;
  const productType = 'productType' in overrides ? overrides.productType : state.productType;
  const categorySlug = 'categorySlug' in overrides ? overrides.categorySlug : state.categorySlug;
  const techniqueSlug =
    'techniqueSlug' in overrides ? overrides.techniqueSlug : state.techniqueSlug;
  const tagSlug = 'tagSlug' in overrides ? overrides.tagSlug : state.tagSlug;
  const sort = 'sort' in overrides ? overrides.sort : state.sort;

  if (search) params.set('search', search);
  if (productType) params.set('type', productType);
  if (categorySlug) params.set('category', categorySlug);
  if (techniqueSlug) params.set('technique', techniqueSlug);
  if (tagSlug) params.set('tag', tagSlug);
  if (sort && sort !== 'newest') params.set('sort', sort);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function CatalogFacetSkeletons() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      {[0, 1, 2].map((group) => (
        <div key={group} className="grid gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export function CatalogCommerce({
  locale,
  surface,
  seoProducts,
  labels,
  fixedFilters = {},
  showControls = false,
  limit = surface === 'home' ? 4 : 48
}: {
  locale: Locale;
  surface: CatalogSurface;
  seoProducts: readonly CatalogProduct[];
  labels: CatalogCommerceLabels;
  fixedFilters?: CatalogFixedFilters;
  showControls?: boolean;
  limit?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = useStorefrontContext();
  const normalizedState = catalogListStateFromSearchParams(searchParams);
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 48);
  const query = projectionQuery(locale, surface, normalizedState, fixedFilters, safeLimit);
  const queryKey = query.toString();
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<CatalogCommerceState>(() =>
    createCatalogCommerceState(seoProducts)
  );
  const stateRef = useRef(state);
  const controllerRef = useRef<AbortController | null>(null);

  function commitState(next: CatalogCommerceState) {
    stateRef.current = next;
    setState(next);
  }

  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;

    if (context.status !== 'ready' || context.market === null) {
      const next = createCatalogCommerceState(seoProducts);
      if (context.status === 'error') {
        commitState({
          ...next,
          status: 'error',
          issue: 'context_unavailable'
        });
      } else {
        commitState(next);
      }
      return;
    }

    const identity: CatalogCommerceIdentity = {
      locale,
      market: context.market,
      surface,
      contextGeneration: context.generation,
      contextVersion: context.contextVersion,
      queryKey
    };
    const base =
      stateRef.current.seedProducts === seoProducts
        ? stateRef.current
        : createCatalogCommerceState(seoProducts);
    const begun = beginCatalogCommerceRequest(base, identity);
    commitState(begun.state);

    const controller = new AbortController();
    controllerRef.current = controller;

    void fetch(`/api/storefront/catalog?${queryKey}`, {
      cache: 'no-store',
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('catalog_projection_unavailable');
        }
        const projection = parseCatalogProjectionResponse(await response.json());
        if (!projection) {
          throw new Error('catalog_projection_unavailable');
        }

        const current = stateRef.current;
        const settled = settleCatalogCommerceRequest(current, begun.request, projection);
        if (settled === current && current.activeGeneration === begun.request.generation) {
          commitState(
            failCatalogCommerceRequest(current, begun.request.generation, 'projection_unavailable')
          );
          return;
        }
        if (settled !== current) {
          commitState(settled);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        const current = stateRef.current;
        const failed = failCatalogCommerceRequest(
          current,
          begun.request.generation,
          'projection_unavailable'
        );
        if (failed !== current) {
          commitState(failed);
        }
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      });

    return () => controller.abort();
  }, [
    context.contextVersion,
    context.generation,
    context.market,
    context.status,
    locale,
    queryKey,
    retryVersion,
    seoProducts,
    surface
  ]);

  const products = state.products as readonly CatalogProduct[];
  const facets = state.facets as readonly CatalogFacet[];
  const groups = useMemo(() => facetGroups(facets), [facets]);
  const marketName = context.market === null ? '' : labels.marketNames[context.market];
  const filterSummary =
    [
      normalizedState.search,
      fixedFilters.productType ?? normalizedState.productType,
      fixedFilters.categorySlug ?? normalizedState.categorySlug,
      fixedFilters.collectionSlug,
      fixedFilters.techniqueSlug ?? normalizedState.techniqueSlug,
      fixedFilters.tagSlug ?? normalizedState.tagSlug,
      normalizedState.sort !== 'newest' ? normalizedState.sort : undefined
    ]
      .filter(Boolean)
      .join(', ') || labels.noFilters;
  const resultKey = state.identity
    ? `${state.identity.market}:${state.identity.contextGeneration}:${state.identity.contextVersion}:${state.identity.queryKey}`
    : `pending:${queryKey}`;
  const productTypeTabs = labels.shell
    ? [
        { label: labels.shell.allTypes, productType: undefined },
        { label: labels.shell.handmadeTab, productType: 'physical_finished' as const },
        { label: labels.shell.patternsTab, productType: 'pdf_pattern' as const }
      ]
    : [];
  const facetLabel = (kind: 'category' | 'technique' | 'tag', slug: string) => {
    const source =
      kind === 'category'
        ? groups.categories
        : kind === 'technique'
          ? groups.techniques
          : groups.tags;
    return source.find((facet) => facet.slug === slug)?.label ?? slug;
  };
  const sortLabel =
    labels.controls && normalizedState.sort !== 'newest'
      ? {
          price_asc: labels.controls.priceAsc,
          price_desc: labels.controls.priceDesc,
          title: labels.controls.titleSort,
          newest: labels.controls.newest
        }[normalizedState.sort]
      : normalizedState.sort;
  const activeFilters =
    labels.shell === undefined
      ? []
      : [
          normalizedState.search
            ? {
                key: 'search',
                label: replaceTokens(labels.shell.filterSearch, {
                  value: normalizedState.search
                }),
                href: catalogHref(pathname, normalizedState, { search: null })
              }
            : null,
          normalizedState.productType
            ? {
                key: 'type',
                label: replaceTokens(labels.shell.filterType, {
                  value:
                    productTypeTabs.find((tab) => tab.productType === normalizedState.productType)
                      ?.label ?? normalizedState.productType
                }),
                href: catalogHref(pathname, normalizedState, { productType: null })
              }
            : null,
          normalizedState.categorySlug
            ? {
                key: 'category',
                label: replaceTokens(labels.shell.filterCategory, {
                  value: facetLabel('category', normalizedState.categorySlug)
                }),
                href: catalogHref(pathname, normalizedState, { categorySlug: null })
              }
            : null,
          normalizedState.techniqueSlug
            ? {
                key: 'technique',
                label: replaceTokens(labels.shell.filterTechnique, {
                  value: facetLabel('technique', normalizedState.techniqueSlug)
                }),
                href: catalogHref(pathname, normalizedState, { techniqueSlug: null })
              }
            : null,
          normalizedState.tagSlug
            ? {
                key: 'tag',
                label: replaceTokens(labels.shell.filterTag, {
                  value: facetLabel('tag', normalizedState.tagSlug)
                }),
                href: catalogHref(pathname, normalizedState, { tagSlug: null })
              }
            : null,
          normalizedState.sort !== 'newest'
            ? {
                key: 'sort',
                label: replaceTokens(labels.shell.filterSort, { value: sortLabel }),
                href: catalogHref(pathname, normalizedState, { sort: 'newest' })
              }
            : null
        ].filter(
          (filter): filter is { key: string; label: string; href: string } => filter !== null
        );

  async function retry() {
    if (state.issue === 'context_unavailable') {
      await context.retryContext();
      return;
    }
    setRetryVersion((version) => version + 1);
  }

  const filterContent =
    state.status === 'ready' ? (
      <CatalogFilterContent
        basePath={pathname}
        state={normalizedState}
        categories={groups.categories}
        techniques={groups.techniques}
        tags={groups.tags}
        labels={labels.filters}
      />
    ) : (
      <CatalogFacetSkeletons />
    );
  const resultContent =
    state.status === 'error' ? (
      <Alert variant="destructive" className="grid gap-3">
        <AlertTitle>{labels.errorTitle}</AlertTitle>
        <p>{labels.errorBody}</p>
        <div>
          <Button type="button" variant="secondary" onClick={() => void retry()}>
            {labels.retry}
          </Button>
        </div>
      </Alert>
    ) : (
      <div className="min-w-0">
        <h2 tabIndex={-1} className="sr-only">
          {state.status === 'ready'
            ? replaceTokens(labels.loaded, {
                market: marketName,
                count: products.length
              })
            : labels.resolving}
        </h2>
        {state.status === 'ready' && products.length === 0 ? (
          <div className="grid min-h-48 place-content-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <h3 className="text-xl font-semibold">{labels.emptyTitle}</h3>
            <p className="max-w-xl text-[var(--muted-foreground)]">
              {replaceTokens(labels.emptyBody, {
                market: marketName,
                filters: filterSummary
              })}
            </p>
          </div>
        ) : (
          <CatalogResultGrid
            resultKey={resultKey}
            labels={{ showing: labels.showing, loadMore: labels.loadMore }}
          >
            {products.map((product, index) => (
              <ProductCardView
                key={product.product_id}
                product={product}
                locale={locale}
                labels={labels.card}
                commerceState={state.status === 'ready' ? 'ready' : 'pending'}
                eagerImage={index === 0}
              />
            ))}
          </CatalogResultGrid>
        )}
      </div>
    );

  return (
    <section
      aria-busy={state.status === 'resolving'}
      aria-describedby="catalog-commerce-status"
      className="grid gap-4"
    >
      <p
        id="catalog-commerce-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {state.status === 'resolving'
          ? labels.resolving
          : state.status === 'ready'
            ? replaceTokens(labels.loaded, {
                market: marketName,
                count: products.length
              })
            : ''}
      </p>

      {showControls && labels.controls && labels.shell ? (
        <>
          <nav
            className="flex gap-1 overflow-x-auto border-b border-[var(--border)]"
            aria-label={labels.shell.productType}
          >
            {productTypeTabs.map((tab) => {
              const active = normalizedState.productType === tab.productType;
              return (
                <Link
                  key={tab.label}
                  href={catalogHref(pathname, normalizedState, {
                    productType: tab.productType ?? null
                  })}
                  aria-current={active ? 'page' : undefined}
                  transitionTypes={active ? undefined : ['catalog-filter']}
                  className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold aria-[current=page]:border-[var(--accent)] aria-[current=page]:text-[var(--accent)] sm:px-4"
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
            <aside
              className="hidden self-start border-r border-[var(--border)]/70 pr-5 lg:sticky lg:top-24 lg:block"
              aria-label={labels.shell.filtersTitle}
            >
              {filterContent}
            </aside>
            <div className="grid min-w-0 content-start gap-4">
              <div className="grid gap-2 lg:sticky lg:top-20 lg:z-20 lg:-mx-2 lg:bg-[var(--background)]/94 lg:px-2 lg:py-2 lg:backdrop-blur-md">
                <div className="flex min-w-0 items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <CatalogControlsClient state={normalizedState} labels={labels.controls} />
                  </div>
                  <div className="shrink-0 lg:hidden">
                    <CatalogMobileFilters
                      triggerLabel={labels.shell.openFilters}
                      title={labels.shell.filtersTitle}
                      closeLabel={labels.shell.closeFilters}
                    >
                      {filterContent}
                    </CatalogMobileFilters>
                  </div>
                </div>
                {activeFilters.length ? (
                  <section
                    aria-label={labels.shell.activeFilters}
                    className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1"
                  >
                    {activeFilters.map((filter) => (
                      <Link
                        key={filter.key}
                        href={filter.href}
                        transitionTypes={['catalog-filter']}
                        className="inline-flex min-h-7 max-w-[16rem] shrink-0 items-center rounded-full bg-[var(--surface-muted)]/58 px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)] transition duration-200 hover:bg-[var(--surface-blush)] hover:text-[var(--accent)] active:scale-[0.98]"
                      >
                        <span className="min-w-0 truncate">{filter.label}</span>
                        <span aria-hidden="true" className="ml-1.5 text-[var(--accent)]">
                          x
                        </span>
                      </Link>
                    ))}
                    {hasCatalogFilters(normalizedState) ? (
                      <Link
                        href={pathname}
                        transitionTypes={['catalog-filter']}
                        className="inline-flex min-h-7 shrink-0 items-center px-1 text-xs font-semibold text-[var(--accent)] transition duration-200 hover:text-[var(--accent-hover)]"
                      >
                        {labels.shell.clearFilters}
                      </Link>
                    ) : null}
                  </section>
                ) : null}
              </div>
              <p
                data-testid="catalog-result-count"
                className="text-sm text-[var(--muted-foreground)]"
              >
                {replaceTokens(labels.shell.resultCount, { count: products.length })}
              </p>
              {resultContent}
            </div>
          </div>
        </>
      ) : (
        <>
          {showControls && labels.controls ? (
            <CatalogControlsClient state={normalizedState} labels={labels.controls} />
          ) : null}
          {showControls && state.status !== 'error' ? (
            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
              <aside aria-label={labels.filters.category}>{filterContent}</aside>
              {resultContent}
            </div>
          ) : (
            resultContent
          )}
        </>
      )}
    </section>
  );
}
