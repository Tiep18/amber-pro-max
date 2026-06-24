import {listCatalogProducts} from '@/catalog/queries';
import {listPublishedBlogPosts} from '@/content/blog/queries';
import {urlSetXml} from '@/content/seo/metadata';
import {getPublishedRequiredPolicyLinks} from '@/launch/settings';
import {getBlogPostPath, getProductPath, isLocale, type Locale} from '@/i18n/routing';

export const dynamic = 'force-dynamic';

type Params = Promise<{locale: string}>;

function marketForLocale(locale: Locale) {
  return locale === 'vi' ? 'vn' : 'intl';
}

export async function GET(_request: Request, {params}: {params: Params}) {
  const {locale: rawLocale} = await params;
  if (!isLocale(rawLocale)) {
    return new Response('Not found', {status: 404});
  }
  const locale = rawLocale;
  const [products, blogPosts, policies] = await Promise.all([
    listCatalogProducts({locale, market: marketForLocale(locale)}),
    listPublishedBlogPosts(locale),
    getPublishedRequiredPolicyLinks(locale)
  ]);
  const paths = [
    `/${locale}`,
    locale === 'vi' ? '/vi/cua-hang' : '/en/catalog',
    locale === 'vi' ? '/vi/bai-viet' : '/en/blog',
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
