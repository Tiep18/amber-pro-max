import { getCachedCatalogProducts, getCachedCatalogProjection } from '@/catalog/public-cache';
import type { MarketCode } from '@/catalog/market';
import type { CatalogProjectionInput } from '@/catalog/projections';
import { getCachedPublishedBlogPosts } from '@/content/blog/public-cache';
import { urlSetXml } from '@/content/seo/metadata';
import { getPublishedRequiredPolicyLinks } from '@/launch/settings';
import {
  getBlogPostPath,
  getCategoryPath,
  getCollectionPath,
  getProductPath,
  getTagPath,
  getTechniquePath,
  isLocale,
  type Locale
} from '@/i18n/routing';

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string }>;

function marketForLocale(locale: Locale) {
  return locale === 'vi' ? 'vn' : 'intl';
}

function taxonomyProjectionInput(locale: Locale, market: MarketCode): CatalogProjectionInput {
  return {
    locale,
    market,
    surface: 'catalog',
    search: null,
    productType: null,
    categorySlug: null,
    collectionSlug: null,
    techniqueSlug: null,
    tagSlug: null,
    sort: 'newest',
    offset: 0,
    limit: 1
  };
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) {
    return new Response('Not found', { status: 404 });
  }
  const locale = rawLocale;
  const market = marketForLocale(locale);
  const [products, vnProjection, intlProjection, blogPosts, policies] = await Promise.all([
    getCachedCatalogProducts({ locale, market }),
    getCachedCatalogProjection(taxonomyProjectionInput(locale, 'vn')),
    getCachedCatalogProjection(taxonomyProjectionInput(locale, 'intl')),
    getCachedPublishedBlogPosts(locale),
    getPublishedRequiredPolicyLinks(locale)
  ]);
  const facets = [
    ...new Map(
      [...vnProjection.facets, ...intlProjection.facets].map((facet) => [
        `${facet.facet_type}:${facet.slug}`,
        facet
      ])
    ).values()
  ];
  const categories = facets.filter((facet) => facet.facet_type === 'category');
  const collections = facets.filter((facet) => facet.facet_type === 'collection');
  const techniques = facets.filter((facet) => facet.facet_type === 'technique');
  const tags = facets.filter((facet) => facet.facet_type === 'tag');
  const urls = [
    { path: `/${locale}` },
    { path: locale === 'vi' ? '/vi/cua-hang' : '/en/catalog' },
    { path: locale === 'vi' ? '/vi/bai-viet' : '/en/blog' },
    ...categories.map((category) => ({ path: getCategoryPath(locale, category.slug) })),
    ...collections.map((collection) => ({ path: getCollectionPath(locale, collection.slug) })),
    ...techniques.map((technique) => ({ path: getTechniquePath(locale, technique.slug) })),
    ...tags.map((tag) => ({ path: getTagPath(locale, tag.slug) })),
    ...products.map((product) => ({
      path: getProductPath(locale, product.slug),
      lastModified: product.published_at
    })),
    ...blogPosts.map((post) => ({
      path: getBlogPostPath(locale, post.slug),
      lastModified: post.publishedAt
    })),
    ...policies.map((policy) => ({ path: policy.href }))
  ];
  const uniqueUrls = Array.from(new Map(urls.map((url) => [url.path, url])).values());

  return new Response(urlSetXml(uniqueUrls), {
    headers: {
      'content-type': 'application/xml; charset=utf-8'
    }
  });
}
