import { getCachedCatalogFacets, getCachedCatalogProducts } from '@/catalog/public-cache';
import { getCachedPublishedBlogPosts } from '@/content/blog/public-cache';
import { urlSetXml } from '@/content/seo/metadata';
import { getPublishedRequiredPolicyLinks } from '@/launch/settings';
import {
  getBlogPostPath,
  getCategoryPath,
  getCollectionPath,
  getProductPath,
  isLocale,
  type Locale
} from '@/i18n/routing';

export const dynamic = 'force-dynamic';

type Params = Promise<{ locale: string }>;

function marketForLocale(locale: Locale) {
  return locale === 'vi' ? 'vn' : 'intl';
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) {
    return new Response('Not found', { status: 404 });
  }
  const locale = rawLocale;
  const market = marketForLocale(locale);
  const [products, facets, blogPosts, policies] = await Promise.all([
    getCachedCatalogProducts({ locale, market }),
    getCachedCatalogFacets(locale, market),
    getCachedPublishedBlogPosts(locale),
    getPublishedRequiredPolicyLinks(locale)
  ]);
  const categories = facets.filter((facet) => facet.facet_type === 'category');
  const collections = facets.filter((facet) => facet.facet_type === 'collection');
  const paths = [
    `/${locale}`,
    locale === 'vi' ? '/vi/cua-hang' : '/en/catalog',
    locale === 'vi' ? '/vi/bai-viet' : '/en/blog',
    ...categories.map((category) => getCategoryPath(locale, category.slug)),
    ...collections.map((collection) => getCollectionPath(locale, collection.slug)),
    ...products.map((product) => getProductPath(locale, product.slug)),
    ...blogPosts.map((post) => getBlogPostPath(locale, post.slug)),
    ...policies.map((policy) => policy.href)
  ];

  return new Response(urlSetXml(Array.from(new Set(paths))), {
    headers: {
      'content-type': 'application/xml; charset=utf-8'
    }
  });
}
