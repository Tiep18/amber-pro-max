'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {
  catalogListStateFromSearchParams,
  type CatalogListState
} from '@/catalog/list-state';
import type {CatalogFacet, CatalogProduct, CatalogProductType} from '@/catalog/queries';
import type {
  CatalogProjection,
  CatalogProjectionInput
} from '@/catalog/projections';
import type {MarketCode} from '@/catalog/market';
import type {Locale} from '@/i18n/routing';
import {
  CatalogFilterContent,
  type CatalogFilterLabels
} from '@/components/catalog/catalog-filter-content';
import {CatalogControlsClient} from '@/components/catalog/catalog-controls-client';
import {CatalogResultGrid} from '@/components/catalog/catalog-result-grid';
import {
  ProductCardView,
  type ProductCardLabels
} from '@/components/catalog/product-card-view';
import {useStorefrontContext} from '@/components/storefront-context';

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

export function createCatalogCommerceState(
  seedProducts: readonly unknown[]
): CatalogCommerceState {
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
    request: {generation, identity}
  };
}

function sameIdentity(
  left: CatalogCommerceIdentity | null,
  right: CatalogCommerceIdentity
) {
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

export type CatalogCommerceLabels = {
  card: ProductCardLabels;
  filters: CatalogFilterLabels;
  controls?: CatalogControlLabels;
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
  const [state, setState] = useState<CatalogCommerceState>(
    () => createCatalogCommerceState(seoProducts)
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
            failCatalogCommerceRequest(
              current,
              begun.request.generation,
              'projection_unavailable'
            )
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
  const marketName =
    context.market === null ? '' : labels.marketNames[context.market];
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

  async function retry() {
    if (state.issue === 'context_unavailable') {
      await context.retryContext();
      return;
    }
    setRetryVersion((version) => version + 1);
  }

  return (
    <section
      aria-busy={state.status === 'resolving'}
      aria-describedby="catalog-commerce-status"
      className="grid gap-6"
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

      {showControls && labels.controls ? (
        <CatalogControlsClient state={normalizedState} labels={labels.controls} />
      ) : null}

      {state.status === 'error' ? (
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
        <div className={showControls ? 'grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]' : ''}>
          {showControls ? (
            <aside aria-label={labels.filters.category}>
              {state.status === 'ready' ? (
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
              )}
            </aside>
          ) : null}

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
                labels={{showing: labels.showing, loadMore: labels.loadMore}}
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
        </div>
      )}
    </section>
  );
}
