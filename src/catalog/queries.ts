import type {SupabaseClient} from '@supabase/supabase-js';
import type {Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredThrowingQuery} from '@/operations/monitoring';
import type {Database} from '@/types/supabase';
import type {MarketCode} from './market';

export const catalogSorts = ['newest', 'price_asc', 'price_desc', 'title'] as const;
export type CatalogSort = (typeof catalogSorts)[number];
export type CatalogProductType = 'pdf_pattern' | 'physical_finished';

type CatalogClient = SupabaseClient<Database>;
type CatalogFunctions = Database['public']['Functions'];

export type CatalogProduct = CatalogFunctions['list_catalog_products']['Returns'][number];
export type CatalogFacet = CatalogFunctions['list_catalog_facets']['Returns'][number];
export type CatalogProductDetail = CatalogFunctions['get_catalog_product_by_slug']['Returns'][number];
export type CatalogCategory = CatalogFunctions['get_catalog_category_by_slug']['Returns'][number];
export type CatalogCollection = CatalogFunctions['get_catalog_collection_by_slug']['Returns'][number];

export type CatalogListInput = {
  locale: Locale;
  market: MarketCode;
  search?: string | null;
  productType?: CatalogProductType | null;
  categorySlug?: string | null;
  techniqueId?: string | null;
  tagId?: string | null;
  sort?: CatalogSort;
  collectionSlug?: string | null;
};

async function getClient(client?: CatalogClient) {
  return client ?? createSupabaseServerClient();
}

function cleanOptional(value: string | null | undefined, maxLength = 100) {
  const cleaned = value?.trim();
  if (!cleaned) {
    return undefined;
  }
  return cleaned.slice(0, maxLength);
}

function catalogQueryFailureInput({
  action,
  market,
  summary
}: {
  action: 'catalog_products' | 'catalog_facets' | 'catalog_product_detail' | 'catalog_category_detail' | 'catalog_collection_detail';
  market: MarketCode;
  summary: string;
}) {
  return {
    area: 'application',
    action,
    errorCode: 'storefront.catalog.query_failed',
    summary,
    facts: {
      market
    },
    code: 'catalog_query_failed',
    publicError: () => new Error('catalog_query_failed')
  } as const;
}

export async function listCatalogProducts(input: CatalogListInput, client?: CatalogClient) {
  const supabase = await getClient(client);
  const collectionSlug = cleanOptional(input.collectionSlug);
  const sort = collectionSlug ? `collection:${collectionSlug}` : (input.sort ?? 'newest');
  return runMonitoredThrowingQuery({
    ...catalogQueryFailureInput({
      action: 'catalog_products',
      market: input.market,
      summary: 'Storefront catalog product list query failed'
    }),
    query: async () => {
      const {data, error} = await supabase.rpc('list_catalog_products', {
        p_locale: input.locale,
        p_market: input.market,
        p_search: cleanOptional(input.search),
        p_product_type: input.productType ?? undefined,
        p_category_slug: cleanOptional(input.categorySlug),
        p_technique_id: cleanOptional(input.techniqueId),
        p_tag_id: cleanOptional(input.tagId),
        p_sort: sort
      });
      if (error) throw error;
      return data ?? [];
    }
  });
}

export async function listCatalogFacets(
  input: {locale: Locale; market: MarketCode},
  client?: CatalogClient
) {
  const supabase = await getClient(client);
  return runMonitoredThrowingQuery({
    ...catalogQueryFailureInput({
      action: 'catalog_facets',
      market: input.market,
      summary: 'Storefront catalog facets query failed'
    }),
    query: async () => {
      const {data, error} = await supabase.rpc('list_catalog_facets', {
        p_locale: input.locale,
        p_market: input.market
      });
      if (error) throw error;
      return data ?? [];
    }
  });
}

export async function getCatalogProductBySlug(
  input: {locale: Locale; market: MarketCode; slug: string},
  client?: CatalogClient
) {
  const supabase = await getClient(client);
  const slug = cleanOptional(input.slug);
  if (!slug) {
    return null;
  }

  return runMonitoredThrowingQuery({
    ...catalogQueryFailureInput({
      action: 'catalog_product_detail',
      market: input.market,
      summary: 'Storefront catalog product detail query failed'
    }),
    query: async () => {
      const {data, error} = await supabase.rpc('get_catalog_product_by_slug', {
        p_locale: input.locale,
        p_market: input.market,
        p_slug: slug
      });
      if (error) throw error;
      return data?.[0] ?? null;
    }
  });
}

export async function getCatalogCategoryBySlug(
  input: {locale: Locale; market: MarketCode; slug: string},
  client?: CatalogClient
) {
  const supabase = await getClient(client);
  const slug = cleanOptional(input.slug);
  if (!slug) {
    return null;
  }

  return runMonitoredThrowingQuery({
    ...catalogQueryFailureInput({
      action: 'catalog_category_detail',
      market: input.market,
      summary: 'Storefront catalog category detail query failed'
    }),
    query: async () => {
      const {data, error} = await supabase.rpc('get_catalog_category_by_slug', {
        p_locale: input.locale,
        p_market: input.market,
        p_slug: slug
      });
      if (error) throw error;
      return data?.[0] ?? null;
    }
  });
}

export async function getCatalogCollectionBySlug(
  input: {locale: Locale; market: MarketCode; slug: string},
  client?: CatalogClient
) {
  const supabase = await getClient(client);
  const slug = cleanOptional(input.slug);
  if (!slug) {
    return null;
  }

  return runMonitoredThrowingQuery({
    ...catalogQueryFailureInput({
      action: 'catalog_collection_detail',
      market: input.market,
      summary: 'Storefront catalog collection detail query failed'
    }),
    query: async () => {
      const {data, error} = await supabase.rpc('get_catalog_collection_by_slug', {
        p_locale: input.locale,
        p_market: input.market,
        p_slug: slug
      });
      if (error) throw error;
      return data?.[0] ?? null;
    }
  });
}
