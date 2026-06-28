export const CACHE_TAGS = {
  blog: 'blog',
  catalog: 'catalog',
  policies: 'policies'
} as const;

export function catalogMarketCacheTag(market: string) {
  return `catalog:${market}`;
}

export function productSlugCacheTag(locale: string, slug: string) {
  return `product-slug:${locale}:${slug}`;
}

export function blogPostSlugCacheTag(locale: string, slug: string) {
  return `blog-post-slug:${locale}:${slug}`;
}

export function policySlugCacheTag(locale: string, slug: string) {
  return `policy-slug:${locale}:${slug}`;
}
