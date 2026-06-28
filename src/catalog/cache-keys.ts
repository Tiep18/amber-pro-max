import type { Locale } from '@/i18n/routing';
import type { MarketCode } from './market';
import type { CatalogListInput } from './queries';

export function catalogListCacheKey(input: CatalogListInput) {
  return JSON.stringify([
    input.locale,
    input.market,
    input.search ?? null,
    input.productType ?? null,
    input.categorySlug ?? null,
    input.techniqueId ?? null,
    input.tagId ?? null,
    input.sort ?? 'newest',
    input.collectionSlug ?? null
  ]);
}

export function catalogProductCacheKey(locale: Locale, market: MarketCode, slug: string) {
  return JSON.stringify([locale, market, slug]);
}
