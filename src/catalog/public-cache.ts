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
  listCatalogFacets,
  listCatalogProducts,
  type CatalogListInput
} from './queries';

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
