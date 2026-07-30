'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';
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
import { ProductCardSkeleton } from '@/components/loading/page-skeletons';
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
  totalCount: number;
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
    totalCount: seedProducts.length,
    generation: 0,
    activeGeneration: null,
    identity: null,
    issue: null
  };
}

function sameCatalogContext(left: CatalogCommerceIdentity | null, right: CatalogCommerceIdentity) {
  return (
    left?.locale === right.locale &&
    left.market === right.market &&
    left.surface === right.surface &&
    left.contextGeneration === right.contextGeneration &&
    left.contextVersion === right.contextVersion
  );
}

export function beginCatalogCommerceRequest(
  state: CatalogCommerceState,
  identity: CatalogCommerceIdentity
): {
  state: CatalogCommerceState;
  request: CatalogCommerceRequest;
} {
  const generation = state.generation + 1;
  const retainFacets = sameCatalogContext(state.identity, identity);
  return {
    state: {
      ...state,
      status: 'resolving',
      products: [],
      facets: retainFacets ? state.facets : [],
      totalCount: 0,
      generation,
      activeGeneration: generation,
      identity,
      issue: null
    },
    request: { generation, identity }
  };
}

export function catalogResultsArePending({
  state,
  currentQueryKey,
  filtersActive,
  navigationPending
}: {
  state: CatalogCommerceState;
  currentQueryKey: string;
  filtersActive: boolean;
  navigationPending: boolean;
}) {
  if (navigationPending) return true;
  if (state.status === 'error') return false;
  if (state.status === 'ready') return state.identity?.queryKey !== currentQueryKey;
  return filtersActive || state.activeGeneration !== null;
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

export function mergeCatalogFacetSnapshots(
  previousFacets: readonly CatalogFacet[],
  incomingFacets: readonly CatalogFacet[]
) {
  if (previousFacets.length === 0) return [...incomingFacets];

  const incomingByIdentity = new Map(
    incomingFacets.map((facet) => [`${facet.facet_type}:${facet.id}`, facet])
  );
  const previousIdentities = new Set(
    previousFacets.map((facet) => `${facet.facet_type}:${facet.id}`)
  );

  return [
    ...previousFacets.map((facet) => {
      const incoming = incomingByIdentity.get(`${facet.facet_type}:${facet.id}`);
      return incoming ? { ...facet, product_count: incoming.product_count } : facet;
    }),
    ...incomingFacets.filter((facet) => !previousIdentities.has(`${facet.facet_type}:${facet.id}`))
  ];
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
    facets:
      state.facets.every(isCatalogFacet) && projection.facets.every(isCatalogFacet)
        ? mergeCatalogFacetSnapshots(state.facets, projection.facets)
        : projection.facets,
    totalCount: projection.totalCount,
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
    totalCount: state.seedProducts.length,
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
    (value.primary_image_bucket === null || typeof value.primary_image_bucket === 'string') &&
    (value.primary_image_path === null || typeof value.primary_image_path === 'string') &&
    (value.primary_image_alt === null || typeof value.primary_image_alt === 'string') &&
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

export function parseCatalogProjectionResponse(
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
    !projection.facets.every(isCatalogFacet) ||
    typeof projection.totalCount !== 'number' ||
    !Number.isSafeInteger(projection.totalCount) ||
    projection.totalCount < projection.products.length
  ) {
    return null;
  }

  return {
    locale: projection.locale,
    market: projection.market,
    surface: projection.surface,
    products: projection.products,
    facets: projection.facets,
    totalCount: projection.totalCount
  };
}

function projectionQuery(
  locale: Locale,
  surface: CatalogSurface,
  state: CatalogListState,
  fixed: CatalogFixedFilters,
  limit: number,
  offset = 0
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
    offset,
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
  if (values.offset > 0) params.set('offset', String(values.offset));
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

function CatalogProductGridSkeleton() {
  return (
    <div
      data-testid="catalog-product-grid-skeleton"
      aria-hidden="true"
      className="grid gap-y-6 min-[480px]:grid-cols-2 min-[480px]:gap-x-3 sm:gap-5 lg:grid-cols-3"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <ProductCardSkeleton key={index} />
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
  const [navigationPending, setNavigationPending] = useState(false);
  const [loadMorePending, setLoadMorePending] = useState(false);
  const [state, setState] = useState<CatalogCommerceState>(() =>
    createCatalogCommerceState(seoProducts)
  );
  const stateRef = useRef(state);
  const controllerRef = useRef<AbortController | null>(null);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  function commitState(next: CatalogCommerceState) {
    stateRef.current = next;
    setState(next);
  }

  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
    setLoadMorePending(false);

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

    return () => {
      controller.abort();
      loadMoreControllerRef.current?.abort();
    };
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

  useEffect(() => {
    if (
      navigationPending &&
      (state.status === 'error' ||
        (state.status === 'ready' && state.identity?.queryKey === queryKey))
    ) {
      setNavigationPending(false);
    }
  }, [navigationPending, queryKey, state.identity?.queryKey, state.status]);

  const products = state.products as readonly CatalogProduct[];
  const facets = state.facets as readonly CatalogFacet[];
  const groups = useMemo(() => facetGroups(facets), [facets]);
  const filtersActive = hasCatalogFilters(normalizedState);
  const resultsPending = catalogResultsArePending({
    state,
    currentQueryKey: queryKey,
    filtersActive,
    navigationPending
  });
  const marketName = context.market === null ? '' : labels.marketNames[context.market];
  const facetsMatchContext =
    context.status === 'ready' &&
    context.market !== null &&
    state.identity !== null &&
    state.identity.locale === locale &&
    state.identity.market === context.market &&
    state.identity.surface === surface &&
    state.identity.contextGeneration === context.generation &&
    state.identity.contextVersion === context.contextVersion;
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

  async function loadMoreProducts() {
    const current = stateRef.current;
    const expectedIdentity = current.identity;
    if (
      loadMorePending ||
      current.status !== 'ready' ||
      expectedIdentity === null ||
      expectedIdentity.queryKey !== queryKey ||
      current.products.length >= current.totalCount
    ) {
      return 0;
    }

    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    setLoadMorePending(true);
    const offset = current.products.length;
    const nextQuery = projectionQuery(
      locale,
      surface,
      normalizedState,
      fixedFilters,
      safeLimit,
      offset
    );

    try {
      const response = await fetch(`/api/storefront/catalog?${nextQuery.toString()}`, {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('catalog_projection_unavailable');

      const projection = parseCatalogProjectionResponse(await response.json());
      if (
        !projection ||
        projection.locale !== expectedIdentity.locale ||
        projection.market !== expectedIdentity.market ||
        projection.surface !== expectedIdentity.surface
      ) {
        throw new Error('catalog_projection_unavailable');
      }

      const latest = stateRef.current;
      if (
        latest.status !== 'ready' ||
        !sameIdentity(latest.identity, expectedIdentity) ||
        latest.products.length !== offset
      ) {
        return 0;
      }

      const existingIds = new Set(
        (latest.products as readonly CatalogProduct[]).map((product) => product.product_id)
      );
      const additions = projection.products.filter(
        (product) => !existingIds.has(product.product_id)
      );
      if (additions.length === 0) return 0;

      commitState({
        ...latest,
        products: [...latest.products, ...additions],
        facets: projection.facets,
        totalCount: projection.totalCount
      });
      return additions.length;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return 0;
      return 0;
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        setLoadMorePending(false);
      }
    }
  }

  function beginLinkNavigation(event: MouseEvent<HTMLElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    const href = link?.getAttribute('href');
    if (!href) return;

    const destination = new URL(href, window.location.href);
    if (
      destination.origin === window.location.origin &&
      destination.pathname === pathname &&
      destination.search !== window.location.search
    ) {
      setNavigationPending(true);
    }
  }

  function beginFormNavigation(event: FormEvent<HTMLElement>) {
    const form = event.target;
    if (form instanceof HTMLFormElement && form.method.toLowerCase() === 'get') {
      setNavigationPending(true);
    }
  }

  const filterContent =
    facetsMatchContext && (state.status === 'ready' || facets.length > 0) ? (
      <div aria-busy={resultsPending} className="relative">
        <CatalogFilterContent
          basePath={pathname}
          state={normalizedState}
          categories={groups.categories}
          techniques={groups.techniques}
          tags={groups.tags}
          labels={labels.filters}
        />
        {resultsPending ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"
          >
            <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]/70" />
          </span>
        ) : null}
      </div>
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
    ) : resultsPending ? (
      <CatalogProductGridSkeleton />
    ) : (
      <div className="min-w-0">
        <h2 tabIndex={-1} className="sr-only">
          {state.status === 'ready'
            ? replaceTokens(labels.loaded, {
                market: marketName,
                count: state.totalCount
              })
            : labels.resolving}
        </h2>
        {state.status === 'ready' && state.totalCount === 0 ? (
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
            totalCount={state.totalCount}
            loadingMore={loadMorePending}
            onLoadMore={loadMoreProducts}
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
      aria-busy={resultsPending}
      aria-describedby="catalog-commerce-status"
      onClickCapture={beginLinkNavigation}
      onSubmitCapture={beginFormNavigation}
      className="grid gap-4"
    >
      <p
        id="catalog-commerce-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {resultsPending
          ? labels.resolving
          : state.status === 'ready'
            ? replaceTokens(labels.loaded, {
                market: marketName,
                count: state.totalCount
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
              className="hidden self-start overflow-hidden rounded-l-[var(--radius-card)] border-r border-[var(--border)]/70 bg-[var(--surface)]/35 lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh-15rem)] lg:flex-col"
              aria-label={labels.shell.filtersTitle}
            >
              <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border)]/75 bg-[var(--surface)]/88 px-3 backdrop-blur-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {labels.shell.filtersTitle}
                  </h2>
                  {activeFilters.length ? (
                    <span
                      aria-label={`${labels.shell.activeFilters}: ${activeFilters.length}`}
                      className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white"
                    >
                      {activeFilters.length}
                    </span>
                  ) : null}
                </div>
                {hasCatalogFilters(normalizedState) ? (
                  <Link
                    href={pathname}
                    transitionTypes={['catalog-filter']}
                    className="shrink-0 text-xs font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    {labels.shell.clearFilters}
                  </Link>
                ) : null}
              </div>
              <div className="catalog-filter-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pr-3 [scrollbar-gutter:stable]">
                {filterContent}
              </div>
            </aside>
            <div className="grid min-w-0 content-start gap-4">
              <div className="grid gap-2 lg:sticky lg:top-20 lg:z-30 lg:-mx-2 lg:bg-[var(--background)]/94 lg:px-2 lg:py-2 lg:backdrop-blur-md">
                <div className="flex min-w-0 items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <CatalogControlsClient state={normalizedState} labels={labels.controls} />
                  </div>
                  <div className="shrink-0 lg:hidden">
                    <CatalogMobileFilters
                      triggerLabel={
                        activeFilters.length
                          ? `${labels.shell.openFilters} (${activeFilters.length})`
                          : labels.shell.openFilters
                      }
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
              <div
                data-testid="catalog-result-count"
                className="min-h-5 text-sm text-[var(--muted-foreground)]"
              >
                {resultsPending ? (
                  <>
                    <span className="sr-only">{labels.resolving}</span>
                    <Skeleton aria-hidden="true" className="h-4 w-24" />
                  </>
                ) : (
                  replaceTokens(labels.shell.resultCount, { count: state.totalCount })
                )}
              </div>
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
