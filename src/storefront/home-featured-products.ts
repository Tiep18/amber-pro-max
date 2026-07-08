import type { CatalogProduct, CatalogProductType } from '@/catalog/queries';
import { marketForLocale } from '@/catalog/seo-market';
import type { MarketCode } from '@/catalog/market';
import type { Locale } from '@/i18n/routing';

type CatalogProductLoader = (input: {
  locale: Locale;
  market: MarketCode;
  productType: CatalogProductType;
  sort: 'newest';
}) => Promise<CatalogProduct[]>;

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

type HomeFeaturedProductsInput = {
  locale: Locale;
  productType: CatalogProductType;
  getProducts?: CatalogProductLoader;
  recordOperationalFailure?: OperationalFailureRecorder;
};

async function loadCatalogProducts(input: Parameters<CatalogProductLoader>[0]) {
  const { getCachedCatalogProducts } = await import('@/catalog/public-cache');
  return getCachedCatalogProducts(input);
}

async function recordHomeFeaturedProductsFailure(input: Parameters<OperationalFailureRecorder>[0]) {
  const { recordOperationalFailure } = await import('@/operations/errors');
  return recordOperationalFailure(input);
}

export async function getHomeFeaturedProducts({
  locale,
  productType,
  getProducts = loadCatalogProducts,
  recordOperationalFailure: recordFailure = recordHomeFeaturedProductsFailure
}: HomeFeaturedProductsInput): Promise<CatalogProduct[]> {
  const market = marketForLocale(locale);
  try {
    const products = await getProducts({
      locale,
      market,
      productType,
      sort: 'newest'
    });
    return products.slice(0, 4);
  } catch {
    await recordFailure({
      area: 'storefront',
      severity: 'warning',
      errorCode: 'storefront.home.featured_products_failed',
      summary: 'Home featured products failed',
      facts: {
        action: 'home_featured_products',
        locale,
        market,
        productType,
        code: 'home_featured_products_failed'
      }
    });
    return [];
  }
}
