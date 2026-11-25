import 'server-only';

import { unstable_cache } from 'next/cache';
import type { Locale } from '@/i18n/routing';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import type { MarketCode } from './market';
import {
  getCatalogCategoryBySlug,
  getCatalogCollectionBySlug,
  getCatalogProductBySlug,
  getCatalogProductCommerceBySlug,
  listCatalogFacets,
  listCatalogFacetsFiltered,
  listCatalogProducts,
  type CatalogListInput
} from './queries';
import {
  projectAuthoritativeProductCommerce,
  projectCatalog,
  type CatalogProjectionInput
} from './projections';

async function catalogProducts(input: CatalogListInput) {
  return listCatalogProducts(input, createSupabasePublicClient());
}

async function catalogFacets(locale: Locale, market: MarketCode) {
  return listCatalogFacets({ locale, market }, createSupabasePublicClient());
}

async function catalogProduct(locale: Locale, market: MarketCode, slug: string) {
  return getCatalogProductBySlug({ locale, market, slug }, createSupabasePublicClient());
}

async function catalogCategory(locale: Locale, market: MarketCode, slug: string) {
  return getCatalogCategoryBySlug({ locale, market, slug }, createSupabasePublicClient());
}

async function catalogCollection(locale: Locale, market: MarketCode, slug: string) {
  return getCatalogCollectionBySlug({ locale, market, slug }, createSupabasePublicClient());
}

async function catalogProjection(input: CatalogProjectionInput) {
  const client = createSupabasePublicClient();
  return projectCatalog(input, {
    loadFacets: (facetQuery) => listCatalogFacetsFiltered(facetQuery, client),
    loadProducts: (productQuery) =>
      listCatalogProducts(
        {
          locale: productQuery.locale,
          market: productQuery.market,
          search: productQuery.search,
          productType: productQuery.productType,
          categorySlug: productQuery.categorySlug,
          collectionSlug: productQuery.collectionSlug,
          techniqueId: productQuery.techniqueId,
          tagId: productQuery.tagId,
          sort: productQuery.sort
        },
        client
      )
  });
}

async function productCommerce(locale: Locale, market: MarketCode, slug: string) {
  const row = await getCatalogProductCommerceBySlug(
    { locale, market, slug },
    createSupabasePublicClient()
  );
  return row ? projectAuthoritativeProductCommerce(row) : null;
}

const cacheOptions = { revalidate: 300, tags: [CACHE_TAGS.catalog] };

export const getCachedCatalogProducts = unstable_cache(
  catalogProducts,
  ['catalog-products'],
  cacheOptions
);
export const getCachedCatalogFacets = unstable_cache(
  catalogFacets,
  ['catalog-facets'],
  cacheOptions
);
export const getCachedCatalogProduct = unstable_cache(
  catalogProduct,
  ['catalog-product'],
  cacheOptions
);
export const getCachedCatalogCategory = unstable_cache(
  catalogCategory,
  ['catalog-category'],
  cacheOptions
);
export const getCachedCatalogCollection = unstable_cache(
  catalogCollection,
  ['catalog-collection'],
  cacheOptions
);
export const getCachedCatalogProjection = unstable_cache(
  catalogProjection,
  ['catalog-projection'],
  cacheOptions
);
export const getCachedProductCommerce = unstable_cache(
  productCommerce,
  ['catalog-product-commerce'],
  cacheOptions
);
